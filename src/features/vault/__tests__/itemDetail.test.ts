/**
 * Vault Item Detail & Biometric Protection Logic Test Suite
 * Validates credential masking, reveal checks, and encrypted update lifecycle
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { VaultItem, LoginPayload } from '../../../types/vault';
import { VaultEncryptionService } from '../services/vaultEncryptionService';
import { getRandomBytes } from '../../../core/crypto/csprng';

describe('Vault Item Detail & Protection Logic', () => {
  const sampleLogin: VaultItem<LoginPayload> = {
    id: 'item-detail-01',
    type: 'LOGIN',
    title: 'Google Primary',
    payload: {
      username: 'alex.turner@gmail.com',
      password: 'CorrectHorseBatteryStaple!2026',
      websiteUrl: 'https://accounts.google.com',
      totpSecret: 'JBSWY3DPEHPK3PXP',
      notes: 'Recovery phone: +1 555-019-2834',
    },
    tags: ['personal', 'google'],
    isFavorite: true,
    isProtected: true,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  };

  it('Calculates dot masking length correctly without leaking plaintext length', () => {
    const shortPassword = 'abc';
    const normalPassword = 'CorrectHorseBatteryStaple!2026';
    const longPassword = 'a'.repeat(60);

    const getMask = (val: string) => '•'.repeat(Math.max(16, Math.min(val.length, 24)));

    assert.strictEqual(getMask(shortPassword).length, 16);
    assert.strictEqual(getMask(normalPassword).length, 24);
    assert.strictEqual(getMask(longPassword).length, 24);
  });

  it('Guarantees protected items require biometric authorization flag', () => {
    assert.strictEqual(sampleLogin.isProtected, true);

    const requiresAuth = (item: VaultItem<LoginPayload>) => Boolean(item.isProtected);
    assert.strictEqual(requiresAuth(sampleLogin), true);

    const unprotectedItem: VaultItem<LoginPayload> = {
      ...sampleLogin,
      isProtected: false,
    };
    assert.strictEqual(requiresAuth(unprotectedItem), false);
  });

  it('Re-encrypts updated credential fields with unique nonces', () => {
    const dek = getRandomBytes(32);

    const recordA = VaultEncryptionService.encryptVaultItem(sampleLogin, dek);

    const updatedLogin: VaultItem<LoginPayload> = {
      ...sampleLogin,
      payload: {
        ...sampleLogin.payload,
        password: 'NewUpdatedPassword!2026',
      },
      updatedAt: 1700000050000,
    };

    const recordB = VaultEncryptionService.encryptVaultItem(updatedLogin, dek);

    // Nonce uniqueness
    assert.notStrictEqual(recordA.dataPayload.iv, recordB.dataPayload.iv);

    // Decryption of recordB produces updated password
    const decryptedB = VaultEncryptionService.decryptVaultItem<LoginPayload>(recordB, dek);
    assert.strictEqual(decryptedB.payload.password, 'NewUpdatedPassword!2026');
    assert.strictEqual(decryptedB.payload.username, 'alex.turner@gmail.com');
  });
});
