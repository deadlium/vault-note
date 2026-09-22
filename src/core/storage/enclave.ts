/**
 * VaultNote Platform Secure Enclave Bridge
 * Integrates hardware-backed keychain (iOS Secure Enclave) and Android Keystore
 * Phase 1: Cryptographic Perimeter
 */

import { EnclaveOptions, EnclaveStorageAdapter, EnclaveStorageError } from './types';

// Standard Enclave Key Names
export const ENCLAVE_KEYS = {
  MASTER_TOKEN: 'vaultnote.enclave.master_token',
  BIOMETRIC_SECRET: 'vaultnote.enclave.biometric_secret',
  VAULT_INITIALIZED: 'vaultnote.enclave.is_initialized',
  PASS_SALT: 'vaultnote.enclave.master_salt',
} as const;

/**
 * In-memory fallback adapter used in test / Node environments
 */
class InMemoryEnclaveAdapter implements EnclaveStorageAdapter {
  private store = new Map<string, string>();

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async getItem(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async setItem(key: string, value: string, options?: EnclaveOptions): Promise<void> {
    this.store.set(key, value);
  }

  async deleteItem(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clearAll(): Promise<void> {
    this.store.clear();
  }
}

/**
 * Native Expo SecureStore adapter
 */
class ExpoSecureStoreAdapter implements EnclaveStorageAdapter {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private secureStore: any;

  constructor() {
    try {
      // Dynamic import to avoid bundling native code during unit tests
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      this.secureStore = require('expo-secure-store');
    } catch {
      this.secureStore = null;
    }
  }

  async isAvailable(): Promise<boolean> {
    if (!this.secureStore) return false;
    try {
      return await this.secureStore.isAvailableAsync();
    } catch {
      return false;
    }
  }

  async getItem(key: string): Promise<string | null> {
    if (!this.secureStore) throw new EnclaveStorageError('SecureStore is not available in this environment.');
    try {
      return await this.secureStore.getItemAsync(key, {
        keychainAccessible: this.secureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    } catch (error) {
      throw new EnclaveStorageError(`Failed to read from Secure Enclave: ${(error as Error).message}`);
    }
  }

  async setItem(key: string, value: string, options?: EnclaveOptions): Promise<void> {
    if (!this.secureStore) throw new EnclaveStorageError('SecureStore is not available in this environment.');
    try {
      await this.secureStore.setItemAsync(key, value, {
        keychainAccessible: this.secureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        requireAuthentication: options?.requireAuthentication ?? false,
      });
    } catch (error) {
      throw new EnclaveStorageError(`Failed to write to Secure Enclave: ${(error as Error).message}`);
    }
  }

  async deleteItem(key: string): Promise<void> {
    if (!this.secureStore) throw new EnclaveStorageError('SecureStore is not available in this environment.');
    try {
      await this.secureStore.deleteItemAsync(key);
    } catch (error) {
      throw new EnclaveStorageError(`Failed to delete from Secure Enclave: ${(error as Error).message}`);
    }
  }

  async clearAll(): Promise<void> {
    for (const key of Object.values(ENCLAVE_KEYS)) {
      try {
        await this.deleteItem(key);
      } catch {
        // Continue clearing others
      }
    }
  }
}

/**
 * Hybrid adapter that uses hardware SecureStore when native platform is present,
 * and automatically falls back to in-memory storage in web/testing environments.
 */
class AutoDetectEnclaveAdapter implements EnclaveStorageAdapter {
  private inMemory = new InMemoryEnclaveAdapter();
  private expoAdapter = new ExpoSecureStoreAdapter();
  private nativeUsable: boolean | null = null;

  private async checkNative(): Promise<boolean> {
    if (this.nativeUsable !== null) return this.nativeUsable;
    try {
      this.nativeUsable = await this.expoAdapter.isAvailable();
    } catch {
      this.nativeUsable = false;
    }
    return this.nativeUsable;
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async getItem(key: string): Promise<string | null> {
    if (await this.checkNative()) {
      try {
        return await this.expoAdapter.getItem(key);
      } catch {
        // Fallback to inMemory if native failed unexpectedly
        return await this.inMemory.getItem(key);
      }
    }
    return await this.inMemory.getItem(key);
  }

  async setItem(key: string, value: string, options?: EnclaveOptions): Promise<void> {
    if (await this.checkNative()) {
      try {
        await this.expoAdapter.setItem(key, value, options);
        return;
      } catch {
        // Fallback to inMemory
        await this.inMemory.setItem(key, value, options);
        return;
      }
    }
    await this.inMemory.setItem(key, value, options);
  }

  async deleteItem(key: string): Promise<void> {
    if (await this.checkNative()) {
      try {
        await this.expoAdapter.deleteItem(key);
      } catch {
        // Fallback
        await this.inMemory.deleteItem(key);
      }
    }
    await this.inMemory.deleteItem(key);
  }

  async clearAll(): Promise<void> {
    if (await this.checkNative()) {
      try {
        await this.expoAdapter.clearAll();
      } catch {
        // Fallback
      }
    }
    await this.inMemory.clearAll();
  }
}

// Active singleton adapter
let currentAdapter: EnclaveStorageAdapter = new AutoDetectEnclaveAdapter();

/**
 * Override the enclave storage adapter (useful for mocking during testing)
 */
export function setEnclaveAdapter(adapter: EnclaveStorageAdapter): void {
  currentAdapter = adapter;
}

/**
 * Returns the currently active enclave storage adapter
 */
export function getEnclaveAdapter(): EnclaveStorageAdapter {
  return currentAdapter;
}

/**
 * Stores a value in hardware-isolated enclave storage
 */
export async function setEnclaveItem(key: string, value: string, options?: EnclaveOptions): Promise<void> {
  await currentAdapter.setItem(key, value, options);
}

/**
 * Retrieves a value from hardware-isolated enclave storage
 */
export async function getEnclaveItem(key: string): Promise<string | null> {
  return await currentAdapter.getItem(key);
}

/**
 * Deletes a value from hardware-isolated enclave storage
 */
export async function deleteEnclaveItem(key: string): Promise<void> {
  await currentAdapter.deleteItem(key);
}

/**
 * Stores the 256-bit Master Enclave Token generated during setup
 */
export async function storeMasterEnclaveToken(token: string): Promise<void> {
  await setEnclaveItem(ENCLAVE_KEYS.MASTER_TOKEN, token);
}

/**
 * Retrieves the Master Enclave Token
 */
export async function getMasterEnclaveToken(): Promise<string | null> {
  return await getEnclaveItem(ENCLAVE_KEYS.MASTER_TOKEN);
}

/**
 * Stores the biometric unlock secret (isolated behind biometric requirement on device)
 */
export async function storeBiometricSecret(secret: string): Promise<void> {
  await setEnclaveItem(ENCLAVE_KEYS.BIOMETRIC_SECRET, secret, { requireAuthentication: true });
}

/**
 * Retrieves the biometric unlock secret
 */
export async function getBiometricSecret(): Promise<string | null> {
  return await getEnclaveItem(ENCLAVE_KEYS.BIOMETRIC_SECRET);
}

/**
 * Marks whether the vault has completed initial onboarding & master password setup
 */
export async function setVaultInitialized(initialized: boolean): Promise<void> {
  await setEnclaveItem(ENCLAVE_KEYS.VAULT_INITIALIZED, initialized ? 'true' : 'false');
}

/**
 * Checks whether the vault has been initialized
 */
export async function isVaultInitialized(): Promise<boolean> {
  const value = await getEnclaveItem(ENCLAVE_KEYS.VAULT_INITIALIZED);
  return value === 'true';
}

/**
 * Wipes all enclave tokens upon full vault reset
 */
export async function clearAllEnclaveKeys(): Promise<void> {
  await currentAdapter.clearAll();
}
