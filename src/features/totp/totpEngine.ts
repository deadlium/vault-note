/**
 * RFC 6238 Time-Based One-Time Password (TOTP) Authenticator Engine
 * Fully compliant with RFC 6238 and RFC 4226 (HOTP)
 * Supports HMAC-SHA1, HMAC-SHA256, HMAC-SHA512 with configurable step periods and digit lengths
 */

import { hmac } from '@noble/hashes/hmac.js';
import { sha1 } from '@noble/hashes/legacy.js';
import { sha256, sha512 } from '@noble/hashes/sha2.js';
import { CryptoError } from '../../core/crypto/types';
import { base32Decode } from './base32';
import { TOTPAlgorithm, TOTPConfig, TOTPToken, ParsedOtpAuthUri } from './types';
import { parseOtpAuthUri } from './parser/otpauthParser';

/**
 * Computes an 8-byte big-endian counter buffer from a 64-bit counter value.
 */
function counterToBytes(counter: bigint | number): Uint8Array {
  const buf = new Uint8Array(8);
  let val = BigInt(counter);
  for (let i = 7; i >= 0; i--) {
    buf[i] = Number(val & 0xffn);
    val >>= 8n;
  }
  return buf;
}

/**
 * Calculates HMAC digest using the configured algorithm.
 */
function computeHmac(
  algorithm: TOTPAlgorithm,
  secretBytes: Uint8Array,
  counterBytes: Uint8Array
): Uint8Array {
  switch (algorithm) {
    case 'SHA256':
      return hmac(sha256, secretBytes, counterBytes);
    case 'SHA512':
      return hmac(sha512, secretBytes, counterBytes);
    case 'SHA1':
    default:
      return hmac(sha1, secretBytes, counterBytes);
  }
}

/**
 * Normalizes input secret to raw byte buffer.
 */
function resolveSecretBytes(secret: string | Uint8Array): Uint8Array {
  if (secret instanceof Uint8Array) {
    if (secret.length === 0) {
      throw new CryptoError('TOTP secret key cannot be empty');
    }
    return secret;
  }

  if (typeof secret === 'string') {
    // If user passed a full otpauth:// URI, extract the secret parameter
    if (secret.startsWith('otpauth://')) {
      const parsed = parseOtpAuthUri(secret);
      return base32Decode(parsed.secret);
    }
    const decoded = base32Decode(secret);
    if (decoded.length === 0) {
      throw new CryptoError('TOTP secret key cannot be empty');
    }
    return decoded;
  }

  throw new CryptoError('TOTP secret must be a base32 string or Uint8Array');
}

/**
 * Computes the RFC 4226 dynamic truncation value from an HMAC digest.
 */
function truncateDigest(digest: Uint8Array, digits: number): string {
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  const modulus = Math.pow(10, digits);
  const code = (binary % modulus).toString();
  return code.padStart(digits, '0');
}

/**
 * Formats a raw numeric code with human-friendly space separation.
 * 6 digits: '123 456'
 * 8 digits: '1234 5678'
 */
export function formatTOTPCode(code: string): string {
  const clean = code.replace(/\s/g, '');
  if (clean.length === 6) {
    return `${clean.slice(0, 3)} ${clean.slice(3)}`;
  }
  if (clean.length === 8) {
    return `${clean.slice(0, 4)} ${clean.slice(4)}`;
  }
  return clean;
}

/**
 * Calculates precise seconds remaining in the current rotation cycle.
 */
export function getRemainingSeconds(period = 30, timestamp = Date.now()): number {
  const seconds = Math.floor(timestamp / 1000);
  const elapsed = seconds % period;
  return period - elapsed;
}

/**
 * Generates an RFC 6238 TOTP code string.
 */
export function generateTOTP(
  secret: string | Uint8Array,
  options: Partial<TOTPConfig> = {}
): string {
  const algorithm: TOTPAlgorithm = options.algorithm ?? 'SHA1';
  const digits = Math.max(6, Math.min(8, options.digits ?? 6));
  const period = options.period ?? 30;
  const timestamp = options.timestamp ?? Date.now();

  const secretBytes = resolveSecretBytes(secret);
  const counter = Math.floor(Math.floor(timestamp / 1000) / period);
  const counterBytes = counterToBytes(counter);

  const digest = computeHmac(algorithm, secretBytes, counterBytes);
  return truncateDigest(digest, digits);
}

/**
 * Generates a full reactive TOTP token structure including code, formatted code,
 * remaining seconds, and progress ratio.
 */
export function generateTOTPToken(
  secret: string | Uint8Array,
  options: Partial<TOTPConfig> = {}
): TOTPToken {
  const period = options.period ?? 30;
  const timestamp = options.timestamp ?? Date.now();
  const code = generateTOTP(secret, { ...options, period, timestamp });
  const remainingSeconds = getRemainingSeconds(period, timestamp);
  const progress = Math.max(0, Math.min(1, remainingSeconds / period));
  const isExpiringSoon = remainingSeconds <= 5;

  return {
    code,
    formattedCode: formatTOTPCode(code),
    remainingSeconds,
    period,
    progress,
    isExpiringSoon,
  };
}

/**
 * Constant-time string equality check to mitigate timing attacks during verification.
 */
function safeStringEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Verifies an entered TOTP code against the secret key with clock drift tolerance.
 * @param token The code entered by the user
 * @param secret Base32 or raw secret
 * @param options Configuration with optional drift window (default: 1 step window = ±30s)
 */
export function verifyTOTP(
  token: string,
  secret: string | Uint8Array,
  options: Partial<TOTPConfig> & { window?: number } = {}
): boolean {
  const cleanToken = token.replace(/\s/g, '');
  const window = options.window ?? 1;
  const period = options.period ?? 30;
  const timestamp = options.timestamp ?? Date.now();

  for (let step = -window; step <= window; step++) {
    const candidateTimestamp = timestamp + step * period * 1000;
    const expected = generateTOTP(secret, {
      ...options,
      period,
      timestamp: candidateTimestamp,
    });
    if (safeStringEqual(cleanToken, expected)) {
      return true;
    }
  }

  return false;
}

export { parseOtpAuthUri } from './parser/otpauthParser';
