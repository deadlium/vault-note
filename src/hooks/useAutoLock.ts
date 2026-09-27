/**
 * useAutoLock Hook
 * Monitors AppState changes and foreground inactivity to automatically enforce vault locking
 */

import { useEffect, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { VaultSessionManager } from '../core/session/VaultSessionManager';
import { useSessionStore } from '../core/session/useSessionStore';
import { AutoLockTimeout } from '../core/session/types';

export function useAutoLock() {
  const status = useSessionStore((s) => s.status);
  const autoLockTimeout = useSessionStore((s) => s.autoLockTimeout);

  const recordActivity = useCallback(() => {
    VaultSessionManager.recordActivity();
  }, []);

  const setAutoLockTimeout = useCallback((timeout: AutoLockTimeout) => {
    VaultSessionManager.setAutoLockTimeout(timeout);
  }, []);

  // AppState listener for background / app-switcher transitions
  useEffect(() => {
    const handleAppState = (nextAppState: AppStateStatus) => {
      VaultSessionManager.handleAppStateChange(nextAppState);
    };

    const subscription = AppState.addEventListener('change', handleAppState);

    return () => {
      subscription.remove();
    };
  }, []);

  // Periodic foreground inactivity timer
  useEffect(() => {
    if (status !== 'UNLOCKED') {
      return;
    }

    const intervalId = setInterval(() => {
      VaultSessionManager.checkInactivity();
    }, 5000);

    return () => {
      clearInterval(intervalId);
    };
  }, [status, autoLockTimeout]);

  return {
    status,
    autoLockTimeout,
    recordActivity,
    setAutoLockTimeout,
    lockVault: VaultSessionManager.lock,
  };
}
