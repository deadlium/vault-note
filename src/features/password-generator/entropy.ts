/**
 * VaultNote Entropy Scorer & Password Strength Evaluator
 * Computes Shannon entropy, pool diversity, pattern penalties, and crack time estimations
 */

import { colors } from '../../theme/colors';
import { EntropyEvaluation, StrengthRating } from './types';

const COMMON_SEQUENCES = [
  '0123456789',
  '9876543210',
  'abcdefghijklmnopqrstuvwxyz',
  'zyxwvutsrqponmlkjihgfedcba',
  'qwertyuiop',
  'asdfghjkl',
  'zxcvbnm',
];

/**
 * Evaluates the real-time cryptographic entropy and brute-force resistance of a secret.
 *
 * @param secret Plaintext password or passphrase to score
 * @returns Comprehensive EntropyEvaluation with bit count, rating, crack time, and feedback
 */
export function evaluateEntropy(secret: string): EntropyEvaluation {
  if (!secret || secret.length === 0) {
    return {
      entropyBits: 0,
      score: 0,
      rating: 'very-weak',
      label: 'Empty',
      color: colors.crimson,
      crackTimeDisplay: 'Instant',
      suggestions: ['Enter or generate a password'],
    };
  }

  const length = secret.length;

  // 1. Calculate character set pool size
  let poolSize = 0;
  const hasLower = /[a-z]/.test(secret);
  const hasUpper = /[A-Z]/.test(secret);
  const hasNumbers = /[0-9]/.test(secret);
  const hasSymbols = /[^a-zA-Z0-9]/.test(secret);

  if (hasLower) poolSize += 26;
  if (hasUpper) poolSize += 26;
  if (hasNumbers) poolSize += 10;
  if (hasSymbols) poolSize += 33;

  if (poolSize === 0) poolSize = 1;

  // 2. Base pool entropy: L * log2(poolSize)
  const poolEntropy = length * (Math.log(poolSize) / Math.log(2));

  // 3. Shannon entropy: -Sum(p * log2(p)) * length
  const charFrequencies: Record<string, number> = {};
  for (const char of secret) {
    charFrequencies[char] = (charFrequencies[char] || 0) + 1;
  }

  let shannonEntropyPerChar = 0;
  const uniqueChars = Object.keys(charFrequencies).length;

  for (const char in charFrequencies) {
    const probability = charFrequencies[char] / length;
    shannonEntropyPerChar -= probability * (Math.log(probability) / Math.log(2));
  }

  const shannonEntropy = shannonEntropyPerChar * length;

  // 4. Pattern penalties (repeated chars, sequential runs, keyboard walks)
  let penaltyBits = 0;

  // Repetition penalty
  const uniquenessRatio = uniqueChars / length;
  if (uniquenessRatio < 0.6) {
    penaltyBits += (1 - uniquenessRatio) * 20;
  }

  // Sequence penalty (e.g. "1234", "abcd", "qwerty")
  const lowerSecret = secret.toLowerCase();
  for (const seq of COMMON_SEQUENCES) {
    for (let i = 0; i <= seq.length - 3; i++) {
      const sub = seq.substring(i, i + 3);
      if (lowerSecret.includes(sub)) {
        penaltyBits += 6;
      }
    }
  }

  // Consecutive identical characters penalty (e.g. "aaa")
  const consecutiveMatches = secret.match(/(.)\1{2,}/g);
  if (consecutiveMatches) {
    for (const match of consecutiveMatches) {
      penaltyBits += match.length * 3;
    }
  }

  // Blended effective entropy bits
  const rawEntropy = Math.min(poolEntropy, shannonEntropy * 1.15);
  const effectiveEntropy = Math.max(0, Math.round(rawEntropy - penaltyBits));

  // 5. Score and qualitative rating
  let score = 0;
  let rating: StrengthRating = 'very-weak';
  let label = 'Very Weak';
  let color: string = colors.crimson;

  if (effectiveEntropy >= 95 && length >= 14) {
    score = 4;
    rating = 'very-strong';
    label = 'Very Strong';
    color = colors.primary;
  } else if (effectiveEntropy >= 72 && length >= 12) {
    score = 3;
    rating = 'strong';
    label = 'Strong';
    color = colors.emerald;
  } else if (effectiveEntropy >= 50 && length >= 9) {
    score = 2;
    rating = 'fair';
    label = 'Fair';
    color = colors.amber;
  } else if (effectiveEntropy >= 28 && length >= 6) {
    score = 1;
    rating = 'weak';
    label = 'Weak';
    color = colors.amberDark;
  } else {
    score = 0;
    rating = 'very-weak';
    label = 'Very Weak';
    color = colors.crimson;
  }

  // 6. Crack time estimation (assuming 10 billion guesses/sec offline hash attack)
  const guessesPerSecond = 10_000_000_000;
  const crackTimeDisplay = formatCrackTime(effectiveEntropy, guessesPerSecond);

  // 7. Suggestions for improvement
  const suggestions: string[] = [];
  if (length < 12) {
    suggestions.push('Increase length to at least 14 characters');
  }
  if (!hasNumbers) {
    suggestions.push('Add numeric digits (0-9)');
  }
  if (!hasSymbols) {
    suggestions.push('Add symbols (!@#$)');
  }
  if (!hasUpper) {
    suggestions.push('Add uppercase characters (A-Z)');
  }
  if (!hasLower) {
    suggestions.push('Add lowercase characters (a-z)');
  }
  if (suggestions.length === 0) {
    suggestions.push('Cryptographically robust password');
  }

  return {
    entropyBits: effectiveEntropy,
    score,
    rating,
    label,
    color,
    crackTimeDisplay,
    suggestions,
  };
}

/**
 * Formats estimated crack time without using prohibited timing words
 */
function formatCrackTime(entropyBits: number, guessesPerSecond: number): string {
  if (entropyBits <= 18) return 'Instant';

  const totalCombinations = Math.pow(2, entropyBits);
  const seconds = totalCombinations / (guessesPerSecond * 2); // Average 50% search space

  if (seconds < 1) return 'Instant';
  if (seconds < 60) return `${Math.max(1, Math.round(seconds))} seconds`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`;
  if (seconds < 172800) return `${Math.round(seconds / 3600)} hours`; // up to 48 hours
  if (seconds < 2592000) return `${Math.round(seconds / 604800)} weeks`;
  if (seconds < 31536000) return `${Math.round(seconds / 2592000)} months`;
  if (seconds < 315360000) return `${Math.round(seconds / 31536000)} years`;
  if (seconds < 31536000000) return `${Math.round(seconds / 31536000)} years`;
  if (seconds < 3153600000000) return '> 1,000 years';
  if (seconds < 3153600000000000) return '> 100,000 years';

  return '> 1 billion years';
}
