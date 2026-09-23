/**
 * VaultSessionManager Service
 * Coordinates finite state transitions, inactivity timeouts, and cryptographic zeroization
 */

import { isVaultInitialized } from '../storage/enclave';
import { useSessionStore } from './useSessionStore';
import {
  VaultSessionStatus,
  AutoLockTimeout,
  AUTO_LOCK_TIMEOUT_MS,
} from './types';

export class VaultSessionManager {
  /**
   * Initializes the session status based on persistent hardware enclave state.
   */
  static async initializeSession(): Promise<VaultSessionStatus> {
    try {
      const initialized = await isVaultInitialized();
      const initialStatus: VaultSessionStatus = initialized ? 'LOCKED' : 'UNINITIALIZED';
      useSessionStore.getState().setStatus(initialStatus);
      return initialStatus;
    } catch {
      useSessionStore.getState().setStatus('UNINITIALIZED');
      return 'UNINITIALIZED';
    }
  }

  /**
   * Returns the current session status.
   */
  static getStatus(): VaultSessionStatus {
    return useSessionStore.getState().status;
  }

  /**
   * Returns whether the vault is currently in the UNLOCKED state.
   */
  static isUnlocked(): boolean {
    return useSessionStore.getState().status === 'UNLOCKED';
  }

  /**
   * Returns whether the vault is currently locked or uninitialized.
   */
  static isLocked(): boolean {
    const status = useSessionStore.getState().status;
    return status === 'LOCKED' || status === 'UNINITIALIZED';
  }

  /**
   * Transitions the session into the UNLOCKING state.
   */
  static startUnlocking(): void {
    const current = useSessionStore.getState().status;
    if (current === 'LOCKED' || current === 'BACKGROUND') {
      useSessionStore.getState().setStatus('UNLOCKING');
    }
  }

  /**
   * Unlocks the vault, caching volatile keys in memory and updating activity timestamp.
   */
  static unlock(masterKey?: Uint8Array, sessionToken?: string): void {
    useSessionStore.getState().unlock(masterKey, sessionToken);
  }

  /**
   * Securely locks the vault, zeroizing volatile keys from memory.
   */
  static lock(): void {
    useSessionStore.getState().lock();
  }

  /**
   * Returns the volatile master key from memory (null if locked).
   */
  static getMasterKey(): Uint8Array | null {
    return useSessionStore.getState().masterKey;
  }

  /**
   * Returns the volatile session token (null if locked).
   */
  static getSessionToken(): string | null {
    return useSessionStore.getState().sessionToken;
  }

  /**
   * Records user interaction timestamp to prevent inactivity timeout while in foreground.
   */
  static recordActivity(timestamp?: number): void {
    useSessionStore.getState().recordActivity(timestamp);
  }

  /**
   * Configures the auto-lock duration policy.
   */
  static setAutoLockTimeout(timeout: AutoLockTimeout): void {
    useSessionStore.getState().setAutoLockTimeout(timeout);
  }

  /**
   * Returns the configured auto-lock duration policy.
   */
  static getAutoLockTimeout(): AutoLockTimeout {
    return useSessionStore.getState().autoLockTimeout;
  }

  /**
   * Checks for foreground or background inactivity expiration.
   * If expired, triggers an immediate lock and returns true.
   */
  static checkInactivity(now: number = Date.now()): boolean {
    const state = useSessionStore.getState();

    // Only active or background sessions can expire
    if (state.status !== 'UNLOCKED' && state.status !== 'BACKGROUND') {
      return false;
    }

    const timeoutPolicy = state.autoLockTimeout;
    const timeoutMs = AUTO_LOCK_TIMEOUT_MS[timeoutPolicy];

    // 'never' policy never auto-locks
    if (timeoutMs < 0) {
      return false;
    }

    // Immediate policy locks as soon as backgrounded
    if (timeoutMs === 0 && state.status === 'BACKGROUND') {
      this.lock();
      return true;
    }

    // For backgrounded session, check elapsed time since backgrounding
    if (state.status === 'BACKGROUND' && state.lastBackgroundTimestamp !== null) {
      const elapsedBackground = now - state.lastBackgroundTimestamp;
      if (elapsedBackground >= timeoutMs) {
        this.lock();
        return true;
      }
      return false;
    }

    // For foreground session, check elapsed time since last user activity
    const elapsedActive = now - state.lastActiveTimestamp;
    if (elapsedActive >= timeoutMs && timeoutMs > 0) {
      this.lock();
      return true;
    }

    return false;
  }

  /**
   * Handles OS AppState transitions (active, background, inactive).
   */
  static handleAppStateChange(nextAppState: string, now: number = Date.now()): void {
    const state = useSessionStore.getState();

    if (nextAppState === 'background' || nextAppState === 'inactive') {
      // 1. Activate Privacy Shield immediately on background / app switcher
      useSessionStore.getState().setPrivacyShieldActive(true);

      // 2. If unlocked, record background timestamp
      if (state.status === 'UNLOCKED') {
        useSessionStore.getState().recordBackground(now);

        if (state.autoLockTimeout === 'immediate') {
          this.lock();
        } else {
          useSessionStore.getState().setStatus('BACKGROUND');
        }
      }
    } else if (nextAppState === 'active') {
      // 1. Deactivate Privacy Shield on returning to foreground
      useSessionStore.getState().setPrivacyShieldActive(false);

      // 2. Check if background timeout has expired while away
      if (state.status === 'BACKGROUND') {
        const timeoutMs = AUTO_LOCK_TIMEOUT_MS[state.autoLockTimeout];
        const backgroundTime = state.lastBackgroundTimestamp ?? state.lastActiveTimestamp;
        const elapsed = now - backgroundTime;

        if (timeoutMs >= 0 && elapsed >= timeoutMs) {
          this.lock();
        } else {
          // Restore to UNLOCKED with updated activity timestamp
          useSessionStore.getState().setStatus('UNLOCKED');
          useSessionStore.getState().recordActivity(now);
        }
      }
    }
  }

  /**
   * Resets session to UNINITIALIZED state and clears keys.
   */
  static reset(): void {
    useSessionStore.getState().resetSession();
  }
}
