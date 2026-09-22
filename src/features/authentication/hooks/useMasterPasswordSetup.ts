/**
 * VaultNote Master Password Onboarding Hook
 * Manages multi-step vault initialization and recovery phrase generation
 * Phase 2: Authentication, Session State & Hardware Security (Day 4)
 */

import { useState, useCallback } from 'react';
import { generateRecoveryPhrase } from '../../../core/crypto/bip39';
import { deriveKeyArgon2id } from '../../../core/crypto/kdf';
import { generateMasterEnclaveToken, bytesToHex } from '../../../core/crypto/csprng';
import {
  storeMasterEnclaveToken,
  setVaultInitialized,
  setEnclaveItem,
  ENCLAVE_KEYS,
} from '../../../core/storage/enclave';
import { runMigrations } from '../../../core/database/migrations';
import { setMetadata } from '../../../core/database/repository';
import { evaluatePasswordStrength } from '../components/PasswordStrengthBar';

export type SetupStep =
  | 'welcome'           // Screen from first_time_setup.png
  | 'password'          // Enter & confirm master password
  | 'recovery_phrase'   // Display 24 BIP-39 words
  | 'verify_phrase'     // Quiz: confirm 3 random words
  | 'initializing'      // Argon2id derivation & database setup
  | 'complete';         // Ready to launch vault

export interface QuizQuestion {
  index: number;        // 0-indexed (0 to 23)
  wordNumber: number;   // 1-indexed display (1 to 24)
  correctWord: string;
  options: string[];    // 4 multiple choice options
}

export function useMasterPasswordSetup() {
  const [step, setStep] = useState<SetupStep>('welcome');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mnemonicWords, setMnemonicWords] = useState<string[]>([]);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const strength = evaluatePasswordStrength(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const canProceedFromPassword = strength.isAcceptable && passwordsMatch;

  /**
   * Start setup from Welcome screen
   */
  const startSetup = useCallback(() => {
    setStep('password');
    setError(null);
  }, []);

  /**
   * Submit Master Password and generate 24-word recovery phrase
   */
  const submitMasterPassword = useCallback(() => {
    if (!strength.isAcceptable) {
      setError('Password does not meet minimum security requirements.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError(null);
    const words = generateRecoveryPhrase(256);
    setMnemonicWords(words);

    // Prepare quiz: pick 3 distinct random words to test
    const indices = [3, 11, 19]; // Words #04, #12, #20
    const questions: QuizQuestion[] = indices.map((idx) => {
      const correct = words[idx];
      // Pick 3 random distractor words from the rest of the mnemonic
      const otherWords = words.filter((_, i) => i !== idx);
      const shuffled = [...otherWords].sort(() => 0.5 - Math.random());
      const options = [correct, ...shuffled.slice(0, 3)].sort(() => 0.5 - Math.random());

      return {
        index: idx,
        wordNumber: idx + 1,
        correctWord: correct,
        options,
      };
    });

    setQuizQuestions(questions);
    setQuizAnswers({});
    setStep('recovery_phrase');
  }, [password, confirmPassword, strength.isAcceptable]);

  /**
   * Move to phrase verification quiz
   */
  const proceedToVerification = useCallback(() => {
    setStep('verify_phrase');
    setError(null);
  }, []);

  /**
   * Answer a quiz question
   */
  const answerQuizQuestion = useCallback((wordNumber: number, selectedWord: string) => {
    setQuizAnswers((prev) => ({
      ...prev,
      [wordNumber]: selectedWord,
    }));
  }, []);

  /**
   * Finalize vault setup: verify quiz, derive KEK via Argon2id, initialize SQLite & Enclave
   */
  const finalizeVaultInitialization = useCallback(async () => {
    // 1. Verify quiz answers
    for (const q of quizQuestions) {
      const selected = quizAnswers[q.wordNumber];
      if (selected !== q.correctWord) {
        setError(`Word #${q.wordNumber.toString().padStart(2, '0')} is incorrect. Please verify your backup.`);
        return;
      }
    }

    setError(null);
    setIsLoading(true);
    setStep('initializing');

    try {
      // 2. Derive Key Encryption Key (KEK) using Argon2id
      const derivation = deriveKeyArgon2id(password);

      // 3. Generate 256-bit Master Enclave Token
      const enclaveToken = bytesToHex(generateMasterEnclaveToken());

      // 4. Store tokens in hardware Secure Enclave
      await storeMasterEnclaveToken(enclaveToken);
      await setEnclaveItem(ENCLAVE_KEYS.PASS_SALT, derivation.saltHex);
      await setVaultInitialized(true);

      // 5. Initialize SQLite database & apply schema migrations
      await runMigrations();

      // 6. Record metadata
      await setMetadata('vault_created_at', Date.now().toString());
      await setMetadata('vault_kdf_algo', derivation.algorithm);
      await setMetadata('vault_kdf_params', JSON.stringify(derivation.params));

      setIsLoading(false);
      setStep('complete');
    } catch (err) {
      setIsLoading(false);
      setError(`Vault initialization failed: ${(err as Error).message}`);
      setStep('password');
    }
  }, [password, quizAnswers, quizQuestions]);

  return {
    step,
    setStep,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    strength,
    passwordsMatch,
    canProceedFromPassword,
    mnemonicWords,
    quizQuestions,
    quizAnswers,
    answerQuizQuestion,
    error,
    isLoading,
    startSetup,
    submitMasterPassword,
    proceedToVerification,
    finalizeVaultInitialization,
  };
}
