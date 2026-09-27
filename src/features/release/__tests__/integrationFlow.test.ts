/**
 * VaultNote Complete End-to-End Integration Flow Test Suite
 * Validates the full user journey:
 * Setup -> Key Derivation -> Item Creation -> 2FA Attachment ->
 * RAM Search -> Security Audit -> Encrypted Backup -> Restore Reconciliation -> Vault Lock.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { deriveKeyArgon2id } from '../../../core/crypto/kdf';
import { generateRecoveryPhrase, validateRecoveryPhrase } from '../../../core/crypto/bip39';
import { VaultSessionManager, useSessionStore } from '../../../core/session';
import { useVaultStore } from '../../vault/store/useVaultStore';
import { SearchIndex } from '../../search/searchIndex';
import { generateTOTPToken } from '../../totp/totpEngine';
import {
  createEncryptedBackup,
  decryptAndVerifyBackup,
  mergeVaultItems,
} from '../../backup/backupEngine';
import { performSecurityAudit } from '../../security-center/auditEngine';
import {
  VaultItem,
  LoginPayload,
  SecureNotePayload,
  TOTPPayload,
  CardPayload,
} from '../../../types/vault';

const FAST_KDF_CONFIG = {
  memory: 2048,
  iterations: 2,
};

describe('Complete Vault Lifecycle Integration Pipeline', () => {
  it('executes full end-to-end security journey without data loss or plaintext leakage', async () => {
    // 1. Initial Setup: Generate 24-word BIP-39 mnemonic recovery phrase
    const mnemonic = generateRecoveryPhrase(256);
    assert.strictEqual(mnemonic.length, 24);
    assert.strictEqual(validateRecoveryPhrase(mnemonic), true, 'Mnemonic must be valid BIP-39');

    // 2. Derive Master Key from user passphrase using Argon2id
    const masterPassphrase = 'SupremeMasterPassphrase!2026';
    const derived = deriveKeyArgon2id(masterPassphrase, undefined, {
      m: FAST_KDF_CONFIG.memory,
      t: FAST_KDF_CONFIG.iterations,
      p: 1,
      dkLen: 32,
    });
    assert.strictEqual(derived.key.length, 32, 'Derived key must be 256 bits');

    // 3. Unlock Vault Session
    VaultSessionManager.unlock(derived.key);
    assert.strictEqual(useSessionStore.getState().status, 'UNLOCKED');
    assert.ok(VaultSessionManager.getMasterKey() !== null);

    // 4. Create Multi-Category Items
    const now = Date.now();
    const loginItem: VaultItem<LoginPayload> = {
      id: 'e2e_login_001',
      type: 'LOGIN',
      title: 'Amazon Web Services AWS',
      tags: ['cloud', 'infrastructure'],
      isFavorite: true,
      createdAt: now,
      updatedAt: now,
      payload: {
        username: 'devops-lead@company.com',
        password: 'ComplexPassword!2026',
        websiteUrl: 'https://aws.amazon.com',
        totpSecret: 'JBSWY3DPEHPK3PXP',
      },
    };

    const noteItem: VaultItem<SecureNotePayload> = {
      id: 'e2e_note_001',
      type: 'SECURE_NOTE',
      title: 'Datacenter Access Codes',
      tags: ['operations'],
      isFavorite: false,
      createdAt: now,
      updatedAt: now,
      payload: {
        content: 'Rack 42 Pin: 9812-4412. Vault biometric failover key.',
      },
    };

    const totpItem: VaultItem<TOTPPayload> = {
      id: 'e2e_totp_001',
      type: 'TOTP',
      title: 'GitHub 2FA',
      tags: ['dev'],
      isFavorite: true,
      createdAt: now,
      updatedAt: now,
      payload: {
        issuer: 'GitHub',
        accountName: 'lead-architect',
        secret: 'MFRGGZDFMZTWQ2LK',
        digits: 6,
        period: 30,
        algorithm: 'SHA1',
      },
    };

    const cardItem: VaultItem<CardPayload> = {
      id: 'e2e_card_001',
      type: 'CARD',
      title: 'Corporate Expense Card',
      tags: ['finance'],
      isFavorite: false,
      createdAt: now,
      updatedAt: now,
      payload: {
        cardholderName: 'Lead Architect',
        cardNumber: '4532 1122 3344 5566',
        expirationMonth: '09',
        expirationYear: '2029',
        cvv: '992',
        cardType: 'visa',
      },
    };

    await useVaultStore.getState().addItem(loginItem);
    await useVaultStore.getState().addItem(noteItem);
    await useVaultStore.getState().addItem(totpItem);
    await useVaultStore.getState().addItem(cardItem);

    // 5. Ephemeral RAM Search Index Verification
    SearchIndex.clear();
    SearchIndex.buildIndex([loginItem, noteItem, totpItem, cardItem]);

    const awsSearch = SearchIndex.query('AWS');
    assert.ok(awsSearch.length >= 1);
    assert.strictEqual(awsSearch[0].entry.id, 'e2e_login_001');

    const noteSearch = SearchIndex.query('Datacenter');
    assert.ok(noteSearch.length >= 1);
    assert.strictEqual(noteSearch[0].entry.id, 'e2e_note_001');

    // 6. Offline TOTP Generation Verification
    const generatedOtp = generateTOTPToken('MFRGGZDFMZTWQ2LK', {
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
    });
    assert.strictEqual(generatedOtp.code.length, 6);
    assert.strictEqual(/^[0-9]{6}$/.test(generatedOtp.code), true);

    // 7. Security Center Audit
    const audit = performSecurityAudit([loginItem, noteItem, totpItem, cardItem], {
      autoLockTimeout: '5m',
    });
    assert.ok(audit.overallScore >= 0 && audit.overallScore <= 100);
    assert.strictEqual(audit.totpCoverage.credentialsWith2FA, 1);
    assert.strictEqual(audit.totpCoverage.standaloneTOTPCount, 1);

    // 8. Encrypted Backup Export
    const backupPassphrase = 'BackupEncryptionPassphrase!77';
    const backupString = await createEncryptedBackup(
      [loginItem, noteItem, totpItem, cardItem],
      backupPassphrase,
      FAST_KDF_CONFIG
    );

    assert.ok(backupString.length > 0);
    assert.strictEqual(backupString.includes('ComplexPassword!2026'), false);
    assert.strictEqual(backupString.includes('MFRGGZDFMZTWQ2LK'), false);
    assert.strictEqual(backupString.includes('4532 1122 3344 5566'), false);

    // 9. Backup Verification & Restore
    const restoredPayload = await decryptAndVerifyBackup(backupString, backupPassphrase);
    assert.strictEqual(restoredPayload.items.length, 4);

    // 10. Reconciliation Merge
    const existingCollection = [loginItem];
    const { mergedItems, summary } = mergeVaultItems(existingCollection, restoredPayload.items, 'merge');
    assert.strictEqual(mergedItems.length, 4);
    assert.strictEqual(summary.totalRestored, 3); // 3 new items added

    // 11. Complete Vault Lock: Wipe in-memory session credentials
    SearchIndex.clear();
    VaultSessionManager.lock();
    assert.strictEqual(useSessionStore.getState().status, 'LOCKED');
    assert.strictEqual(VaultSessionManager.getMasterKey(), null);
    assert.strictEqual(SearchIndex.getAllEntries().length, 0);
  });
});
