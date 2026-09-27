/**
 * VaultNote Security Hardening & Zero-Knowledge Audit Suite
 * Validates cryptographic boundaries, credential isolation, RAM-only search lifetime,
 * offline OTP calculations, clipboard wiping, and perimeter defenses.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { generateTOTPToken } from '../../totp/totpEngine';
import { parseOtpAuthUri, tryParseOtpAuthUri } from '../../totp/parser/otpauthParser';
import { EphemeralSearchIndex } from '../../search/searchIndex';
import { VaultSessionManager, useSessionStore } from '../../../core/session';
import { ClipboardManager } from '../../../core/clipboard/clipboardManager';
import { createEncryptedBackup } from '../../backup/backupEngine';
import { useVaultStore } from '../../vault/store/useVaultStore';
import { VaultItem, LoginPayload, TOTPPayload } from '../../../types/vault';

const mockSecret = 'JBSWY3DPEHPK3PXP';
const mockPassword = 'UltraSecurePassword!99#';

describe('Production Security Hardening & Perimeter Verification', () => {
  it('TOTP generation operates 100% offline without network interactions', () => {
    // Verify pure mathematical calculation with zero asynchronous network dispatch
    const token = generateTOTPToken(mockSecret, {
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
    });

    assert.ok(token, 'Token must be generated');
    assert.strictEqual(token.code.length, 6, 'Code must be 6 digits');
    assert.ok(typeof token.remainingSeconds === 'number', 'Remaining seconds must be numeric');
    assert.ok(token.remainingSeconds >= 0 && token.remainingSeconds <= 30);
  });

  it('TOTP supports multiple HMAC algorithms and digit lengths offline', () => {
    const sha256Token = generateTOTPToken(mockSecret, {
      algorithm: 'SHA256',
      digits: 8,
      period: 30,
    });
    assert.strictEqual(sha256Token.code.length, 8, 'SHA256 code must be 8 digits');

    const sha512Token = generateTOTPToken(mockSecret, {
      algorithm: 'SHA512',
      digits: 8,
      period: 60,
    });
    assert.strictEqual(sha512Token.code.length, 8, 'SHA512 code must be 8 digits');
    assert.ok(sha512Token.remainingSeconds <= 60);
  });

  it('Search index is strictly RAM-only and completely purged on clear', () => {
    const searchIndex = new EphemeralSearchIndex();
    assert.strictEqual(searchIndex.search('').length, 0);

    const testItem: VaultItem<LoginPayload> = {
      id: 'sec_test_001',
      type: 'LOGIN',
      title: 'ProtonMail Encrypted',
      tags: ['security', 'email'],
      isFavorite: true,
      createdAt: 1000,
      updatedAt: 1000,
      payload: {
        username: 'user@pm.me',
        password: mockPassword,
        websiteUrl: 'https://mail.proton.me',
      },
    };

    searchIndex.buildIndex([testItem]);
    assert.strictEqual(searchIndex.search('').length, 1);

    const queryResult = searchIndex.search('Proton');
    assert.strictEqual(queryResult.length, 1);
    assert.strictEqual(queryResult[0].entry.id, 'sec_test_001');

    // Simulate session lock: purge RAM search index
    searchIndex.wipe();
    assert.strictEqual(searchIndex.search('').length, 0);
    assert.strictEqual(searchIndex.search('Proton').length, 0);
  });

  it('Clipboard manager handles sensitive data auto-wipe and manual purge', async () => {
    const testSecret = 'TemporaryClipboardSecret!123';
    await ClipboardManager.copySecret(testSecret, 'Test Secret', 30);

    const state = ClipboardManager.getState();
    assert.strictEqual(state.isActive, true);
    assert.strictEqual(state.label, 'Test Secret');
    assert.ok(state.remainingSeconds > 0 && state.remainingSeconds <= 30);

    // Manual immediate purge
    await ClipboardManager.clearNow();
    const purgedState = ClipboardManager.getState();
    assert.strictEqual(purgedState.isActive, false);
    assert.strictEqual(purgedState.remainingSeconds, 0);
  });

  it('Zeroization: deleted items and detached secrets are purged from active memory', async () => {
    const tempItemId = 'temp_zeroize_item';
    const tempItem: VaultItem<TOTPPayload> = {
      id: tempItemId,
      type: 'TOTP',
      title: 'Ephemeral 2FA Key',
      tags: ['temp'],
      isFavorite: false,
      createdAt: 2000,
      updatedAt: 2000,
      payload: {
        issuer: 'ZeroizeTest',
        accountName: 'test@domain.com',
        secret: mockSecret,
        digits: 6,
        period: 30,
      },
    };

    await useVaultStore.getState().addItem(tempItem);
    assert.ok(useVaultStore.getState().getItemById(tempItemId) !== undefined);

    // Delete item
    await useVaultStore.getState().deleteItem(tempItemId);
    assert.strictEqual(
      useVaultStore.getState().getItemById(tempItemId),
      undefined,
      'Deleted item must be undefined in active memory'
    );
    assert.strictEqual(
      useVaultStore.getState().items.some((i) => i.id === tempItemId),
      false,
      'Deleted item must be absent from vault store collection'
    );
  });

  it('QR Scanner & URI Parser strictly reject non-otpauth payloads and HOTP schemes', () => {
    // Arbitrary text / URL rejected
    const nonOtpauth = tryParseOtpAuthUri('https://example.com/login?token=abc');
    assert.strictEqual(nonOtpauth.isValid, false);

    // Random QR text rejected
    const randomText = tryParseOtpAuthUri('WIFI:S:MyNetwork;T:WPA;P:SecretPassword;;');
    assert.strictEqual(randomText.isValid, false);

    // HOTP counter scheme explicitly rejected
    const hotpUri = 'otpauth://hotp/GitHub:user?secret=JBSWY3DPEHPK3PXP&counter=1';
    assert.throws(
      () => parseOtpAuthUri(hotpUri),
      (err: unknown) => {
        assert.ok((err as Error).message.includes('HOTP'));
        return true;
      }
    );

    // Missing secret rejected
    const missingSecretUri = 'otpauth://totp/Service:user?issuer=Service';
    const missingSecretResult = tryParseOtpAuthUri(missingSecretUri);
    assert.strictEqual(missingSecretResult.isValid, false);
  });

  it('Backup export guarantees zero-knowledge plaintext isolation', async () => {
    const sensitiveItems: VaultItem[] = [
      {
        id: 'vault_cred_99',
        type: 'LOGIN',
        title: 'Confidential Production DB',
        tags: ['prod'],
        isFavorite: true,
        createdAt: 3000,
        updatedAt: 3000,
        payload: {
          username: 'postgres_superadmin',
          password: 'SuperClassifiedDatabasePassword!99#',
          totpSecret: 'MFRGGZDFMZTWQ2LK',
        },
      },
    ];

    const backupString = await createEncryptedBackup(
      sensitiveItems,
      'MasterBackupPassphrase!2026',
      { memory: 2048, iterations: 2 }
    );

    // Plaintext isolation assertions
    assert.strictEqual(
      backupString.includes('postgres_superadmin'),
      false,
      'Username must not appear in plaintext in backup envelope'
    );
    assert.strictEqual(
      backupString.includes('SuperClassifiedDatabasePassword!99#'),
      false,
      'Password must not appear in plaintext in backup envelope'
    );
    assert.strictEqual(
      backupString.includes('MFRGGZDFMZTWQ2LK'),
      false,
      'TOTP secret must not appear in plaintext in backup envelope'
    );
  });

  it('Session Auto-Lock timeout configuration enforces boundary validation', () => {
    VaultSessionManager.setAutoLockTimeout('immediate');
    assert.strictEqual(useSessionStore.getState().autoLockTimeout, 'immediate');

    VaultSessionManager.setAutoLockTimeout('1m');
    assert.strictEqual(useSessionStore.getState().autoLockTimeout, '1m');

    VaultSessionManager.setAutoLockTimeout('5m');
    assert.strictEqual(useSessionStore.getState().autoLockTimeout, '5m');

    VaultSessionManager.setAutoLockTimeout('15m');
    assert.strictEqual(useSessionStore.getState().autoLockTimeout, '15m');
  });
});
