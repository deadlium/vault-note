/**
 * Vault Persistence Across App Restarts Test Suite
 * Validates that items persisted during an active session remain in SQLite
 * and are successfully reloaded after a full restart and unlock lifecycle.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { deriveKeyArgon2id } from '../../../core/crypto/kdf';
import { bytesToHex, hexToBytes, generateMasterEnclaveToken } from '../../../core/crypto/csprng';
import {
  storeMasterEnclaveToken,
  storeBiometricSecret,
  getBiometricSecret,
  setVaultInitialized,
  setEnclaveItem,
  clearAllEnclaveKeys,
  ENCLAVE_KEYS,
} from '../../../core/storage/enclave';
import { getDatabaseClient } from '../../../core/database/connection';
import { runMigrations } from '../../../core/database/migrations';
import { VaultSessionManager, useSessionStore } from '../../../core/session';
import { useVaultStore } from '../../vault/store/useVaultStore';
import { VaultRepository } from '../../vault/repository/vaultRepository';
import { VaultItem, LoginPayload } from '../../../types/vault';

const FAST_KDF_CONFIG = {
  memory: 2048,
  iterations: 2,
};

describe('Vault Persistence Across App Restarts', () => {
  beforeEach(async () => {
    // Clean memory and storage state
    VaultSessionManager.reset();
    useVaultStore.setState({ items: [], isLoading: false, error: null });
    await clearAllEnclaveKeys();

    const db = await getDatabaseClient();
    await runMigrations(db);
    await db.execAsync('DELETE FROM vault_tags;');
    await db.execAsync('DELETE FROM vault_items;');
  });

  it('persists newly created items to SQLite and reloads them after restart and biometric unlock', async () => {
    const password = 'UltraSecurePassphrase!2026';

    // --- PHASE 1: Master Password Onboarding ---
    const derivation = deriveKeyArgon2id(password, undefined, {
      m: FAST_KDF_CONFIG.memory,
      t: FAST_KDF_CONFIG.iterations,
      p: 1,
      dkLen: 32,
    });
    const enclaveToken = bytesToHex(generateMasterEnclaveToken());

    // Keep an immutable copy of original key bytes to verify against post-lock recovery
    const originalKeyCopy = new Uint8Array(derivation.key);

    // Hardware enclave storage
    await storeMasterEnclaveToken(enclaveToken);
    await storeBiometricSecret(bytesToHex(derivation.key));
    await setEnclaveItem(ENCLAVE_KEYS.PASS_SALT, derivation.saltHex);
    await setVaultInitialized(true);

    // Session unlock with active key
    VaultSessionManager.unlock(derivation.key, enclaveToken);
    await useVaultStore.getState().loadItems(derivation.key);

    assert.strictEqual(useSessionStore.getState().status, 'UNLOCKED');
    assert.deepStrictEqual(VaultSessionManager.getMasterKey(), derivation.key);

    // --- PHASE 2: User Adds Item during active session ---
    const timestamp = Date.now();
    const sampleItem: VaultItem<LoginPayload> = {
      id: 'item_persistent_101',
      type: 'LOGIN',
      title: 'Personal Bank Account',
      isProtected: true,
      isFavorite: true,
      tags: ['banking', 'critical'],
      icon: 'bank',
      payload: {
        username: 'secure.user@bank.internal',
        password: 'SampleSensitivePassword!99',
        websiteUrl: 'https://bank.internal',
        notes: 'Checking account primary login',
      },
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    // Add item without passing key explicitly (simulating VaultItemEditScreen)
    await useVaultStore.getState().addItem(sampleItem);

    // Item must appear in active Zustand store
    const storeItems = useVaultStore.getState().items;
    assert.strictEqual(storeItems.length, 1);
    assert.strictEqual(storeItems[0].id, 'item_persistent_101');

    // Item must exist encrypted in SQLite
    const rawRow = await VaultRepository.getRawDatabaseRow('item_persistent_101');
    assert.notStrictEqual(rawRow, null);
    assert.strictEqual(rawRow!.id, 'item_persistent_101');
    assert.strictEqual(rawRow!.title_enc.includes('Personal Bank Account'), false);

    // --- PHASE 3: Complete App Shutdown Simulation ---
    // Zeroize memory and clear all RAM state
    VaultSessionManager.lock();
    useVaultStore.setState({ items: [], isLoading: false, error: null });

    assert.strictEqual(VaultSessionManager.getStatus(), 'LOCKED');
    assert.strictEqual(VaultSessionManager.getMasterKey(), null);
    assert.strictEqual(useVaultStore.getState().items.length, 0);

    // --- PHASE 4: App Restart and Biometric Unlock ---
    const bioSecretHex = await getBiometricSecret();
    assert.notStrictEqual(bioSecretHex, null);

    const recoveredKey = hexToBytes(bioSecretHex!);
    assert.deepStrictEqual(recoveredKey, originalKeyCopy);

    // Unlock session with recovered key and reload items
    VaultSessionManager.unlock(recoveredKey, enclaveToken);
    await useVaultStore.getState().loadItems(recoveredKey);

    // Simulate App.tsx callback invocation
    VaultSessionManager.unlock();

    // Verify key remains intact and item is restored
    assert.strictEqual(VaultSessionManager.getStatus(), 'UNLOCKED');
    assert.deepStrictEqual(VaultSessionManager.getMasterKey(), originalKeyCopy);

    const reloadedItems = useVaultStore.getState().items;
    assert.strictEqual(reloadedItems.length, 1);
    assert.strictEqual(reloadedItems[0].id, 'item_persistent_101');
    assert.strictEqual(reloadedItems[0].title, 'Personal Bank Account');
    assert.strictEqual(
      (reloadedItems[0].payload as LoginPayload).username,
      'secure.user@bank.internal'
    );
    assert.strictEqual(
      (reloadedItems[0].payload as LoginPayload).password,
      'SampleSensitivePassword!99'
    );
  });

  it('persists newly created items to SQLite and reloads them after restart and password unlock', async () => {
    const password = 'SecondSecurePassword#2026';

    const derivation = deriveKeyArgon2id(password, undefined, {
      m: FAST_KDF_CONFIG.memory,
      t: FAST_KDF_CONFIG.iterations,
      p: 1,
      dkLen: 32,
    });
    const enclaveToken = bytesToHex(generateMasterEnclaveToken());
    const originalKeyCopy2 = new Uint8Array(derivation.key);

    await storeMasterEnclaveToken(enclaveToken);
    await storeBiometricSecret(bytesToHex(derivation.key));
    await setEnclaveItem(ENCLAVE_KEYS.PASS_SALT, derivation.saltHex);
    await setVaultInitialized(true);

    VaultSessionManager.unlock(derivation.key, enclaveToken);
    await useVaultStore.getState().loadItems(derivation.key);

    const sampleItem: VaultItem<LoginPayload> = {
      id: 'item_persistent_202',
      type: 'LOGIN',
      title: 'Cloud Console Root',
      isProtected: true,
      isFavorite: false,
      tags: ['cloud', 'root'],
      payload: {
        username: 'root@cloud.internal',
        password: 'RootConsolePassword$123',
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await useVaultStore.getState().addItem(sampleItem);
    assert.strictEqual(useVaultStore.getState().items.length, 1);

    // Simulate app shutdown
    VaultSessionManager.lock();
    useVaultStore.setState({ items: [] });
    assert.strictEqual(useVaultStore.getState().items.length, 0);
    assert.strictEqual(VaultSessionManager.getMasterKey(), null);

    // Simulate password verification on restart
    const salt = await getBiometricSecret(); // just checking enclave access
    assert.ok(salt !== null);

    const reDerivation = deriveKeyArgon2id(password, derivation.saltHex, {
      m: FAST_KDF_CONFIG.memory,
      t: FAST_KDF_CONFIG.iterations,
      p: 1,
      dkLen: 32,
    });
    assert.deepStrictEqual(reDerivation.key, originalKeyCopy2);

    // Re-arm biometric secret and unlock session
    await storeBiometricSecret(bytesToHex(reDerivation.key));
    VaultSessionManager.unlock(reDerivation.key, enclaveToken);
    await useVaultStore.getState().loadItems(reDerivation.key);

    // Simulate App.tsx parameterless unlock invocation
    VaultSessionManager.unlock();

    assert.strictEqual(VaultSessionManager.getStatus(), 'UNLOCKED');
    assert.deepStrictEqual(VaultSessionManager.getMasterKey(), originalKeyCopy2);

    const itemsAfterPasswordUnlock = useVaultStore.getState().items;
    assert.strictEqual(itemsAfterPasswordUnlock.length, 1);
    assert.strictEqual(itemsAfterPasswordUnlock[0].id, 'item_persistent_202');
    assert.strictEqual(itemsAfterPasswordUnlock[0].title, 'Cloud Console Root');
    assert.strictEqual(
      (itemsAfterPasswordUnlock[0].payload as LoginPayload).password,
      'RootConsolePassword$123'
    );
  });
});
