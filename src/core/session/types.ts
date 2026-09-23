/**
 * VaultSession Types & Finite State Machine Definitions
 * Core Architecture: Session & Cryptographic Memory Lifetime
 */

export type VaultSessionStatus =
  | 'UNINITIALIZED' // Vault has not been provisioned with a master password
  | 'LOCKED'        // Vault is initialized but locked; cryptographic keys wiped from memory
  | 'UNLOCKING'     // Authentication in progress (biometric or master password)
  | 'UNLOCKED'      // Vault unlocked; keys active in volatile memory
  | 'BACKGROUND';   // App transitioned to background; auto-lock timer running

export type AutoLockTimeout = 'immediate' | '1m' | '5m' | '15m' | 'never';

export const AUTO_LOCK_TIMEOUT_MS: Record<AutoLockTimeout, number> = {
  immediate: 0,
  '1m': 60 * 1000,
  '5m': 5 * 60 * 1000,
  '15m': 15 * 60 * 1000,
  never: -1,
};

export interface SessionMemoryKeys {
  /**
   * Volatile Key Encryption Key (KEK) or Data Encryption Key (DEK).
   * Kept strictly in memory while UNLOCKED, zeroized on lock.
   */
  masterKey: Uint8Array | null;

  /**
   * Volatile Master Enclave Token or session authorization token.
   */
  sessionToken: string | null;
}

export interface VaultSessionState extends SessionMemoryKeys {
  status: VaultSessionStatus;
  lastActiveTimestamp: number;
  lastBackgroundTimestamp: number | null;
  autoLockTimeout: AutoLockTimeout;
  isPrivacyShieldActive: boolean;

  // Actions
  setStatus: (status: VaultSessionStatus) => void;
  setKeys: (keys: Partial<SessionMemoryKeys>) => void;
  recordActivity: (timestamp?: number) => void;
  recordBackground: (timestamp?: number) => void;
  setAutoLockTimeout: (timeout: AutoLockTimeout) => void;
  setPrivacyShieldActive: (active: boolean) => void;
  lock: () => void;
  unlock: (masterKey?: Uint8Array, sessionToken?: string) => void;
  resetSession: () => void;
}
