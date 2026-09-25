/**
 * usePasswordGenerator Hook
 * Reactive state and controls for password/passphrase generation and real-time entropy evaluation
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  PasswordGeneratorOptions,
  PassphraseGeneratorOptions,
  GeneratorMode,
  EntropyEvaluation,
} from '../types';
import {
  generatePassword,
  generatePassphrase,
  DEFAULT_PASSWORD_OPTIONS,
  DEFAULT_PASSPHRASE_OPTIONS,
} from '../generator';
import { evaluateEntropy } from '../entropy';
import { useClipboardManager } from '../../../core/clipboard';

export interface UsePasswordGeneratorResult {
  mode: GeneratorMode;
  setMode: (mode: GeneratorMode) => void;
  passwordOptions: PasswordGeneratorOptions;
  passphraseOptions: PassphraseGeneratorOptions;
  updatePasswordOption: <K extends keyof PasswordGeneratorOptions>(
    key: K,
    value: PasswordGeneratorOptions[K]
  ) => void;
  updatePassphraseOption: <K extends keyof PassphraseGeneratorOptions>(
    key: K,
    value: PassphraseGeneratorOptions[K]
  ) => void;
  currentValue: string;
  evaluation: EntropyEvaluation;
  regenerate: () => void;
  history: string[];
  selectHistoryItem: (item: string) => void;
  copySecret: () => Promise<boolean>;
  isCopied: boolean;
  remainingSeconds: number;
}

export function usePasswordGenerator(initialMode: GeneratorMode = 'password'): UsePasswordGeneratorResult {
  const [mode, setMode] = useState<GeneratorMode>(initialMode);
  const [passwordOptions, setPasswordOptions] = useState<PasswordGeneratorOptions>(DEFAULT_PASSWORD_OPTIONS);
  const [passphraseOptions, setPassphraseOptions] = useState<PassphraseGeneratorOptions>(DEFAULT_PASSPHRASE_OPTIONS);

  const [currentValue, setCurrentValue] = useState<string>(() => {
    return initialMode === 'password'
      ? generatePassword(DEFAULT_PASSWORD_OPTIONS)
      : generatePassphrase(DEFAULT_PASSPHRASE_OPTIONS);
  });

  const [history, setHistory] = useState<string[]>([]);
  const [isCopied, setIsCopied] = useState(false);

  const { copySecret: copyToClipboard, remainingSeconds, isActive } = useClipboardManager();

  // Reset copied banner when clipboard wipes
  useEffect(() => {
    if (!isActive) {
      setIsCopied(false);
    }
  }, [isActive]);

  const evaluation = useMemo(() => {
    return evaluateEntropy(currentValue);
  }, [currentValue]);

  const regenerate = useCallback(() => {
    const nextValue =
      mode === 'password'
        ? generatePassword(passwordOptions)
        : generatePassphrase(passphraseOptions);

    if (currentValue && currentValue !== nextValue) {
      setHistory((prev) => [currentValue, ...prev.filter((item) => item !== currentValue)].slice(0, 10));
    }

    setCurrentValue(nextValue);
    setIsCopied(false);
  }, [mode, passwordOptions, passphraseOptions, currentValue]);

  const updatePasswordOption = useCallback(
    <K extends keyof PasswordGeneratorOptions>(key: K, value: PasswordGeneratorOptions[K]) => {
      setPasswordOptions((prev) => {
        const next = { ...prev, [key]: value };
        // Immediately regenerate with new setting
        const nextVal = generatePassword(next);
        setCurrentValue(nextVal);
        return next;
      });
    },
    []
  );

  const updatePassphraseOption = useCallback(
    <K extends keyof PassphraseGeneratorOptions>(key: K, value: PassphraseGeneratorOptions[K]) => {
      setPassphraseOptions((prev) => {
        const next = { ...prev, [key]: value };
        // Immediately regenerate with new setting
        const nextVal = generatePassphrase(next);
        setCurrentValue(nextVal);
        return next;
      });
    },
    []
  );

  const handleSetMode = useCallback((newMode: GeneratorMode) => {
    setMode(newMode);
    if (newMode === 'password') {
      setCurrentValue(generatePassword(passwordOptions));
    } else {
      setCurrentValue(generatePassphrase(passphraseOptions));
    }
    setIsCopied(false);
  }, [passwordOptions, passphraseOptions]);

  const selectHistoryItem = useCallback((item: string) => {
    if (currentValue && currentValue !== item) {
      setHistory((prev) => [currentValue, ...prev.filter((i) => i !== currentValue)].slice(0, 10));
    }
    setCurrentValue(item);
    setIsCopied(false);
  }, [currentValue]);

  const copySecret = useCallback(async (): Promise<boolean> => {
    if (!currentValue) return false;
    const success = await copyToClipboard(currentValue, 'Generated Secret', 30);
    if (success) {
      setIsCopied(true);
    }
    return success;
  }, [currentValue, copyToClipboard]);

  return {
    mode,
    setMode: handleSetMode,
    passwordOptions,
    passphraseOptions,
    updatePasswordOption,
    updatePassphraseOption,
    currentValue,
    evaluation,
    regenerate,
    history,
    selectHistoryItem,
    copySecret,
    isCopied,
    remainingSeconds,
  };
}
