import { EntropyError, InvalidNonceError } from './types';

/**
 * Generates an array of cryptographically secure pseudo-random bytes.
 * Uses standard `globalThis.crypto.getRandomValues` (supported natively in Node 16+, Browsers, and modern Hermes / React Native).
 * Gracefully falls back to `expo-crypto` if globalThis.crypto is unavailable.
 *
 * @param byteLength Number of random bytes to generate.
 * @returns Uint8Array populated with CSPRNG entropy.
 */
export function getRandomBytes(byteLength: number): Uint8Array {
  if (byteLength <= 0) {
    throw new EntropyError('Byte length for random generation must be greater than 0.');
  }

  const buffer = new Uint8Array(byteLength);

  try {
    // 1. Standard global WebCrypto / Node / Hermes crypto
    if (typeof globalThis.crypto?.getRandomValues === 'function') {
      return globalThis.crypto.getRandomValues(buffer);
    }

    // 2. Dynamic fallback to expo-crypto if running in legacy Expo runtime
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const ExpoCrypto = require('expo-crypto');
      if (typeof ExpoCrypto?.getRandomValues === 'function') {
        return ExpoCrypto.getRandomValues(buffer);
      }
    } catch {
      // expo-crypto not available in this environment
    }
  } catch (error) {
    throw new EntropyError(`Failed to generate secure random bytes: ${(error as Error).message}`);
  }

  throw new EntropyError('No cryptographically secure random number generator is available in this runtime.');
}

/**
 * Generates a cryptographically secure random salt for password hashing and KDF.
 *
 * @param byteLength Default: 32 bytes (256 bits).
 */
export function generateSalt(byteLength = 32): Uint8Array {
  return getRandomBytes(byteLength);
}

/**
 * Generates a 96-bit (12-byte) unique nonce / IV specifically for AES-256-GCM.
 * Mandatory per NIST SP 800-38D recommendation to prevent nonce reuse attacks.
 */
export function generateGcmNonce(): Uint8Array {
  const nonce = getRandomBytes(12);
  if (nonce.length !== 12) {
    throw new InvalidNonceError(12, nonce.length);
  }
  return nonce;
}

/**
 * Generates a 256-bit random master key or enclave token.
 */
export function generateMasterEnclaveToken(): Uint8Array {
  return getRandomBytes(32);
}

/**
 * Converts a Uint8Array to a hex string.
 */
export function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

/**
 * Converts a hex string to a Uint8Array.
 */
export function hexToBytes(hex: string): Uint8Array {
  const sanitized = hex.trim().replace(/^0x/i, '');
  if (sanitized.length % 2 !== 0) {
    throw new EntropyError('Invalid hex string length: must be even number of characters.');
  }

  const bytes = new Uint8Array(sanitized.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    const byteHex = sanitized.substring(i * 2, i * 2 + 2);
    const parsed = parseInt(byteHex, 16);
    if (Number.isNaN(parsed)) {
      throw new EntropyError(`Invalid hex character in sequence "${byteHex}".`);
    }
    bytes[i] = parsed;
  }
  return bytes;
}

/**
 * Converts a Uint8Array to a standard Base64 string.
 */
export function bytesToBase64(bytes: Uint8Array): string {
  // Check for Node/Hermes Buffer if present on globalThis
  const nodeBuffer = (globalThis as unknown as { Buffer?: { from: (input: unknown, enc?: string) => { toString: (enc: string) => string } } }).Buffer;
  if (typeof nodeBuffer?.from === 'function') {
    return nodeBuffer.from(bytes).toString('base64');
  }

  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return globalThis.btoa(binary);
}

/**
 * Converts a Base64 string to a Uint8Array.
 */
export function base64ToBytes(base64: string): Uint8Array {
  const nodeBuffer = (globalThis as unknown as { Buffer?: { from: (input: string, enc: string) => ArrayLike<number> } }).Buffer;
  if (typeof nodeBuffer?.from === 'function') {
    return new Uint8Array(nodeBuffer.from(base64, 'base64'));
  }

  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Converts a UTF-8 string to a Uint8Array.
 */
export function utf8ToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * Converts a Uint8Array to a UTF-8 string.
 */
export function bytesToUtf8(bytes: Uint8Array): string {
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

/**
 * Securely overwrites a memory buffer with zeroes to prevent memory scraping.
 * Best effort in garbage-collected JavaScript runtimes.
 */
export function secureWipe(buffer: Uint8Array): void {
  buffer.fill(0);
}
