/**
 * VaultNote Memory-Hard Key Derivation Function (KDF) Module
 * Implements Argon2id with PBKDF2-SHA256 fallback
 * Phase 1: Cryptographic Perimeter (Day 2)
 */

import { argon2id } from '@noble/hashes/argon2.js';
import { pbkdf2 } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { generateSalt, bytesToHex, hexToBytes, utf8ToBytes } from './csprng';
import { Argon2idOptions, Pbkdf2Options, DerivedKeyResult, CryptoError } from './types';

/**
 * Default Argon2id parameters optimized for mobile devices per RFC 9106.
 * Provides high resistance against GPU/ASIC brute force while finishing in <350ms on mobile.
 */
export const DEFAULT_ARGON2ID_CONFIG: Required<Argon2idOptions> = {
  m: 19456, // 19 MiB RAM
  t: 3,     // 3 passes
  p: 1,     // 1 lane (optimal for single-threaded JS runtime)
  dkLen: 32 // 256-bit Key Encryption Key (KEK)
};

/**
 * High-security Argon2id parameters ($m=64\text{MB}, t=4, p=4$) for maximum brute-force resistance.
 */
export const HIGH_SECURITY_ARGON2ID_CONFIG: Required<Argon2idOptions> = {
  m: 65536, // 64 MiB RAM
  t: 4,     // 4 passes
  p: 4,     // 4 lanes
  dkLen: 32 // 256-bit
};

/**
 * Default PBKDF2-SHA256 parameters following OWASP recommendations.
 */
export const DEFAULT_PBKDF2_CONFIG: Required<Pbkdf2Options> = {
  iterations: 600000, // 600,000 rounds per OWASP guidelines
  dkLen: 32          // 256-bit
};

/**
 * Derives a 256-bit Key Encryption Key (KEK) from a passphrase using Argon2id.
 *
 * @param passphrase The user's master password.
 * @param salt Optional existing salt (Uint8Array or hex string). If omitted, a fresh 32-byte salt is generated.
 * @param options Custom Argon2id tuning parameters.
 * @returns DerivedKeyResult containing the derived 32-byte key and salt metadata.
 */
export function deriveKeyArgon2id(
  passphrase: string,
  salt?: Uint8Array | string,
  options?: Argon2idOptions
): DerivedKeyResult {
  if (!passphrase || passphrase.length === 0) {
    throw new CryptoError('Passphrase cannot be empty for key derivation.');
  }

  const saltBytes = typeof salt === 'string'
    ? hexToBytes(salt)
    : salt ?? generateSalt(32);

  if (saltBytes.length < 16) {
    throw new CryptoError('KDF salt must be at least 16 bytes for cryptographic security.');
  }

  const config: Required<Argon2idOptions> = {
    m: options?.m ?? DEFAULT_ARGON2ID_CONFIG.m,
    t: options?.t ?? DEFAULT_ARGON2ID_CONFIG.t,
    p: options?.p ?? DEFAULT_ARGON2ID_CONFIG.p,
    dkLen: options?.dkLen ?? DEFAULT_ARGON2ID_CONFIG.dkLen,
  };

  try {
    const passwordBytes = utf8ToBytes(passphrase);
    const key = argon2id(passwordBytes, saltBytes, {
      t: config.t,
      m: config.m,
      p: config.p,
      dkLen: config.dkLen,
    });

    return {
      key,
      saltHex: bytesToHex(saltBytes),
      algorithm: 'Argon2id',
      params: {
        memory: config.m,
        iterations: config.t,
        parallelism: config.p,
      },
    };
  } catch (error) {
    throw new CryptoError(`Argon2id derivation failed: ${(error as Error).message}`);
  }
}

/**
 * Derives a 256-bit key using PBKDF2-HMAC-SHA256.
 * Recommended as a fallback or cross-platform standard.
 *
 * @param passphrase The user's master password.
 * @param salt Optional existing salt (Uint8Array or hex string).
 * @param options Custom PBKDF2 tuning parameters.
 */
export function deriveKeyPbkdf2(
  passphrase: string,
  salt?: Uint8Array | string,
  options?: Pbkdf2Options
): DerivedKeyResult {
  if (!passphrase || passphrase.length === 0) {
    throw new CryptoError('Passphrase cannot be empty for key derivation.');
  }

  const saltBytes = typeof salt === 'string'
    ? hexToBytes(salt)
    : salt ?? generateSalt(32);

  const iterations = options?.iterations ?? DEFAULT_PBKDF2_CONFIG.iterations;
  const dkLen = options?.dkLen ?? DEFAULT_PBKDF2_CONFIG.dkLen;

  try {
    const passwordBytes = utf8ToBytes(passphrase);
    const key = pbkdf2(sha256, passwordBytes, saltBytes, {
      c: iterations,
      dkLen,
    });

    return {
      key,
      saltHex: bytesToHex(saltBytes),
      algorithm: 'PBKDF2-SHA256',
      params: {
        iterations,
      },
    };
  } catch (error) {
    throw new CryptoError(`PBKDF2 derivation failed: ${(error as Error).message}`);
  }
}

/**
 * Convenience method to derive a Key Encryption Key (KEK) using default mobile-optimized Argon2id.
 */
export function deriveKeyEncryptionKey(
  passphrase: string,
  saltHex?: string
): DerivedKeyResult {
  return deriveKeyArgon2id(passphrase, saltHex, DEFAULT_ARGON2ID_CONFIG);
}
