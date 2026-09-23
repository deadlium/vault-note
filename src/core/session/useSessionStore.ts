/**
 * VaultSession Zustand Store
 * Centralized reactive state machine for authentication & session lifecycle
 */

import { create } from 'zustand';
import { secureWipe } from '../crypto/csprng';
import { VaultSessionState, VaultSessionStatus, AutoLockTimeout } from './types';

export const useSessionStore = create<VaultSessionState>((set, get) => ({
  status: 'UNINITIALIZED',
  masterKey: null,
  sessionToken: null,
  lastActiveTimestamp: Date.now(),
  lastBackgroundTimestamp: null,
  autoLockTimeout: '5m',
  isPrivacyShieldActive: false,

  setStatus: (status: VaultSessionStatus) => {
    set({ status });
  },

  setKeys: (keys) => {
    set((state) => ({
      masterKey: keys.masterKey !== undefined ? keys.masterKey : state.masterKey,
      sessionToken: keys.sessionToken !== undefined ? keys.sessionToken : state.sessionToken,
    }));
  },

  recordActivity: (timestamp?: number) => {
    set({ lastActiveTimestamp: timestamp ?? Date.now() });
  },

  recordBackground: (timestamp?: number) => {
    set({ lastBackgroundTimestamp: timestamp ?? Date.now() });
  },

  setAutoLockTimeout: (timeout: AutoLockTimeout) => {
    set({ autoLockTimeout: timeout });
  },

  setPrivacyShieldActive: (active: boolean) => {
    set({ isPrivacyShieldActive: active });
  },

  lock: () => {
    const currentKey = get().masterKey;
    if (currentKey) {
      secureWipe(currentKey);
    }

    set({
      status: 'LOCKED',
      masterKey: null,
      sessionToken: null,
      lastBackgroundTimestamp: null,
    });
  },

  unlock: (masterKey?: Uint8Array, sessionToken?: string) => {
    set({
      status: 'UNLOCKED',
      masterKey: masterKey ?? null,
      sessionToken: sessionToken ?? null,
      lastActiveTimestamp: Date.now(),
      lastBackgroundTimestamp: null,
    });
  },

  resetSession: () => {
    const currentKey = get().masterKey;
    if (currentKey) {
      secureWipe(currentKey);
    }

    set({
      status: 'UNINITIALIZED',
      masterKey: null,
      sessionToken: null,
      lastActiveTimestamp: Date.now(),
      lastBackgroundTimestamp: null,
      isPrivacyShieldActive: false,
    });
  },
}));
