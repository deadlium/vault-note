/**
 * useTOTP Hook
 * Reactive state management for real-time TOTP generation and animated countdown cycles
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { generateTOTPToken, getRemainingSeconds } from '../totpEngine';
import { TOTPConfig, TOTPToken } from '../types';

export interface UseTOTPResult extends TOTPToken {
  /** True if secret is non-empty and valid Base32 format */
  isValidSecret: boolean;
  /** Error message if secret decoding or code generation fails */
  error: string | null;
  /** Force regeneration manually */
  refresh: () => void;
}

export function useTOTP(
  secret?: string,
  options: Partial<TOTPConfig> = {}
): UseTOTPResult {
  const period = options.period ?? 30;
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const [token, setToken] = useState<TOTPToken>(() => {
    if (!secret || secret.trim().length === 0) {
      return {
        code: '------',
        formattedCode: '--- ---',
        remainingSeconds: period,
        period,
        progress: 1,
        isExpiringSoon: false,
      };
    }
    try {
      return generateTOTPToken(secret, options);
    } catch {
      return {
        code: '------',
        formattedCode: '--- ---',
        remainingSeconds: period,
        period,
        progress: 1,
        isExpiringSoon: false,
      };
    }
  });

  const [isValidSecret, setIsValidSecret] = useState<boolean>(() => {
    if (!secret || secret.trim().length === 0) return false;
    try {
      generateTOTPToken(secret, options);
      return true;
    } catch {
      return false;
    }
  });

  const [error, setError] = useState<string | null>(null);
  const currentStepRef = useRef<number>(Math.floor(Date.now() / 1000 / period));

  const updateToken = useCallback(() => {
    if (!secret || secret.trim().length === 0) {
      setIsValidSecret(false);
      setError(null);
      setToken({
        code: '------',
        formattedCode: '--- ---',
        remainingSeconds: period,
        period,
        progress: 1,
        isExpiringSoon: false,
      });
      return;
    }

    try {
      const now = Date.now();
      const currentStep = Math.floor(now / 1000 / period);
      const remainingSeconds = getRemainingSeconds(period, now);
      const progress = Math.max(0, Math.min(1, remainingSeconds / period));
      const isExpiringSoon = remainingSeconds <= 5;

      // Only regenerate cryptographic HMAC token when time step counter shifts
      if (currentStep !== currentStepRef.current || token.code === '------') {
        currentStepRef.current = currentStep;
        const freshToken = generateTOTPToken(secret, {
          ...optionsRef.current,
          period,
          timestamp: now,
        });
        setToken(freshToken);
      } else {
        setToken((prev) => ({
          ...prev,
          remainingSeconds,
          progress,
          isExpiringSoon,
        }));
      }

      setIsValidSecret(true);
      setError(null);
    } catch (err: unknown) {
      setIsValidSecret(false);
      setError(err instanceof Error ? err.message : 'Invalid TOTP secret');
      setToken({
        code: '------',
        formattedCode: '--- ---',
        remainingSeconds: period,
        period,
        progress: 1,
        isExpiringSoon: false,
      });
    }
  }, [secret, period, token.code]);

  useEffect(() => {
    updateToken();
    // 500ms interval guarantees sub-second countdown fidelity and zero missed tick rollovers
    const timer = setInterval(updateToken, 500);
    return () => clearInterval(timer);
  }, [updateToken]);

  return {
    ...token,
    isValidSecret,
    error,
    refresh: updateToken,
  };
}
