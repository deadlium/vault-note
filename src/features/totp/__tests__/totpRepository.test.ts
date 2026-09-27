/**
 * TOTP Repository & Secure Management Test Suite
 * Validates zero-knowledge encrypted persistence, credential linking,
 * offline OTP computation, and lifecycle updates.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { TOTPRepository } from '../repository/totpRepository';
import { TOTPCredentialService } from '../services/totpCredentialService';
import { VaultRepository } from '../../vault/repository/vaultRepository';
import { useVaultStore } from '../../vault/store/useVaultStore';
import { VaultItem, LoginPayload, TOTPPayload } from '../../../types/vault';
import { getRandomBytes } from '../../../core/crypto/csprng';
import { getDatabaseClient } from '../../../core/database/connection';
import { runMigrations } from '../../../core/database/migrations';

describe('Zero-Knowledge Encrypted Persistence for Authenticator Secrets', () => {
  const masterKey = getRandomBytes(32);

  beforeEach(async () => {
    const db = await getDatabaseClient();
    await runMigrations(db);
    await db.execAsync('DELETE FROM vault_tags;');
    await db.execAsync('DELETE FROM vault_items;');
    useVaultStore.setState({ items: [] });
  });

  it('Storage-at-Rest: Authenticator secret resides exclusively inside authenticated ciphertext envelope', async () => {
    const sensitiveSecret = 'JBSWY3DPEHPK3PXP';
    const loginItem: VaultItem<LoginPayload> = {
      id: 'login_sec_test',
      type: 'LOGIN',
      title: 'GitHub Enterprise',
      payload: {
        username: 'octocat',
        password: 'SuperSecretPassword123!',
        totpSecret: sensitiveSecret,
        totpConfig: {
          issuer: 'GitHub Enterprise',
          account: 'octocat',
          secret: sensitiveSecret,
          algorithm: 'SHA1',
          digits: 6,
          period: 30,
        },
      },
      tags: ['work', 'git'],
      isFavorite: false,
      isProtected: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Commit to encrypted repository
    await VaultRepository.createItem(loginItem, masterKey);

    // Inspect raw SQLite record on disk
    const rawRow = await VaultRepository.getRawDatabaseRow('login_sec_test');
    assert.notStrictEqual(rawRow, null);

    // Verify plaintext secret is NEVER leaked to SQLite storage
    assert.strictEqual(rawRow!.payload_enc.includes(sensitiveSecret), false);
    assert.strictEqual(rawRow!.title_enc.includes(sensitiveSecret), false);

    // Verify payload is stored as valid AES-256-GCM envelope
    const parsedEnvelope = JSON.parse(rawRow!.payload_enc);
    assert.strictEqual(parsedEnvelope.algorithm, 'AES-256-GCM');
    assert.strictEqual(typeof parsedEnvelope.ciphertext, 'string');
    assert.strictEqual(typeof parsedEnvelope.iv, 'string');
    assert.strictEqual(typeof parsedEnvelope.tag, 'string');

    // Verify retrieval successfully decrypts authenticated secret
    const decryptedRecord = await TOTPRepository.get('login_sec_test', masterKey);
    assert.notStrictEqual(decryptedRecord, null);
    assert.strictEqual(decryptedRecord?.secret, sensitiveSecret);
    assert.strictEqual(decryptedRecord?.issuer, 'GitHub Enterprise');
    assert.strictEqual(decryptedRecord?.account, 'octocat');
  });
});

describe('Credential-Linked Authenticator Management', () => {
  const masterKey = getRandomBytes(32);

  beforeEach(async () => {
    const db = await getDatabaseClient();
    await runMigrations(db);
    await db.execAsync('DELETE FROM vault_tags;');
    await db.execAsync('DELETE FROM vault_items;');

    const initialItem: VaultItem<LoginPayload> = {
      id: 'cred_link_001',
      type: 'LOGIN',
      title: 'Amazon Web Services',
      payload: {
        username: 'cloud_admin@aws.com',
        password: 'CorrectHorseBattery123',
      },
      tags: ['cloud', 'infra'],
      isFavorite: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    useVaultStore.setState({ items: [initialItem] });
    await VaultRepository.createItem(initialItem, masterKey);
  });

  it('attaches 2FA configuration to existing login credential', async () => {
    const attached = await TOTPRepository.attachToCredential(
      'cred_link_001',
      {
        issuer: 'AWS Root Console',
        account: 'cloud_admin@aws.com',
        secret: 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ',
        algorithm: 'SHA256',
        digits: 8,
        period: 60,
      },
      masterKey
    );

    assert.strictEqual(attached.issuer, 'AWS Root Console');
    assert.strictEqual(attached.account, 'cloud_admin@aws.com');
    assert.strictEqual(attached.secret, 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
    assert.strictEqual(attached.algorithm, 'SHA256');
    assert.strictEqual(attached.digits, 8);
    assert.strictEqual(attached.period, 60);

    // Verify retrieved via credential ID
    const retrieved = await TOTPRepository.getByCredentialId('cred_link_001', masterKey);
    assert.notStrictEqual(retrieved, null);
    assert.strictEqual(retrieved?.digits, 8);
    assert.strictEqual(retrieved?.algorithm, 'SHA256');
    assert.strictEqual(retrieved?.period, 60);
  });

  it('updates existing 2FA configuration parameters', async () => {
    // Attach initial
    await TOTPRepository.attachToCredential(
      'cred_link_001',
      {
        issuer: 'AWS',
        account: 'admin',
        secret: 'JBSWY3DPEHPK3PXP',
      },
      masterKey
    );

    // Update parameters
    const updated = await TOTPRepository.update(
      'cred_link_001',
      {
        issuer: 'AWS Production IAM',
        account: 'devops_lead',
        digits: 8,
        period: 60,
      },
      masterKey
    );

    assert.strictEqual(updated.issuer, 'AWS Production IAM');
    assert.strictEqual(updated.account, 'devops_lead');
    assert.strictEqual(updated.digits, 8);
    assert.strictEqual(updated.period, 60);
    assert.strictEqual(updated.secret, 'JBSWY3DPEHPK3PXP'); // Preserved
  });

  it('detaches 2FA configuration and purges secrets completely', async () => {
    // Attach first
    await TOTPRepository.attachToCredential(
      'cred_link_001',
      {
        issuer: 'AWS',
        account: 'admin',
        secret: 'JBSWY3DPEHPK3PXP',
      },
      masterKey
    );

    // Detach
    const detached = await TOTPRepository.detachFromCredential('cred_link_001', masterKey);
    assert.strictEqual(detached, true);

    // Verify record no longer exists
    const record = await TOTPRepository.getByCredentialId('cred_link_001', masterKey);
    assert.strictEqual(record, null);

    // Verify payload no longer contains totp properties
    const storeItem = useVaultStore.getState().getItemById('cred_link_001');
    const payload = storeItem?.payload as LoginPayload;
    assert.strictEqual(payload.totpSecret, undefined);
    assert.strictEqual(payload.totpConfig, undefined);
  });
});

describe('Standalone Authenticator Records & Multi-Item Queries', () => {
  const masterKey = getRandomBytes(32);

  beforeEach(async () => {
    const db = await getDatabaseClient();
    await runMigrations(db);
    await db.execAsync('DELETE FROM vault_tags;');
    await db.execAsync('DELETE FROM vault_items;');
    useVaultStore.setState({ items: [] });
  });

  it('persists and lists standalone authenticator items alongside credential-linked ones', async () => {
    // 1. Create Standalone Authenticator
    const standalone = await TOTPRepository.saveStandalone(
      {
        issuer: 'Cloudflare Zero Trust',
        account: 'sre@cloudflare.com',
        secret: 'JBSWY3DPEHPK3PXP',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
      },
      masterKey
    );
    assert.ok(standalone.id.startsWith('totp-'));

    // 2. Create Credential Item with attached TOTP
    const loginItem: VaultItem<LoginPayload> = {
      id: 'cred_gh_listing',
      type: 'LOGIN',
      title: 'GitHub',
      payload: {
        username: 'monalisa',
        password: 'SecurePass987!',
        totpSecret: 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ',
        totpConfig: {
          issuer: 'GitHub',
          account: 'monalisa',
          secret: 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ',
          algorithm: 'SHA1',
          digits: 6,
          period: 30,
        },
      },
      tags: ['dev'],
      isFavorite: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await useVaultStore.getState().addItem(loginItem, masterKey);

    // 3. List all authenticators
    const allRecords = await TOTPRepository.listAll(masterKey);
    assert.strictEqual(allRecords.length, 2);

    const issuers = allRecords.map((r) => r.issuer);
    assert.ok(issuers.includes('Cloudflare Zero Trust'));
    assert.ok(issuers.includes('GitHub'));

    // 4. Delete standalone authenticator
    const deleted = await TOTPRepository.delete(standalone.id, masterKey);
    assert.strictEqual(deleted, true);

    const remaining = await TOTPRepository.listAll(masterKey);
    assert.strictEqual(remaining.length, 1);
    assert.strictEqual(remaining[0].issuer, 'GitHub');
  });
});

describe('Offline OTP Generation & RFC 6238 Standard Test Vectors', () => {
  // Standard RFC 6238 Secret: Base32 of "12345678901234567890"
  const rfcSecret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

  it('generates offline OTP codes matching RFC 6238 standard vectors', () => {
    // Vector 1: T = 59s -> step count 1
    const token1 = TOTPCredentialService.generateOfflineOTP({
      secret: rfcSecret,
      digits: 8,
      period: 30,
      timestamp: 59 * 1000,
    });
    assert.strictEqual(token1.code, '94287082');

    // Vector 2: 6-digit variant at T = 59s
    const token6Digits = TOTPCredentialService.generateOfflineOTP({
      secret: rfcSecret,
      digits: 6,
      period: 30,
      timestamp: 59 * 1000,
    });
    assert.strictEqual(token6Digits.code, '287082');

    // Vector 3: T = 1111111109s
    const token3 = TOTPCredentialService.generateOfflineOTP({
      secret: rfcSecret,
      digits: 8,
      period: 30,
      timestamp: 1111111109 * 1000,
    });
    assert.strictEqual(token3.code, '07081804');
  });

  it('verifies code validity with clock drift tolerance', () => {
    const currentCode = TOTPCredentialService.generateOfflineOTP({
      secret: rfcSecret,
      digits: 6,
      period: 30,
    }).code;

    const isValid = TOTPCredentialService.verifyCode(rfcSecret, currentCode, {
      window: 1,
      digits: 6,
      period: 30,
    });
    assert.strictEqual(isValid, true);

    const isWrongValid = TOTPCredentialService.verifyCode(rfcSecret, '000000', {
      window: 1,
      digits: 6,
      period: 30,
    });
    assert.strictEqual(isWrongValid, false);
  });

  it('determines OTP strictly from current device timestamp (background/foreground simulation)', () => {
    const initialTimestamp = 30000; // T = 1
    const tokenT1 = TOTPCredentialService.generateOfflineOTP({
      secret: rfcSecret,
      digits: 6,
      period: 30,
      timestamp: initialTimestamp,
    });

    // Device returns from background after 35 seconds (next rotation step T = 2)
    const resumedTimestamp = initialTimestamp + 35000;
    const tokenT2 = TOTPCredentialService.generateOfflineOTP({
      secret: rfcSecret,
      digits: 6,
      period: 30,
      timestamp: resumedTimestamp,
    });

    // Codes must advance based on current device epoch time, avoiding stale background timer states
    assert.notStrictEqual(tokenT1.code, tokenT2.code);
    assert.strictEqual(tokenT2.remainingSeconds, 25); // (65000 % 30000) = 5000ms elapsed -> 25s left
  });
});
