/**
 * VaultNote Cryptographic Password & Passphrase Generator
 * Backed by OS-level CSPRNG entropy with zero modulo bias
 */

import { getRandomBytes } from '../../core/crypto/csprng';
import { BIP39_WORDLIST } from '../../core/crypto/bip39';
import { PasswordGeneratorOptions, PassphraseGeneratorOptions } from './types';

export const CHAR_POOLS = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
  ambiguous: '1lI0Oo',
} as const;

export const DEFAULT_PASSWORD_OPTIONS: PasswordGeneratorOptions = {
  length: 20,
  includeUppercase: true,
  includeLowercase: true,
  includeNumbers: true,
  includeSymbols: true,
  excludeAmbiguous: false,
};

export const DEFAULT_PASSPHRASE_OPTIONS: PassphraseGeneratorOptions = {
  wordCount: 4,
  separator: '-',
  capitalize: true,
  includeNumber: true,
};

/**
 * Returns a cryptographically unbiased integer in the range [0, maxExclusive - 1]
 * Uses rejection sampling to completely avoid modulo bias.
 */
export function getRandomInt(maxExclusive: number): number {
  if (maxExclusive <= 1) return 0;

  // Calculate bitmask for smallest power of 2 >= maxExclusive
  const bitsNeeded = 32 - Math.clz32(maxExclusive - 1);
  const mask = bitsNeeded === 32 ? 0xffffffff : (1 << bitsNeeded) - 1;

  while (true) {
    const bytes = getRandomBytes(4);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const candidate = (view.getUint32(0, true) >>> 0) & mask;
    if (candidate < maxExclusive) {
      return candidate;
    }
  }
}

/**
 * Removes ambiguous visual characters from a character string pool
 */
function removeAmbiguousChars(str: string): string {
  const ambiguousSet = new Set(CHAR_POOLS.ambiguous.split(''));
  return str
    .split('')
    .filter((char) => !ambiguousSet.has(char))
    .join('');
}

/**
 * Generates a high-entropy password respecting exact configuration constraints.
 * Guarantees representation from all selected character sets.
 *
 * @param userOptions Partial options to customize character pools and length
 * @returns Cryptographically random password string
 */
export function generatePassword(userOptions?: Partial<PasswordGeneratorOptions>): string {
  const options: PasswordGeneratorOptions = {
    ...DEFAULT_PASSWORD_OPTIONS,
    ...userOptions,
  };

  const length = Math.max(8, Math.min(64, options.length));

  // Build character pools
  const activePools: string[] = [];

  let upper: string = CHAR_POOLS.uppercase;
  let lower: string = CHAR_POOLS.lowercase;
  let numbers: string = CHAR_POOLS.numbers;
  let symbols: string = CHAR_POOLS.symbols;

  if (options.excludeAmbiguous) {
    upper = removeAmbiguousChars(upper);
    lower = removeAmbiguousChars(lower);
    numbers = removeAmbiguousChars(numbers);
  }

  if (options.includeUppercase) activePools.push(upper);
  if (options.includeLowercase) activePools.push(lower);
  if (options.includeNumbers) activePools.push(numbers);
  if (options.includeSymbols) activePools.push(symbols);

  // Fallback if all options were toggled off
  if (activePools.length === 0) {
    activePools.push(upper, lower, numbers);
  }

  const resultChars: string[] = [];

  // Guarantee at least one character from each enabled pool
  for (const pool of activePools) {
    if (resultChars.length < length) {
      const idx = getRandomInt(pool.length);
      resultChars.push(pool[idx]);
    }
  }

  // Combined full pool for remaining slots
  const combinedPool = activePools.join('');

  while (resultChars.length < length) {
    const idx = getRandomInt(combinedPool.length);
    resultChars.push(combinedPool[idx]);
  }

  // Fisher-Yates shuffle using CSPRNG
  for (let i = resultChars.length - 1; i > 0; i--) {
    const j = getRandomInt(i + 1);
    const temp = resultChars[i];
    resultChars[i] = resultChars[j];
    resultChars[j] = temp;
  }

  return resultChars.join('');
}

/**
 * Generates a Diceware-style memorable passphrase from BIP-39 English wordlist
 *
 * @param userOptions Partial options for word count, separator, and capitalization
 * @returns Passphrase string e.g. "correct-horse-battery-staple42"
 */
export function generatePassphrase(userOptions?: Partial<PassphraseGeneratorOptions>): string {
  const options: PassphraseGeneratorOptions = {
    ...DEFAULT_PASSPHRASE_OPTIONS,
    ...userOptions,
  };

  const wordCount = Math.max(3, Math.min(10, options.wordCount));
  const selectedWords: string[] = [];

  for (let i = 0; i < wordCount; i++) {
    const wordIdx = getRandomInt(BIP39_WORDLIST.length);
    let word = BIP39_WORDLIST[wordIdx];
    if (options.capitalize) {
      word = word.charAt(0).toUpperCase() + word.slice(1);
    }
    selectedWords.push(word);
  }

  if (options.includeNumber) {
    // Append a random 2-digit number (10 - 99) to the final word
    const randomNum = 10 + getRandomInt(90);
    const lastIdx = selectedWords.length - 1;
    selectedWords[lastIdx] = `${selectedWords[lastIdx]}${randomNum}`;
  }

  return selectedWords.join(options.separator);
}
