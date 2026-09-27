/**
 * VaultNote Authenticated Symmetric Encryption (AES-256-GCM)
 * Phase 1: Cryptographic Perimeter
 */

import { gcm } from '@noble/ciphers/aes.js';
import {
  generateGcmNonce,
  bytesToBase64,
  base64ToBytes,
  utf8ToBytes,
  bytesToUtf8,
} from './csprng';
import {
  EncryptedPayload,
  InvalidKeyError,
  InvalidNonceError,
  DecryptionAuthenticationError,
  CryptoError,
} from './types';

export const CURRENT_ENVELOPE_VERSION = 1;
export const AES_KEY_SIZE_BYTES = 32; // 256 bits
export const GCM_NONCE_SIZE_BYTES = 12; // 96 bits
export const GCM_TAG_SIZE_BYTES = 16; // 128 bits

/**
 * Validates that a key is exactly 256 bits (32 bytes).
 */
export function validateKey(key: Uint8Array): void {
  if (!key || !(key instanceof Uint8Array)) {
    throw new InvalidKeyError(AES_KEY_SIZE_BYTES, 0);
  }
  if (key.length !== AES_KEY_SIZE_BYTES) {
    throw new InvalidKeyError(AES_KEY_SIZE_BYTES, key.length);
  }
}

/**
 * Encrypts arbitrary plaintext string or binary data using AES-256-GCM.
 * Automatically generates a cryptographically unique 96-bit nonce/IV per operation.
 *
 * @param plaintext String or Uint8Array of sensitive data.
 * @param key 256-bit (32-byte) secret encryption key.
 * @returns Self-describing EncryptedPayload envelope.
 */
export function encrypt(
  plaintext: string | Uint8Array,
  key: Uint8Array
): EncryptedPayload {
  validateKey(key);

  const nonce = generateGcmNonce();
  const plaintextBytes = typeof plaintext === 'string' ? utf8ToBytes(plaintext) : plaintext;

  try {
    const cipher = gcm(key, nonce);
    // @noble/ciphers gcm.encrypt appends the 16-byte authentication tag to the end of ciphertext
    const encryptedWithTag = cipher.encrypt(plaintextBytes);

    const ciphertextLength = encryptedWithTag.length - GCM_TAG_SIZE_BYTES;
    const ciphertextBytes = encryptedWithTag.subarray(0, ciphertextLength);
    const tagBytes = encryptedWithTag.subarray(ciphertextLength);

    return {
      version: CURRENT_ENVELOPE_VERSION,
      algorithm: 'AES-256-GCM',
      ciphertext: bytesToBase64(ciphertextBytes),
      iv: bytesToBase64(nonce),
      tag: bytesToBase64(tagBytes),
    };
  } catch (error) {
    throw new CryptoError(`Encryption failed: ${(error as Error).message}`);
  }
}

/**
 * Decrypts an EncryptedPayload using AES-256-GCM and verifies cryptographic authenticity.
 * Throws DecryptionAuthenticationError if the ciphertext or tag has been tampered with
 * or if the key is incorrect.
 *
 * @param payload EncryptedPayload envelope.
 * @param key 256-bit (32-byte) secret encryption key.
 * @returns Decrypted plaintext string.
 */
export function decrypt(
  payload: EncryptedPayload,
  key: Uint8Array
): string {
  validateKey(key);

  if (!payload || !payload.ciphertext || !payload.iv || !payload.tag) {
    throw new CryptoError('Malformed EncryptedPayload envelope: missing required fields.');
  }

  if (payload.algorithm !== 'AES-256-GCM') {
    throw new CryptoError(`Unsupported cipher algorithm: ${payload.algorithm}.`);
  }

  let nonceBytes: Uint8Array;
  let ciphertextBytes: Uint8Array;
  let tagBytes: Uint8Array;

  try {
    nonceBytes = base64ToBytes(payload.iv);
    ciphertextBytes = base64ToBytes(payload.ciphertext);
    tagBytes = base64ToBytes(payload.tag);
  } catch {
    throw new DecryptionAuthenticationError('Corrupted payload: Base64 decoding failed.');
  }

  if (nonceBytes.length !== GCM_NONCE_SIZE_BYTES) {
    throw new InvalidNonceError(GCM_NONCE_SIZE_BYTES, nonceBytes.length);
  }

  if (tagBytes.length !== GCM_TAG_SIZE_BYTES) {
    throw new DecryptionAuthenticationError('Corrupted payload: Invalid authentication tag length.');
  }

  // Combine ciphertext and auth tag for @noble/ciphers gcm.decrypt
  const encryptedWithTag = new Uint8Array(ciphertextBytes.length + tagBytes.length);
  encryptedWithTag.set(ciphertextBytes, 0);
  encryptedWithTag.set(tagBytes, ciphertextBytes.length);

  try {
    const cipher = gcm(key, nonceBytes);
    const decryptedBytes = cipher.decrypt(encryptedWithTag);
    return bytesToUtf8(decryptedBytes);
  } catch {
    // noble throws on auth failure; map to explicit domain error
    throw new DecryptionAuthenticationError();
  }
}

/**
 * Encrypts a JSON-serializable JavaScript object.
 */
export function encryptObject<T>(data: T, key: Uint8Array): EncryptedPayload {
  const jsonString = JSON.stringify(data);
  return encrypt(jsonString, key);
}

/**
 * Decrypts an EncryptedPayload and parses it as a JSON object.
 */
export function decryptObject<T>(payload: EncryptedPayload, key: Uint8Array): T {
  const decryptedString = decrypt(payload, key);
  try {
    return JSON.parse(decryptedString) as T;
  } catch (error) {
    throw new CryptoError(`Failed to parse decrypted JSON data: ${(error as Error).message}`);
  }
}
