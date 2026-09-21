import test from 'node:test';
import assert from 'node:assert';
import {
  generateRecoveryPhrase,
  validateRecoveryPhrase,
  recoveryPhraseToEntropy,
  entropyToRecoveryPhrase,
  recoveryPhraseToSeed,
  BIP39_WORDLIST,
} from '../bip39';
import { getRandomBytes } from '../csprng';
import { CryptoError } from '../types';

test('BIP-39: Generates valid 24-word recovery phrase from 256-bit entropy', () => {
  const words = generateRecoveryPhrase(256);
  assert.strictEqual(words.length, 24);

  // Each word must belong to the standard BIP-39 English wordlist
  for (const word of words) {
    assert.ok(BIP39_WORDLIST.includes(word), `Word "${word}" must exist in BIP-39 wordlist`);
  }

  // Must pass checksum validation
  assert.strictEqual(validateRecoveryPhrase(words), true);
  assert.strictEqual(validateRecoveryPhrase(words.join(' ')), true);
});

test('BIP-39: Generates valid 12-word phrase when requested', () => {
  const words = generateRecoveryPhrase(128);
  assert.strictEqual(words.length, 12);
  assert.strictEqual(validateRecoveryPhrase(words), true);
});

test('BIP-39: Checksum tampering rejection', () => {
  const words = generateRecoveryPhrase(256);

  // Alter a word in the phrase
  const tamperedWords = [...words];
  const originalWord = tamperedWords[0];
  tamperedWords[0] = originalWord === 'abandon' ? 'ability' : 'abandon';

  // Either invalid word or failed checksum
  assert.strictEqual(validateRecoveryPhrase(tamperedWords), false);
});

test('BIP-39: Entropy round-trip preserves exact 256-bit binary state', () => {
  const originalEntropy = getRandomBytes(32);
  const phrase = entropyToRecoveryPhrase(originalEntropy);
  assert.strictEqual(phrase.length, 24);

  const recoveredEntropy = recoveryPhraseToEntropy(phrase);
  assert.deepStrictEqual(recoveredEntropy, originalEntropy);
});

test('BIP-39: Master seed derivation produces 512-bit key', async () => {
  const words = generateRecoveryPhrase(256);
  const seed = await recoveryPhraseToSeed(words, 'optional-salt-passphrase');
  assert.strictEqual(seed.length, 64); // 512 bits
});

test('BIP-39: Invalid phrase throws on entropy or seed derivation', async () => {
  const badPhrase = ['invalid', 'fake', 'words', 'that', 'do', 'not', 'exist'];
  assert.throws(() => recoveryPhraseToEntropy(badPhrase), CryptoError);
  await assert.rejects(async () => await recoveryPhraseToSeed(badPhrase), CryptoError);
});
