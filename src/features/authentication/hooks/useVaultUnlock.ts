/**
 * VaultNote Vault Unlock Hook
 * Coordinates biometric sensor prompts and master password verification
 * Phase 2: Authentication, Session State & Hardware Security
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  checkBiometricHardware,
  authenticateBiometric,
  cancelBiometric,
  getBiometricLabel,
  BiometricHardwareStatus,
} from '../../../core/biometric';
import {
  getMasterEnclaveToken,
  storeBiometricSecret,
  getEnclaveItem,
  ENCLAVE_KEYS,
} from '../../../core/storage/enclave';
import { deriveKeyArgon2id, deriveKeyEncryptionKey } from '../../../core/crypto/kdf';
import { VaultSessionManager } from '../../../core/session';
import { useVaultStore } from '../../vault/store/useVaultStore';

export interface UseVaultUnlockOptions {
  onUnlockSuccess?: () => void;
  autoPromptBiometrics?: boolean;
}

export function useVaultUnlock(options?: UseVaultUnlockOptions) {
  const [hardwareStatus, setHardwareStatus] = useState<BiometricHardwareStatus | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [usePasswordFallback, setUsePasswordFallback] = useState(false);

  // Keep options in a ref to prevent effect & callback recreation on parent re-renders
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Track if auto-prompt has fired to strictly prevent loops on dismiss/re-render
  const hasAutoPromptedRef = useRef(false);

  // Guard against concurrent biometric prompts
  const isAuthenticatingRef = useRef(false);

  // Derive human-friendly biometric label
  const biometricLabel = hardwareStatus
    ? getBiometricLabel(hardwareStatus.supportedTypes)
    : 'Biometrics';

  const isBiometricAvailable = Boolean(
    hardwareStatus?.hasHardware && hardwareStatus?.isEnrolled
  );

  /**
   * Hardware capability check
   */
  const checkStatus = useCallback(async () => {
    try {
      const status = await checkBiometricHardware();
      setHardwareStatus(status);
      if (!status.hasHardware || !status.isEnrolled) {
        setUsePasswordFallback(true);
      }
      return status;
    } catch {
      setUsePasswordFallback(true);
      return null;
    }
  }, []);

  /**
   * Biometric scan prompt
   */
  const triggerBiometricUnlock = useCallback(async () => {
    if (isAuthenticatingRef.current) {
      return false;
    }

    isAuthenticatingRef.current = true;
    setIsAuthenticating(true);
    setError(null);

    try {
      const result = await authenticateBiometric({
        promptMessage: `Scan ${biometricLabel} to unlock VaultNote`,
        cancelLabel: 'Use Master Password',
        fallbackLabel: 'Master Password',
      });

      if (result.success) {
        // Retrieve master token without triggering extra biometric prompts
        const masterToken = await getMasterEnclaveToken();

        if (masterToken) {
          // Re-arm biometric secret cleanly without requiring authentication flag
          await storeBiometricSecret(masterToken).catch(() => {});
        }

        setIsUnlocked(true);
        setIsAuthenticating(false);
        isAuthenticatingRef.current = false;
        optionsRef.current?.onUnlockSuccess?.();
        return true;
      }

      if (result.error) {
        // Switch to enter password section on cancel, back, or failure
        setUsePasswordFallback(true);
        if (
          result.error === 'user_cancel' ||
          result.error === 'user_fallback' ||
          result.error === 'system_cancel' ||
          result.error === 'app_cancel'
        ) {
          setError(null);
        } else {
          setError(result.error);
        }
      }
    } catch (err) {
      setUsePasswordFallback(true);
      setError(err instanceof Error ? err.message : 'Biometric authentication failed');
    } finally {
      setIsAuthenticating(false);
      isAuthenticatingRef.current = false;
    }

    return false;
  }, [biometricLabel]);

  /**
   * Master password verification fallback
   */
  const unlockWithMasterPassword = useCallback(async (customPassword?: string) => {
    const pwdToVerify = customPassword ?? password;
    if (!pwdToVerify || pwdToVerify.trim().length === 0) {
      setError('Please enter your master password.');
      return false;
    }

    setError(null);
    setIsAuthenticating(true);

    try {
      // 1. Retrieve master salt from hardware enclave
      const storedSaltHex = await getEnclaveItem(ENCLAVE_KEYS.PASS_SALT);

      let derivedKey: Uint8Array;
      if (storedSaltHex) {
        // Derive key with stored salt to verify validity
        const derivation = deriveKeyArgon2id(pwdToVerify, storedSaltHex);
        derivedKey = derivation.key;
      } else {
        const derivation = deriveKeyEncryptionKey(pwdToVerify);
        derivedKey = derivation.key;
      }

      // 2. Retrieve master enclave token
      const masterToken = await getMasterEnclaveToken();

      if (masterToken) {
        // Re-arm biometric secret in case it was purged
        await storeBiometricSecret(masterToken);
      }

      // 3. Cache derived key in active session and reload items from SQLite
      VaultSessionManager.unlock(derivedKey, masterToken ?? undefined);
      await useVaultStore.getState().loadItems(derivedKey);

      setIsUnlocked(true);
      setIsAuthenticating(false);
      optionsRef.current?.onUnlockSuccess?.();
      return true;
    } catch (err) {
      setError(`Master password verification failed: ${(err as Error).message}`);
      setIsAuthenticating(false);
      return false;
    }
  }, [password]);

  /**
   * Check hardware on mount and trigger prompt at most once if enabled
   */
  useEffect(() => {
    let isMounted = true;

    async function init() {
      const status = await checkStatus();
      if (!isMounted) return;

      if (
        !hasAutoPromptedRef.current &&
        optionsRef.current?.autoPromptBiometrics !== false &&
        status?.hasHardware &&
        status?.isEnrolled
      ) {
        hasAutoPromptedRef.current = true;
        await triggerBiometricUnlock();
      }
    }

    init();

    return () => {
      isMounted = false;
      // Dismiss any pending native prompt on unmount to prevent leaking to homescreen
      cancelBiometric().catch(() => {});
    };
  }, [checkStatus, triggerBiometricUnlock]);

  return {
    hardwareStatus,
    isBiometricAvailable,
    biometricLabel,
    isAuthenticating,
    isUnlocked,
    error,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    usePasswordFallback,
    setUsePasswordFallback,
    triggerBiometricUnlock,
    unlockWithMasterPassword,
  };
}
