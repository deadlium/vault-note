/**
 * VaultNote BIP-39 Emergency Recovery Kit Engine
 * Generates 24-word cryptographic mnemonic recovery phrases from 256-bit CSPRNG entropy
 * Phase 2: Authentication, Session State & Hardware Security
 */

import * as bip39 from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { getRandomBytes } from './csprng';
import { CryptoError } from './types';

export const BIP39_WORDLIST = wordlist;
export const DEFAULT_ENTROPY_BITS = 256; // 24 words

/**
 * Generates a 24-word emergency recovery phrase from 256 bits of OS-backed CSPRNG entropy.
 *
 * @param strengthBits Entropy size in bits (default: 256 for 24 words).
 * @returns Array of 24 mnemonic words.
 */
export function generateRecoveryPhrase(strengthBits: 128 | 256 = 256): string[] {
  try {
    const entropy = getRandomBytes(strengthBits / 8);
    const mnemonic = bip39.entropyToMnemonic(entropy, wordlist);
    return mnemonic.trim().split(/\s+/);
  } catch (error) {
    throw new CryptoError(`Failed to generate recovery phrase: ${(error as Error).message}`);
  }
}

/**
 * Validates a recovery phrase against the BIP-39 wordlist and SHA-256 checksum.
 *
 * @param phrase Array of words or space-separated string.
 * @returns boolean indicating validity.
 */
export function validateRecoveryPhrase(phrase: string[] | string): boolean {
  try {
    const phraseString = Array.isArray(phrase) ? phrase.join(' ') : phrase;
    const normalized = phraseString.trim().toLowerCase().replace(/\s+/g, ' ');
    return bip39.validateMnemonic(normalized, wordlist);
  } catch {
    return false;
  }
}

/**
 * Converts a valid recovery phrase back to its original raw entropy bytes.
 *
 * @param phrase Array of words or space-separated string.
 * @returns Uint8Array (32 bytes for 24-word phrase).
 */
export function recoveryPhraseToEntropy(phrase: string[] | string): Uint8Array {
  const phraseString = Array.isArray(phrase) ? phrase.join(' ') : phrase;
  const normalized = phraseString.trim().toLowerCase().replace(/\s+/g, ' ');

  if (!validateRecoveryPhrase(normalized)) {
    throw new CryptoError('Invalid BIP-39 recovery phrase: incorrect word or failed checksum.');
  }

  try {
    return bip39.mnemonicToEntropy(normalized, wordlist);
  } catch (error) {
    throw new CryptoError(`Failed to decode recovery phrase to entropy: ${(error as Error).message}`);
  }
}

/**
 * Converts raw entropy bytes directly into a BIP-39 mnemonic phrase array.
 *
 * @param entropy Uint8Array of entropy (16 or 32 bytes).
 * @returns Array of mnemonic words.
 */
export function entropyToRecoveryPhrase(entropy: Uint8Array): string[] {
  if (entropy.length !== 16 && entropy.length !== 32) {
    throw new CryptoError('BIP-39 entropy must be exactly 16 bytes (12 words) or 32 bytes (24 words).');
  }

  try {
    const mnemonic = bip39.entropyToMnemonic(entropy, wordlist);
    return mnemonic.trim().split(/\s+/);
  } catch (error) {
    throw new CryptoError(`Failed to convert entropy to recovery phrase: ${(error as Error).message}`);
  }
}

/**
 * Derives a 512-bit master seed from a BIP-39 mnemonic phrase and optional passphrase.
 */
export async function recoveryPhraseToSeed(
  phrase: string[] | string,
  passphrase = ''
): Promise<Uint8Array> {
  const phraseString = Array.isArray(phrase) ? phrase.join(' ') : phrase;
  const normalized = phraseString.trim().toLowerCase().replace(/\s+/g, ' ');

  if (!validateRecoveryPhrase(normalized)) {
    throw new CryptoError('Cannot derive seed: invalid BIP-39 recovery phrase.');
  }

  try {
    return await bip39.mnemonicToSeed(normalized, passphrase);
  } catch (error) {
    throw new CryptoError(`Failed to derive seed from recovery phrase: ${(error as Error).message}`);
  }
}
