/**
 * VaultNote Platform Enclave & Storage Types
 * Phase 1: Cryptographic Perimeter
 */

export interface EnclaveOptions {
  /**
   * iOS Keychain accessibility setting.
   * By default, WHEN_UNLOCKED_THIS_DEVICE_ONLY prevents data from migrating to iCloud Keychain or other devices.
   */
  keychainAccessible?: 'when_unlocked_this_device_only' | 'after_first_unlock_this_device_only';
  /**
   * If true, requires biometric authentication (Face ID / Touch ID / Fingerprint) to read the value.
   */
  requireAuthentication?: boolean;
}

export interface EnclaveStorageAdapter {
  isAvailable(): Promise<boolean>;
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string, options?: EnclaveOptions): Promise<void>;
  deleteItem(key: string): Promise<void>;
  clearAll(): Promise<void>;
}

export class EnclaveStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnclaveStorageError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
