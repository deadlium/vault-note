/**
 * VaultNote Encrypted Backup & Restore Test Suite
 * Comprehensive verification of zero-knowledge .vaultnote envelope serialization,
 * TOTP secret protection, tamper detection, wrong passphrase rejection, and reconciliation strategies.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  createEncryptedBackup,
  decryptAndVerifyBackup,
  parseAndValidateBackupEnvelope,
  mergeVaultItems,
  computeBackupChecksum,
} from '../backupEngine';
import {
  BACKUP_MAGIC_HEADER,
  BACKUP_SPEC_VERSION,
  InvalidBackupFormatError,
  InvalidBackupPasswordError,
  TamperDetectedError,
} from '../types';
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

const mockTimestamp = 1716900000000;

const mockLoginItem: VaultItem<LoginPayload> = {
  id: 'item_login_001',
  type: 'LOGIN',
  title: 'GitHub Personal',
  tags: ['work', 'dev'],
  isFavorite: true,
  createdAt: mockTimestamp,
  updatedAt: mockTimestamp,
  payload: {
    username: 'octocat',
    password: 'SuperSecretPassword!99#',
    websiteUrl: 'https://github.com',
  },
};

const mockTotpItem: VaultItem<TOTPPayload> = {
  id: 'item_totp_001',
  type: 'TOTP',
  title: 'AWS Console 2FA',
  tags: ['cloud', 'security'],
  isFavorite: true,
  createdAt: mockTimestamp,
  updatedAt: mockTimestamp,
  payload: {
    issuer: 'Amazon Web Services',
    accountName: 'admin@company.com',
    secret: 'JBSWY3DPEHPK3PXP',
    digits: 6,
    period: 30,
    algorithm: 'SHA1',
  },
};

const mockNoteItem: VaultItem<SecureNotePayload> = {
  id: 'item_note_001',
  type: 'SECURE_NOTE',
  title: 'Server Root Keys',
  tags: ['infrastructure'],
  isFavorite: false,
  createdAt: mockTimestamp,
  updatedAt: mockTimestamp,
  payload: {
    content: 'Classified SSH key note for production datacenter',
  },
};

const mockCardItem: VaultItem<CardPayload> = {
  id: 'item_card_001',
  type: 'CARD',
  title: 'Corporate Travel Visa',
  tags: ['finance'],
  isFavorite: false,
  createdAt: mockTimestamp,
  updatedAt: mockTimestamp,
  payload: {
    cardholderName: 'Alice Smith',
    cardNumber: '4111 2222 3333 4444',
    expirationMonth: '12',
    expirationYear: '2028',
    cvv: '123',
    cardType: 'visa',
  },
};

const testVaultItems: VaultItem[] = [
  mockLoginItem,
  mockTotpItem,
  mockNoteItem,
  mockCardItem,
];

describe('VaultNote Encrypted Backup Engine', () => {
  it('serializes and encrypts vault into valid .vaultnote envelope', async () => {
    const backupString = await createEncryptedBackup(
      testVaultItems,
      'VaultMasterPassphrase!2026',
      FAST_KDF_CONFIG
    );

    assert.ok(typeof backupString === 'string', 'Backup should be a string');
    const envelope = JSON.parse(backupString);

    assert.strictEqual(envelope.magic, BACKUP_MAGIC_HEADER);
    assert.strictEqual(envelope.version, BACKUP_SPEC_VERSION);
    assert.strictEqual(envelope.cipher, 'AES-256-GCM');
    assert.strictEqual(envelope.kdf.algorithm, 'Argon2id');
    assert.ok(envelope.iv && envelope.iv.length > 0, 'Envelope must contain IV');
    assert.ok(envelope.tag && envelope.tag.length > 0, 'Envelope must contain tag');
    assert.ok(envelope.ciphertext && envelope.ciphertext.length > 0, 'Envelope must contain ciphertext');
    assert.ok(envelope.checksum && envelope.checksum.length > 0, 'Envelope must contain checksum');
  });

  it('guarantees zero-knowledge: sensitive credentials and TOTP secrets are never plaintext in backup', async () => {
    const backupString = await createEncryptedBackup(
      testVaultItems,
      'VaultMasterPassphrase!2026',
      FAST_KDF_CONFIG
    );

    // TOTP secret must NEVER appear anywhere in the serialized file
    assert.strictEqual(
      backupString.includes('JBSWY3DPEHPK3PXP'),
      false,
      'TOTP secret must not appear in plaintext in backup file'
    );

    // Password must NEVER appear anywhere in the serialized file
    assert.strictEqual(
      backupString.includes('SuperSecretPassword!99#'),
      false,
      'Password must not appear in plaintext in backup file'
    );

    // Note content must NEVER appear anywhere in the serialized file
    assert.strictEqual(
      backupString.includes('Classified SSH key note'),
      false,
      'Note content must not appear in plaintext in backup file'
    );

    // Card number must NEVER appear in plaintext
    assert.strictEqual(
      backupString.includes('4111 2222 3333 4444'),
      false,
      'Card number must not appear in plaintext in backup file'
    );
  });

  it('decrypts and verifies backup with exact fidelity when correct passphrase is provided', async () => {
    const passphrase = 'UltraSecurePassphrase!42';
    const backupString = await createEncryptedBackup(testVaultItems, passphrase, FAST_KDF_CONFIG);

    const restoredPayload = await decryptAndVerifyBackup(backupString, passphrase);

    assert.strictEqual(restoredPayload.metadata.itemCount, 4);
    assert.strictEqual(restoredPayload.items.length, 4);
    assert.strictEqual(restoredPayload.metadata.categoriesCount.LOGIN, 1);
    assert.strictEqual(restoredPayload.metadata.categoriesCount.TOTP, 1);
    assert.strictEqual(restoredPayload.metadata.categoriesCount.SECURE_NOTE, 1);
    assert.strictEqual(restoredPayload.metadata.categoriesCount.CARD, 1);

    // Verify TOTP item payload integrity
    const restoredTotp = restoredPayload.items.find((i) => i.id === mockTotpItem.id) as VaultItem<TOTPPayload>;
    assert.ok(restoredTotp, 'Restored TOTP item must exist');
    assert.strictEqual(restoredTotp.payload.secret, 'JBSWY3DPEHPK3PXP');
    assert.strictEqual(restoredTotp.payload.issuer, 'Amazon Web Services');
    assert.strictEqual(restoredTotp.payload.accountName, 'admin@company.com');

    // Verify Login item payload integrity
    const restoredLogin = restoredPayload.items.find((i) => i.id === mockLoginItem.id) as VaultItem<LoginPayload>;
    assert.ok(restoredLogin, 'Restored Login item must exist');
    assert.strictEqual(restoredLogin.payload.username, 'octocat');
    assert.strictEqual(restoredLogin.payload.password, 'SuperSecretPassword!99#');

    // Verify Note item payload integrity
    const restoredNote = restoredPayload.items.find((i) => i.id === mockNoteItem.id) as VaultItem<SecureNotePayload>;
    assert.ok(restoredNote, 'Restored Note item must exist');
    assert.strictEqual(restoredNote.payload.content, 'Classified SSH key note for production datacenter');
  });

  it('rejects decryption when an incorrect passphrase is provided', async () => {
    const backupString = await createEncryptedBackup(
      testVaultItems,
      'CorrectMasterPassphrase!1',
      FAST_KDF_CONFIG
    );

    await assert.rejects(
      async () => {
        await decryptAndVerifyBackup(backupString, 'WrongMasterPassphrase!2');
      },
      (err: unknown) => {
        assert.ok(err instanceof InvalidBackupPasswordError);
        assert.ok((err as Error).message.includes('Incorrect backup passphrase'));
        return true;
      }
    );
  });

  it('detects tampering and bit flips in ciphertext before decryption', async () => {
    const backupString = await createEncryptedBackup(
      testVaultItems,
      'SecurityPassphrase!2026',
      FAST_KDF_CONFIG
    );
    const envelope = JSON.parse(backupString);

    // Modify ciphertext (bit flip)
    const originalCiphertext = envelope.ciphertext;
    envelope.ciphertext = originalCiphertext.slice(0, 10) + 'X' + originalCiphertext.slice(11);
    const tamperedBackupString = JSON.stringify(envelope);

    await assert.rejects(
      async () => {
        await decryptAndVerifyBackup(tamperedBackupString, 'SecurityPassphrase!2026');
      },
      (err: unknown) => {
        assert.ok(err instanceof TamperDetectedError);
        assert.ok((err as Error).message.includes('integrity check failed'));
        return true;
      }
    );
  });

  it('detects tampering in authentication tag', async () => {
    const backupString = await createEncryptedBackup(
      testVaultItems,
      'SecurityPassphrase!2026',
      FAST_KDF_CONFIG
    );
    const envelope = JSON.parse(backupString);

    // Modify authentication tag
    envelope.tag = 'AAAA' + envelope.tag.slice(4);
    const tamperedBackupString = JSON.stringify(envelope);

    await assert.rejects(
      async () => {
        await decryptAndVerifyBackup(tamperedBackupString, 'SecurityPassphrase!2026');
      },
      (err: unknown) => {
        assert.ok(err instanceof TamperDetectedError);
        return true;
      }
    );
  });

  it('detects tampering in initialization vector (IV)', async () => {
    const backupString = await createEncryptedBackup(
      testVaultItems,
      'SecurityPassphrase!2026',
      FAST_KDF_CONFIG
    );
    const envelope = JSON.parse(backupString);

    // Modify IV
    envelope.iv = 'BBBB' + envelope.iv.slice(4);
    const tamperedBackupString = JSON.stringify(envelope);

    await assert.rejects(
      async () => {
        await decryptAndVerifyBackup(tamperedBackupString, 'SecurityPassphrase!2026');
      },
      (err: unknown) => {
        assert.ok(err instanceof TamperDetectedError);
        return true;
      }
    );
  });

  it('validates envelope format and rejects non-JSON or invalid magic header', () => {
    assert.throws(
      () => parseAndValidateBackupEnvelope(''),
      (err: unknown) => {
        assert.ok(err instanceof InvalidBackupFormatError);
        return true;
      }
    );

    assert.throws(
      () => parseAndValidateBackupEnvelope('{ not json }'),
      (err: unknown) => {
        assert.ok(err instanceof InvalidBackupFormatError);
        return true;
      }
    );

    assert.throws(
      () =>
        parseAndValidateBackupEnvelope(
          JSON.stringify({ magic: 'WRONG_MAGIC', version: 1, cipher: 'AES-256-GCM' })
        ),
      (err: unknown) => {
        assert.ok(err instanceof InvalidBackupFormatError);
        return true;
      }
    );
  });

  it('rejects empty passphrase during backup export', async () => {
    await assert.rejects(
      async () => {
        await createEncryptedBackup(testVaultItems, '   ', FAST_KDF_CONFIG);
      },
      (err: unknown) => {
        assert.ok(err instanceof InvalidBackupFormatError);
        return true;
      }
    );
  });
});

describe('VaultNote Backup Reconciliation & Restore Strategies', () => {
  it('executes replace mode: overwrites existing items entirely with backup items', () => {
    const existingItems: VaultItem[] = [
      {
        id: 'existing_old_item',
        type: 'SECURE_NOTE',
        title: 'Old Local Note',
        tags: [],
        isFavorite: false,
        createdAt: 1000,
        updatedAt: 1000,
        payload: { content: 'Local content' },
      },
    ];

    const backupItems: VaultItem[] = [mockLoginItem, mockTotpItem];

    const result = mergeVaultItems(existingItems, backupItems, 'replace');

    assert.strictEqual(result.mergedItems.length, 2);
    assert.strictEqual(result.summary.mode, 'replace');
    assert.strictEqual(result.summary.totalRestored, 2);
    assert.strictEqual(result.summary.addedCount, 2);
    assert.strictEqual(result.summary.updatedCount, 0);
    assert.strictEqual(result.summary.skippedCount, 0);

    const hasOldItem = result.mergedItems.some((i) => i.id === 'existing_old_item');
    assert.strictEqual(hasOldItem, false, 'Replace mode must remove items not present in backup');
  });

  it('executes merge mode: reconciles newer items and preserves local updates', () => {
    const existingLogin: VaultItem<LoginPayload> = {
      ...mockLoginItem,
      updatedAt: 2000,
      payload: {
        ...mockLoginItem.payload,
        password: 'OlderPasswordVersion!',
      },
    };

    const newerBackupLogin: VaultItem<LoginPayload> = {
      ...mockLoginItem,
      updatedAt: 3000, // Newer in backup!
      payload: {
        ...mockLoginItem.payload,
        password: 'NewerPasswordVersion!',
      },
    };

    const existingTotp: VaultItem<TOTPPayload> = {
      ...mockTotpItem,
      updatedAt: 5000, // Newer locally!
    };

    const olderBackupTotp: VaultItem<TOTPPayload> = {
      ...mockTotpItem,
      updatedAt: 4000, // Older in backup!
    };

    const existingStandaloneItem: VaultItem<SecureNotePayload> = {
      id: 'local_standalone_001',
      type: 'SECURE_NOTE',
      title: 'Local Solo Note',
      tags: [],
      isFavorite: false,
      createdAt: 1000,
      updatedAt: 1000,
      payload: { content: 'Preserved note' },
    };

    const existingItems = [existingLogin, existingTotp, existingStandaloneItem];
    const backupItems = [newerBackupLogin, olderBackupTotp, mockCardItem]; // mockCardItem is brand new

    const result = mergeVaultItems(existingItems, backupItems, 'merge');

    // Expected:
    // - newerBackupLogin updates existingLogin (updatedCount = 1)
    // - olderBackupTotp is skipped because existingTotp is newer (skippedCount = 1)
    // - mockCardItem is brand new and added (addedCount = 1)
    // - existingStandaloneItem is preserved locally
    assert.strictEqual(result.summary.mode, 'merge');
    assert.strictEqual(result.summary.addedCount, 1);
    assert.strictEqual(result.summary.updatedCount, 1);
    assert.strictEqual(result.summary.skippedCount, 1);
    assert.strictEqual(result.summary.totalRestored, 2);

    // Total merged length: 4 items (Login, Totp, Standalone, Card)
    assert.strictEqual(result.mergedItems.length, 4);

    const mergedLogin = result.mergedItems.find((i) => i.id === mockLoginItem.id) as VaultItem<LoginPayload>;
    assert.strictEqual(mergedLogin.payload.password, 'NewerPasswordVersion!');

    const mergedTotp = result.mergedItems.find((i) => i.id === mockTotpItem.id);
    assert.strictEqual(mergedTotp?.updatedAt, 5000, 'Newer local record must be preserved');

    const preservedStandalone = result.mergedItems.find((i) => i.id === 'local_standalone_001');
    assert.ok(preservedStandalone, 'Local item missing in backup must not be lost in merge mode');
  });
});
