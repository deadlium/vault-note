/**
 * Security Center & Vault Hygiene Audit Engine Test Suite
 * Comprehensive verification of local zero-knowledge password analysis,
 * credential reuse grouping, TOTP coverage metrics, and perimeter posture.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  auditPasswordHealth,
  auditTOTPCoverage,
  auditVaultProtection,
  performSecurityAudit,
} from '../auditEngine';
import { VaultItem, LoginPayload, TOTPPayload } from '../../../types/vault';

const mockNow = Date.now();

function createMockLoginItem(
  id: string,
  title: string,
  password: string,
  options?: {
    username?: string;
    totpSecret?: string;
  }
): VaultItem<LoginPayload> {
  return {
    id,
    type: 'LOGIN',
    title,
    tags: ['test'],
    isFavorite: false,
    createdAt: mockNow,
    updatedAt: mockNow,
    payload: {
      username: options?.username ?? `${id}@example.com`,
      password,
      totpSecret: options?.totpSecret,
    },
  };
}

function createMockTOTPItem(id: string, issuer: string): VaultItem<TOTPPayload> {
  return {
    id,
    type: 'TOTP',
    title: issuer,
    tags: ['totp'],
    isFavorite: false,
    createdAt: mockNow,
    updatedAt: mockNow,
    payload: {
      issuer,
      accountName: `${issuer.toLowerCase()}@example.com`,
      secret: 'JBSWY3DPEHPK3PXP',
    },
  };
}

describe('Security Center: Local Password Hygiene & Strength Audit', () => {
  it('Evaluates empty vault credentials gracefully without division errors', () => {
    const result = auditPasswordHealth([]);
    assert.strictEqual(result.totalCredentials, 0);
    assert.strictEqual(result.weakPasswordCount, 0);
    assert.strictEqual(result.reusedPasswordCount, 0);
    assert.strictEqual(result.score, 100);
    assert.deepStrictEqual(result.weakItems, []);
    assert.deepStrictEqual(result.reusedGroups, []);
  });

  it('Accurately detects weak passwords and entropy deficiencies', () => {
    const items = [
      createMockLoginItem('1', 'Weak Account 1', '123456'), // Very weak sequential
      createMockLoginItem('2', 'Weak Account 2', 'password'), // Dictionary weak
      createMockLoginItem(
        '3',
        'Strong Account',
        'K9#mQ!8z$vL2@xP7&wR4*tY1' // 24 chars high entropy
      ),
    ];

    const result = auditPasswordHealth(items);
    assert.strictEqual(result.totalCredentials, 3);
    assert.strictEqual(result.weakPasswordCount, 2);
    assert.strictEqual(result.weakItems.length, 2);

    const weakTitles = result.weakItems.map((w) => w.itemTitle);
    assert.ok(weakTitles.includes('Weak Account 1'));
    assert.ok(weakTitles.includes('Weak Account 2'));
    assert.ok(!weakTitles.includes('Strong Account'));

    // Score should reflect weak deductions
    assert.ok(result.score < 80);
  });

  it('Identifies credential reuse and groups affected accounts correctly', () => {
    const sharedSecret = 'SharedEnterprisePass!2026';
    const uniqueSecret = 'UniqueCryptographicSecret_789!';

    const items = [
      createMockLoginItem('1', 'Service Alpha', sharedSecret),
      createMockLoginItem('2', 'Service Beta', sharedSecret),
      createMockLoginItem('3', 'Service Gamma', sharedSecret),
      createMockLoginItem('4', 'Service Delta', uniqueSecret),
    ];

    const result = auditPasswordHealth(items);
    assert.strictEqual(result.totalCredentials, 4);
    assert.strictEqual(result.uniquePasswordsCount, 2);
    assert.strictEqual(result.reusedGroups.length, 1);

    const group = result.reusedGroups[0];
    assert.strictEqual(group.count, 3);
    assert.strictEqual(group.passwordLength, sharedSecret.length);
    assert.deepStrictEqual(group.itemTitles, [
      'Service Alpha',
      'Service Beta',
      'Service Gamma',
    ]);
    assert.strictEqual(result.reusedPasswordCount, 3);
  });

  it('Calculates perfect 100 score for pristine unique strong credentials', () => {
    const items = [
      createMockLoginItem('1', 'Acc 1', 'vN8#kL2$mP9!xR4@zQ7*tW5&'),
      createMockLoginItem('2', 'Acc 2', 'bX4^jM9*qT2%wE7#rY1@uI6!'),
      createMockLoginItem('3', 'Acc 3', 'zK3@fO8#sA5$dC9&gV1!hB6*'),
    ];

    const result = auditPasswordHealth(items);
    assert.strictEqual(result.weakPasswordCount, 0);
    assert.strictEqual(result.reusedPasswordCount, 0);
    assert.strictEqual(result.score, 100);
  });
});

describe('Security Center: TOTP Coverage & Two-Factor Analysis', () => {
  it('Evaluates full 2FA coverage when all credentials have TOTP configured', () => {
    const items = [
      createMockLoginItem('1', 'Google', 'P@ssword123456!', {
        totpSecret: 'JBSWY3DPEHPK3PXP',
      }),
      createMockLoginItem('2', 'GitHub', 'P@ssword789101!', {
        totpSecret: 'HXDMVJECJJWSRB3H',
      }),
    ];

    const result = auditTOTPCoverage(items);
    assert.strictEqual(result.totalCredentials, 2);
    assert.strictEqual(result.credentialsWith2FA, 2);
    assert.strictEqual(result.missing2FACount, 0);
    assert.strictEqual(result.coveragePercentage, 100);
    assert.strictEqual(result.score, 100);
    assert.strictEqual(result.missing2FAItems.length, 0);
  });

  it('Identifies single-factor logins missing 2FA and computes coverage ratio', () => {
    const items = [
      createMockLoginItem('1', 'Protected Account', 'P@ssword123456!', {
        totpSecret: 'JBSWY3DPEHPK3PXP',
      }),
      createMockLoginItem('2', 'Unprotected Account 1', 'P@ssword789101!'),
      createMockLoginItem('3', 'Unprotected Account 2', 'P@ssword111213!'),
      createMockLoginItem('4', 'Unprotected Account 3', 'P@ssword141516!'),
    ];

    const result = auditTOTPCoverage(items);
    assert.strictEqual(result.totalCredentials, 4);
    assert.strictEqual(result.credentialsWith2FA, 1);
    assert.strictEqual(result.missing2FACount, 3);
    assert.strictEqual(result.coveragePercentage, 25);
    assert.strictEqual(result.score, 25);
    assert.strictEqual(result.missing2FAItems.length, 3);
    assert.strictEqual(result.missing2FAItems[0].title, 'Unprotected Account 1');
  });

  it('Awards bonus points for standalone TOTP authenticators', () => {
    const items: VaultItem[] = [
      createMockLoginItem('1', 'Login Item', 'Pass123456!'), // 0% login coverage
      createMockTOTPItem('totp-1', 'Cloudflare'),
      createMockTOTPItem('totp-2', 'Discord'),
    ];

    const result = auditTOTPCoverage(items);
    assert.strictEqual(result.totalCredentials, 1);
    assert.strictEqual(result.credentialsWith2FA, 0);
    assert.strictEqual(result.standaloneTOTPCount, 2);
    assert.strictEqual(result.coveragePercentage, 0);
    // Score receives bonus for standalone authenticators
    assert.ok(result.score > 0);
    assert.strictEqual(result.score, 10);
  });
});

describe('Security Center: Vault Perimeter & Auto-Lock Posture', () => {
  it('Assigns full score for immediate and 1m auto-lock with active biometrics', () => {
    const result1m = auditVaultProtection({
      autoLockTimeout: '1m',
      isBiometricsAvailable: true,
      isBiometricsEnrolled: true,
      isPrivacyShieldActive: true,
    });

    assert.strictEqual(result1m.isAutoLockSecure, true);
    assert.strictEqual(result1m.score, 100);

    const resultImm = auditVaultProtection({
      autoLockTimeout: 'immediate',
      isBiometricsAvailable: true,
      isBiometricsEnrolled: true,
      isPrivacyShieldActive: true,
    });
    assert.strictEqual(resultImm.score, 100);
  });

  it('Severely penalizes "never" auto-lock configuration as high risk', () => {
    const result = auditVaultProtection({
      autoLockTimeout: 'never',
      isBiometricsAvailable: true,
      isBiometricsEnrolled: true,
      isPrivacyShieldActive: true,
    });

    assert.strictEqual(result.isAutoLockSecure, false);
    // 0 auto-lock points out of 40 -> maximum score 60
    assert.strictEqual(result.score, 60);
  });

  it('Adjusts score when biometrics are available but unenrolled', () => {
    const result = auditVaultProtection({
      autoLockTimeout: '1m',
      isBiometricsAvailable: true,
      isBiometricsEnrolled: false,
      isPrivacyShieldActive: true,
    });

    assert.strictEqual(result.score, 80);
  });
});

describe('Security Center: Unified Zero-Knowledge Audit & Actionable Issues', () => {
  it('Synthesizes overall score and categorizes issues by severity', () => {
    const items = [
      createMockLoginItem('1', 'Google', '123456'), // weak + reused
      createMockLoginItem('2', 'Twitter', '123456'), // weak + reused
      createMockLoginItem('3', 'Work Portal', 'K9#mQ!8z$vL2@xP7&wR4*tY1', {
        totpSecret: 'JBSWY3DPEHPK3PXP',
      }),
    ];

    const audit = performSecurityAudit(items, {
      autoLockTimeout: 'never', // Critical issue
      isBiometricsAvailable: true,
      isBiometricsEnrolled: true,
      isPrivacyShieldActive: true,
    });

    assert.ok(audit.overallScore < 60);
    assert.ok(audit.criticalCount >= 2); // Reused password + Never auto-lock

    const criticalTypes = audit.issues
      .filter((i) => i.severity === 'critical')
      .map((i) => i.type);

    assert.ok(criticalTypes.includes('REUSED_PASSWORD'));
    assert.ok(criticalTypes.includes('INSECURE_AUTOLOCK'));

    const warningTypes = audit.issues
      .filter((i) => i.severity === 'warning')
      .map((i) => i.type);

    assert.ok(warningTypes.includes('WEAK_PASSWORD'));
    assert.ok(warningTypes.includes('MISSING_2FA'));
  });

  it('Outputs "excellent" rating for pristine zero-vulnerability vault', () => {
    const items = [
      createMockLoginItem('1', 'ProtonMail', 'Z9#qL2$mP9!xR4@zQ7*tW5&1', {
        totpSecret: 'JBSWY3DPEHPK3PXP',
      }),
      createMockLoginItem('2', 'Bitwarden', 'M4^jM9*qT2%wE7#rY1@uI6!2', {
        totpSecret: 'HXDMVJECJJWSRB3H',
      }),
    ];

    const audit = performSecurityAudit(items, {
      autoLockTimeout: '1m',
      isBiometricsAvailable: true,
      isBiometricsEnrolled: true,
      isPrivacyShieldActive: true,
    });

    assert.strictEqual(audit.overallScore, 100);
    assert.strictEqual(audit.rating, 'excellent');
    assert.strictEqual(audit.criticalCount, 0);
    assert.strictEqual(audit.warningCount, 0);
  });

  it('Verifies zero-knowledge preservation: secrets are never leaked in issue summaries', () => {
    const secretPassword = 'UltraTopSecretPasswordHere123!';
    const items = [
      createMockLoginItem('1', 'Secret Account 1', secretPassword),
      createMockLoginItem('2', 'Secret Account 2', secretPassword),
    ];

    const audit = performSecurityAudit(items);

    // Audit output stringified must not contain raw secretPassword anywhere
    const serialized = JSON.stringify(audit);
    assert.ok(!serialized.includes(secretPassword));
  });
});
