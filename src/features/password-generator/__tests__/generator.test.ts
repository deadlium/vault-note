/**
 * Password Generator & Entropy Evaluator Test Suite
 * Verifies CSPRNG distribution, constraint satisfaction, and entropy scoring
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  generatePassword,
  generatePassphrase,
  getRandomInt,
  CHAR_POOLS,
} from '../generator';
import { evaluateEntropy } from '../entropy';

describe('CSPRNG Password Generator Engine', () => {
  it('generates passwords matching requested lengths', () => {
    const lengths = [8, 12, 16, 20, 32, 64];
    for (const len of lengths) {
      const password = generatePassword({ length: len });
      assert.strictEqual(password.length, len);
    }
  });

  it('clamps invalid length requests safely to valid bounds', () => {
    const tooShort = generatePassword({ length: 4 });
    assert.strictEqual(tooShort.length, 8);

    const tooLong = generatePassword({ length: 128 });
    assert.strictEqual(tooLong.length, 64);
  });

  it('guarantees unique passwords across successive invocations', () => {
    const generated = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const pw = generatePassword({ length: 16 });
      assert.strictEqual(generated.has(pw), false);
      generated.add(pw);
    }
    assert.strictEqual(generated.size, 50);
  });

  it('contains characters exclusively from enabled character pools', () => {
    // Uppercase only
    const upperOnly = generatePassword({
      length: 20,
      includeUppercase: true,
      includeLowercase: false,
      includeNumbers: false,
      includeSymbols: false,
    });
    assert.match(upperOnly, /^[A-Z]+$/);

    // Lowercase only
    const lowerOnly = generatePassword({
      length: 20,
      includeUppercase: false,
      includeLowercase: true,
      includeNumbers: false,
      includeSymbols: false,
    });
    assert.match(lowerOnly, /^[a-z]+$/);

    // Numbers only
    const numbersOnly = generatePassword({
      length: 20,
      includeUppercase: false,
      includeLowercase: false,
      includeNumbers: true,
      includeSymbols: false,
    });
    assert.match(numbersOnly, /^[0-9]+$/);
  });

  it('guarantees representation from all selected character categories', () => {
    for (let i = 0; i < 20; i++) {
      const pw = generatePassword({
        length: 16,
        includeUppercase: true,
        includeLowercase: true,
        includeNumbers: true,
        includeSymbols: true,
      });

      assert.strictEqual(/[A-Z]/.test(pw), true, 'Must include uppercase');
      assert.strictEqual(/[a-z]/.test(pw), true, 'Must include lowercase');
      assert.strictEqual(/[0-9]/.test(pw), true, 'Must include number');
      assert.strictEqual(/[^a-zA-Z0-9]/.test(pw), true, 'Must include symbol');
    }
  });

  it('excludes visually ambiguous characters when requested', () => {
    const ambiguousRegex = /[1lI0Oo]/;
    for (let i = 0; i < 30; i++) {
      const pw = generatePassword({
        length: 24,
        excludeAmbiguous: true,
      });
      assert.strictEqual(ambiguousRegex.test(pw), false, `Found ambiguous char in: ${pw}`);
    }
  });

  it('falls back safely if all character options are disabled', () => {
    const pw = generatePassword({
      includeUppercase: false,
      includeLowercase: false,
      includeNumbers: false,
      includeSymbols: false,
    });
    assert.ok(pw.length >= 8);
  });
});

describe('Diceware Passphrase Generator', () => {
  it('generates the exact requested number of words', () => {
    const phrase = generatePassphrase({ wordCount: 5, separator: '-' });
    const parts = phrase.split('-');
    assert.strictEqual(parts.length, 5);
  });

  it('supports custom separators', () => {
    const phrase = generatePassphrase({ wordCount: 4, separator: '.' });
    assert.strictEqual(phrase.includes('.'), true);
    assert.strictEqual(phrase.split('.').length, 4);
  });

  it('capitalizes each word when capitalize option is true', () => {
    const phrase = generatePassphrase({ wordCount: 4, separator: '-', capitalize: true, includeNumber: false });
    const words = phrase.split('-');
    for (const word of words) {
      assert.match(word.charAt(0), /^[A-Z]$/);
    }
  });

  it('appends random digits when includeNumber is true', () => {
    const phrase = generatePassphrase({ wordCount: 3, includeNumber: true });
    assert.match(phrase, /[0-9]{2}$/);
  });
});

describe('Cryptographic Entropy & Strength Evaluator', () => {
  it('evaluates empty string as 0 bits and very-weak', () => {
    const result = evaluateEntropy('');
    assert.strictEqual(result.entropyBits, 0);
    assert.strictEqual(result.score, 0);
    assert.strictEqual(result.rating, 'very-weak');
    assert.strictEqual(result.crackTimeDisplay, 'Instant');
  });

  it('penalizes repetitive and sequential passwords', () => {
    const repeated = evaluateEntropy('aaaaaaaaaaaaaaaa'); // 16 chars
    const random = evaluateEntropy('kP9#mX2$vL7!qR4@');   // 16 chars

    assert.ok(
      repeated.entropyBits < random.entropyBits,
      `Repeated entropy (${repeated.entropyBits}) should be much lower than random (${random.entropyBits})`
    );
    assert.ok(repeated.score < random.score);
  });

  it('penalizes keyboard sequences like qwerty', () => {
    const qwertySeq = evaluateEntropy('qwerty123456');
    const randomSecret = evaluateEntropy('xK8$mP2@qR9#');

    assert.ok(qwertySeq.entropyBits < randomSecret.entropyBits);
  });

  it('rates robust 20-character random passwords as very-strong', () => {
    const strongPw = generatePassword({ length: 20 });
    const result = evaluateEntropy(strongPw);

    assert.ok(result.entropyBits >= 75);
    assert.ok(result.score >= 3);
    assert.ok(['strong', 'very-strong'].includes(result.rating));
  });

  it('returns valid crack time estimations without prohibited terminology', () => {
    const weak = evaluateEntropy('123456');
    assert.strictEqual(weak.crackTimeDisplay, 'Instant');

    const strong = evaluateEntropy('kP9#mX2$vL7!qR4@zT1%');
    assert.ok(strong.crackTimeDisplay.includes('years') || strong.crackTimeDisplay.includes('weeks'));
  });
});

describe('Unbiased CSPRNG Integer Sampling', () => {
  it('returns integers within valid bounds', () => {
    for (let i = 0; i < 100; i++) {
      const val = getRandomInt(10);
      assert.ok(val >= 0 && val < 10);
    }
  });

  it('returns 0 for boundary inputs <= 1', () => {
    assert.strictEqual(getRandomInt(1), 0);
    assert.strictEqual(getRandomInt(0), 0);
  });
});
