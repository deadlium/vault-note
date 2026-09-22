/**
 * VaultNote Cryptographic Engine Type Definitions
 * Phase 1: Cryptographic Perimeter
 */

export type CipherAlgorithm = 'AES-256-GCM';

export type KdfAlgorithm = 'Argon2id' | 'PBKDF2-SHA256';

/**
 * Standard self-describing encrypted payload envelope.
 * Any data serialized into this envelope contains all metadata necessary for authenticated decryption.
 */
export interface EncryptedPayload {
  /** Envelope specification version for forward/backward compatibility */
  version: number;
  /** Symmetric cipher algorithm */
  algorithm: CipherAlgorithm;
  /** Base64-encoded ciphertext */
  ciphertext: string;
  /** Base64-encoded Initialization Vector / Nonce (96 bits / 12 bytes) */
  iv: string;
  /** Base64-encoded GCM authentication tag (128 bits / 16 bytes) */
  tag: string;
  /** Optional Base64-encoded salt if payload includes key derivation metadata */
  salt?: string;
  /** KDF algorithm used to derive the key, if applicable */
  kdf?: KdfAlgorithm;
  /** Memory cost parameter (in KB) */
  memory?: number;
  /** Iteration / time cost parameter */
  iterations?: number;
  /** Parallelism lanes parameter */
  parallelism?: number;
}

/**
 * Options configuring key derivation via Argon2id
 */
export interface Argon2idOptions {
  /** Memory cost in KiB (default: 65536 = 64 MB for high security, 19456 = 19 MB for responsive mobile) */
  m?: number;
  /** Number of iterations (default: 3) */
  t?: number;
  /** Parallelism factor (threads/lanes, default: 1 for JS/mobile environments, 4 for multicore) */
  p?: number;
  /** Derived key length in bytes (default: 32 bytes = 256 bits) */
  dkLen?: number;
}

/**
 * Options configuring PBKDF2-SHA256 key derivation fallback
 */
export interface Pbkdf2Options {
  /** Iteration count (default: 600,000 as per OWASP recommendation for PBKDF2-HMAC-SHA256) */
  iterations?: number;
  /** Derived key length in bytes (default: 32 bytes = 256 bits) */
  dkLen?: number;
}

/**
 * Result of deriving a Key Encryption Key (KEK) or Master Key
 */
export interface DerivedKeyResult {
  /** 256-bit derived key buffer (32 bytes) */
  key: Uint8Array;
  /** Hex-encoded salt used for derivation */
  saltHex: string;
  /** Algorithm used */
  algorithm: KdfAlgorithm;
  /** KDF parameters recorded for deterministic recalculation */
  params: {
    iterations: number;
    memory?: number;
    parallelism?: number;
  };
}

/**
 * Base domain error for cryptographic subsystem failures
 */
export class CryptoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CryptoError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when GCM authentication tag verification fails (tampered data or wrong key)
 */
export class DecryptionAuthenticationError extends CryptoError {
  constructor(message = 'Authentication tag mismatch: ciphertext has been tampered with or key is invalid.') {
    super(message);
    this.name = 'DecryptionAuthenticationError';
  }
}

/**
 * Thrown when an invalid key length is provided (AES-256 requires exactly 32 bytes)
 */
export class InvalidKeyError extends CryptoError {
  constructor(expectedBytes = 32, actualBytes?: number) {
    super(`Invalid key size: expected ${expectedBytes} bytes (256 bits)${actualBytes !== undefined ? `, got ${actualBytes} bytes` : ''}.`);
    this.name = 'InvalidKeyError';
  }
}

/**
 * Thrown when an invalid IV / nonce is provided (GCM requires exactly 12 bytes / 96 bits)
 */
export class InvalidNonceError extends CryptoError {
  constructor(expectedBytes = 12, actualBytes?: number) {
    super(`Invalid nonce size: expected ${expectedBytes} bytes (96 bits)${actualBytes !== undefined ? `, got ${actualBytes} bytes` : ''}.`);
    this.name = 'InvalidNonceError';
  }
}

/**
 * Thrown when CSPRNG entropy generation fails
 */
export class EntropyError extends CryptoError {
  constructor(message = 'Cryptographically secure random number generation failed.') {
    super(message);
    this.name = 'EntropyError';
  }
}
