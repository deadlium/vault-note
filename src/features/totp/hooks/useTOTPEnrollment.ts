/**
 * useTOTPEnrollment Hook
 * State management for QR scan and manual TOTP enrollment workflows
 * Manages validation, live token generation during confirmation, and error states
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { generateTOTPToken } from '../totpEngine';
import { tryParseOtpAuthUri } from '../parser/otpauthParser';
import { validateTOTPEnrollmentConfig } from '../parser/otpauthValidator';
import {
  TOTPEnrollmentData,
  TOTPToken,
  TOTPValidationErrorCode,
} from '../types';

export type EnrollmentMode = 'scanner' | 'manual' | 'confirming';

export interface UseTOTPEnrollmentResult {
  mode: EnrollmentMode;
  config: TOTPEnrollmentData | null;
  previewToken: TOTPToken | null;
  error: string | null;
  errorCode: TOTPValidationErrorCode | null;
  isProcessing: boolean;
  handleScannedData: (payload: string) => boolean;
  handleManualSubmit: (input: Partial<TOTPEnrollmentData>) => boolean;
  switchMode: (newMode: 'scanner' | 'manual') => void;
  reset: () => void;
  clearError: () => void;
}

export function useTOTPEnrollment(
  initialMode: 'scanner' | 'manual' = 'scanner'
): UseTOTPEnrollmentResult {
  const [mode, setMode] = useState<EnrollmentMode>(initialMode);
  const [config, setConfig] = useState<TOTPEnrollmentData | null>(null);
  const [previewToken, setPreviewToken] = useState<TOTPToken | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<TOTPValidationErrorCode | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const configRef = useRef(config);
  configRef.current = config;

  // Real-time OTP countdown clock for the confirmation screen
  useEffect(() => {
    if (mode !== 'confirming' || !config) {
      return;
    }

    const updateToken = () => {
      if (!configRef.current) return;
      try {
        const token = generateTOTPToken(configRef.current.secret, {
          algorithm: configRef.current.algorithm,
          digits: configRef.current.digits,
          period: configRef.current.period,
        });
        setPreviewToken(token);
      } catch {
        // Suppress ephemeral token preview calculation errors
      }
    };

    updateToken();
    const interval = setInterval(updateToken, 1000);
    return () => clearInterval(interval);
  }, [mode, config]);

  const handleScannedData = useCallback((payload: string): boolean => {
    setIsProcessing(true);
    setError(null);
    setErrorCode(null);

    const result = tryParseOtpAuthUri(payload);
    setIsProcessing(false);

    if (result.isValid && result.data) {
      setConfig(result.data);
      try {
        const token = generateTOTPToken(result.data.secret, {
          algorithm: result.data.algorithm,
          digits: result.data.digits,
          period: result.data.period,
        });
        setPreviewToken(token);
      } catch {
        // Fallback
      }
      setMode('confirming');
      return true;
    } else {
      setError(result.error ?? 'Invalid QR code.');
      setErrorCode(result.code ?? 'MALFORMED_URI');
      return false;
    }
  }, []);

  const handleManualSubmit = useCallback(
    (input: Partial<TOTPEnrollmentData>): boolean => {
      setError(null);
      setErrorCode(null);

      const result = validateTOTPEnrollmentConfig(input);
      if (result.isValid && result.data) {
        setConfig(result.data);
        try {
          const token = generateTOTPToken(result.data.secret, {
            algorithm: result.data.algorithm,
            digits: result.data.digits,
            period: result.data.period,
          });
          setPreviewToken(token);
        } catch {
          // Fallback
        }
        setMode('confirming');
        return true;
      } else {
        setError(result.error ?? 'Invalid configuration.');
        setErrorCode(result.code ?? 'INVALID_SECRET');
        return false;
      }
    },
    []
  );

  const switchMode = useCallback((newMode: 'scanner' | 'manual') => {
    setError(null);
    setErrorCode(null);
    setMode(newMode);
  }, []);

  const reset = useCallback(() => {
    setConfig(null);
    setPreviewToken(null);
    setError(null);
    setErrorCode(null);
    setIsProcessing(false);
    setMode('scanner');
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    setErrorCode(null);
  }, []);

  return {
    mode,
    config,
    previewToken,
    error,
    errorCode,
    isProcessing,
    handleScannedData,
    handleManualSubmit,
    switchMode,
    reset,
    clearError,
  };
}
