/**
 * RFC 4648 Base32 Encoding & Decoding Engine
 * Strictly compliant with RFC 4648 standard alphabet (A-Z, 2-7)
 */

import { CryptoError } from '../../core/crypto/types';

const RFC4648_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

// Fast inverted lookup table mapping ASCII char codes to 5-bit values
const BASE32_LOOKUP = new Int8Array(256).fill(-1);
for (let i = 0; i < RFC4648_ALPHABET.length; i++) {
  const charCode = RFC4648_ALPHABET.charCodeAt(i);
  BASE32_LOOKUP[charCode] = i;
  // Support lowercase characters gracefully
  if (charCode >= 65 && charCode <= 90) {
    BASE32_LOOKUP[charCode + 32] = i;
  }
}

/**
 * Normalizes and decodes an RFC 4648 Base32 string into a raw byte array.
 * Strips whitespace, hyphens, and optional padding characters ('=').
 */
export function base32Decode(encoded: string): Uint8Array {
  if (typeof encoded !== 'string') {
    throw new CryptoError('Base32 input must be a string');
  }

  // Strip spaces, dashes, newlines, and trailing padding
  const sanitized = encoded.replace(/[\s\-_=]/g, '').toUpperCase();
  if (sanitized.length === 0) {
    return new Uint8Array(0);
  }

  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (let i = 0; i < sanitized.length; i++) {
    const charCode = sanitized.charCodeAt(i);
    const val = charCode < 256 ? BASE32_LOOKUP[charCode] : -1;

    if (val === -1) {
      throw new CryptoError(`Invalid Base32 character encountered: '${sanitized[i]}' at index ${i}`);
    }

    value = (value << 5) | val;
    bits += 5;

    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return new Uint8Array(output);
}

/**
 * Encodes an 8-bit byte array into an RFC 4648 Base32 string.
 * @param bytes Buffer to encode
 * @param pad Whether to include '=' padding (defaults to false for authenticator compatibility)
 */
export function base32Encode(bytes: Uint8Array, pad = false): string {
  if (!(bytes instanceof Uint8Array)) {
    throw new CryptoError('Base32 encode expects a Uint8Array');
  }

  if (bytes.length === 0) {
    return '';
  }

  let bits = 0;
  let value = 0;
  let result = '';

  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;

    while (bits >= 5) {
      result += RFC4648_ALPHABET[(value >>> (bits - 5)) & 0x1f];
      bits -= 5;
    }
  }

  if (bits > 0) {
    result += RFC4648_ALPHABET[(value << (5 - bits)) & 0x1f];
  }

  if (pad) {
    while (result.length % 8 !== 0) {
      result += '=';
    }
  }

  return result;
}

/**
 * Validates whether a string consists strictly of valid RFC 4648 Base32 characters.
 */
export function isValidBase32(str: string): boolean {
  if (typeof str !== 'string') return false;
  const sanitized = str.replace(/[\s\-_=]/g, '');
  if (sanitized.length === 0) return false;

  for (let i = 0; i < sanitized.length; i++) {
    const code = sanitized.charCodeAt(i);
    if (code >= 256 || BASE32_LOOKUP[code] === -1) {
      return false;
    }
  }
  return true;
}
