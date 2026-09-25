/**
 * Cryptographic Password Generator Types
 * VaultNote Security & Entropy Primitives
 */

export interface PasswordGeneratorOptions {
  length: number;
  includeUppercase: boolean;
  includeLowercase: boolean;
  includeNumbers: boolean;
  includeSymbols: boolean;
  excludeAmbiguous: boolean;
}

export interface PassphraseGeneratorOptions {
  wordCount: number;
  separator: string;
  capitalize: boolean;
  includeNumber: boolean;
}

export type GeneratorMode = 'password' | 'passphrase';

export type StrengthRating = 'very-weak' | 'weak' | 'fair' | 'strong' | 'very-strong';

export interface EntropyEvaluation {
  entropyBits: number;
  score: number; // 0 to 4
  rating: StrengthRating;
  label: string;
  color: string;
  crackTimeDisplay: string;
  suggestions: string[];
}

export interface GeneratorState {
  mode: GeneratorMode;
  passwordOptions: PasswordGeneratorOptions;
  passphraseOptions: PassphraseGeneratorOptions;
  currentValue: string;
  history: string[];
}
