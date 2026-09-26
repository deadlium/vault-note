/**
 * VaultNote Local Security Audit Engine
 * 100% zero-knowledge, offline analysis of password hygiene, credential reuse,
 * TOTP coverage, and perimeter protection settings without transmitting secrets.
 */

import { VaultItem, LoginPayload } from '../../types/vault';
import { evaluateEntropy } from '../password-generator/entropy';
import { colors } from '../../theme/colors';
import {
  AuditIssue,
  OverallVaultHealth,
  PasswordHealthAudit,
  ReusedPasswordGroup,
  SecurityRating,
  TOTPCoverageAudit,
  VaultProtectionAudit,
  VaultProtectionConfig,
  WeakPasswordDetail,
} from './types';

/**
 * Creates a safe deterministic fingerprint of a secret string
 * for grouping without exposing or storing plaintext secrets.
 */
function createSafeFingerprint(secret: string): string {
  let hash = 0;
  for (let i = 0; i < secret.length; i++) {
    const code = secret.charCodeAt(i);
    hash = (hash << 5) - hash + code;
    hash |= 0; // Convert to 32bit integer
  }
  return `fp_${Math.abs(hash).toString(16)}_${secret.length}`;
}

/**
 * Evaluates password hygiene, strength, and credential reuse across all vault items.
 *
 * @param items List of decrypted vault items in active session RAM
 * @returns Comprehensive PasswordHealthAudit breakdown
 */
export function auditPasswordHealth(items: VaultItem[]): PasswordHealthAudit {
  const credentialItems = items.filter((item) => {
    if (item.type === 'LOGIN') {
      const p = item.payload as LoginPayload;
      return typeof p?.password === 'string' && p.password.length > 0;
    }
    return false;
  });

  const totalCredentials = credentialItems.length;

  if (totalCredentials === 0) {
    return {
      totalCredentials: 0,
      analyzedCount: 0,
      weakPasswordCount: 0,
      reusedPasswordCount: 0,
      uniquePasswordsCount: 0,
      reusedGroups: [],
      weakItems: [],
      score: 100,
    };
  }

  const weakItems: WeakPasswordDetail[] = [];
  const passwordUsageMap = new Map<
    string,
    { itemIds: string[]; itemTitles: string[]; length: number }
  >();

  for (const item of credentialItems) {
    const p = item.payload as LoginPayload;
    const password = p.password;

    // 1. Evaluate individual entropy & brute-force resistance
    const evalResult = evaluateEntropy(password);
    const isWeak =
      evalResult.score <= 1 ||
      evalResult.entropyBits < 50 ||
      password.length < 10 ||
      evalResult.rating === 'weak' ||
      evalResult.rating === 'very-weak';

    if (isWeak) {
      weakItems.push({
        itemId: item.id,
        itemTitle: item.title,
        username: p.username,
        entropyBits: evalResult.entropyBits,
        score: evalResult.score,
        rating: evalResult.rating,
        label: evalResult.label,
        suggestions: evalResult.suggestions,
      });
    }

    // 2. Track password reuse across multiple records
    const normalizedPassword = password.trim();
    const existing = passwordUsageMap.get(normalizedPassword);
    if (existing) {
      existing.itemIds.push(item.id);
      existing.itemTitles.push(item.title);
    } else {
      passwordUsageMap.set(normalizedPassword, {
        itemIds: [item.id],
        itemTitles: [item.title],
        length: password.length,
      });
    }
  }

  // 3. Aggregate reuse groups
  const reusedGroups: ReusedPasswordGroup[] = [];
  let reusedPasswordCount = 0;

  passwordUsageMap.forEach((entry, rawSecret) => {
    if (entry.itemIds.length > 1) {
      reusedGroups.push({
        passwordFingerprint: createSafeFingerprint(rawSecret),
        passwordLength: entry.length,
        count: entry.itemIds.length,
        itemIds: [...entry.itemIds],
        itemTitles: [...entry.itemTitles],
      });
      reusedPasswordCount += entry.itemIds.length;
    }
  });

  // Sort reuse groups by affected item count descending
  reusedGroups.sort((a, b) => b.count - a.count);

  const uniquePasswordsCount = passwordUsageMap.size;
  const weakPasswordCount = weakItems.length;

  // 4. Calculate password health score [0..100]
  // Deductions: up to 50 points for weak passwords, up to 50 points for reused passwords
  const weakDeduction = Math.round((weakPasswordCount / totalCredentials) * 50);
  const reusedDeduction = Math.round(
    (reusedPasswordCount / totalCredentials) * 50
  );
  const score = Math.max(0, Math.min(100, 100 - weakDeduction - reusedDeduction));

  return {
    totalCredentials,
    analyzedCount: totalCredentials,
    weakPasswordCount,
    reusedPasswordCount,
    uniquePasswordsCount,
    reusedGroups,
    weakItems,
    score,
  };
}

/**
 * Evaluates Two-Factor Authentication (TOTP) adoption and coverage across credentials.
 *
 * @param items List of decrypted vault items in active session RAM
 * @returns Comprehensive TOTPCoverageAudit breakdown
 */
export function auditTOTPCoverage(items: VaultItem[]): TOTPCoverageAudit {
  const loginItems = items.filter((i) => i.type === 'LOGIN');
  const standaloneTOTPItems = items.filter((i) => i.type === 'TOTP');

  const totalCredentials = loginItems.length;
  const standaloneTOTPCount = standaloneTOTPItems.length;

  if (totalCredentials === 0) {
    return {
      totalCredentials: 0,
      credentialsWith2FA: 0,
      standaloneTOTPCount,
      missing2FACount: 0,
      coveragePercentage: 100,
      missing2FAItems: [],
      score: 100,
    };
  }

  const credentialsWith2FAItems: VaultItem[] = [];
  const missing2FAItems: { itemId: string; title: string; username?: string; websiteUrl?: string }[] = [];

  for (const item of loginItems) {
    const payload = item.payload as unknown as Record<string, unknown>;
    const hasSecret =
      Boolean(payload?.totpSecret) ||
      Boolean((payload?.totpConfig as Record<string, unknown>)?.secret) ||
      Boolean(payload?.secret);

    if (hasSecret) {
      credentialsWith2FAItems.push(item);
    } else {
      missing2FAItems.push({
        itemId: item.id,
        title: item.title,
        username: typeof payload?.username === 'string' ? payload.username : undefined,
        websiteUrl: typeof payload?.websiteUrl === 'string' ? payload.websiteUrl : undefined,
      });
    }
  }

  const credentialsWith2FA = credentialsWith2FAItems.length;
  const missing2FACount = missing2FAItems.length;

  const coveragePercentage = Math.round(
    (credentialsWith2FA / totalCredentials) * 100
  );

  // Score starts from coverage percentage, plus bonus for standalone authenticators
  let score = coveragePercentage;
  if (standaloneTOTPCount > 0 && score < 100) {
    score = Math.min(100, score + Math.min(15, standaloneTOTPCount * 5));
  }

  return {
    totalCredentials,
    credentialsWith2FA,
    standaloneTOTPCount,
    missing2FACount,
    coveragePercentage,
    missing2FAItems,
    score,
  };
}

/**
 * Audits vault security perimeter configurations such as auto-lock timers,
 * biometric enforcement, and privacy shield toggles.
 *
 * @param config Optional platform and session configurations
 * @returns VaultProtectionAudit breakdown
 */
export function auditVaultProtection(
  config?: Partial<VaultProtectionConfig>
): VaultProtectionAudit {
  const autoLockTimeout = config?.autoLockTimeout ?? '1m';
  const isBiometricsAvailable = config?.isBiometricsAvailable ?? true;
  const isBiometricsEnrolled = config?.isBiometricsEnrolled ?? true;
  const isPrivacyShieldActive = config?.isPrivacyShieldActive ?? true;

  const isAutoLockSecure = autoLockTimeout !== 'never';

  // Scoring allocation (Total 100):
  // 1. Auto-Lock duration (Max 40 pts)
  let autoLockPts = 0;
  if (autoLockTimeout === 'immediate' || autoLockTimeout === '1m') {
    autoLockPts = 40;
  } else if (autoLockTimeout === '5m') {
    autoLockPts = 32;
  } else if (autoLockTimeout === '15m') {
    autoLockPts = 20;
  } else {
    autoLockPts = 0; // 'never' is insecure
  }

  // 2. Biometric hardware & enrollment (Max 35 pts)
  let bioPts = 0;
  if (isBiometricsAvailable && isBiometricsEnrolled) {
    bioPts = 35;
  } else if (isBiometricsAvailable && !isBiometricsEnrolled) {
    bioPts = 15;
  } else {
    // If device lacks biometric hardware, assign neutral baseline
    bioPts = 25;
  }

  // 3. Privacy shield against system app switchers (Max 25 pts)
  let shieldPts = isPrivacyShieldActive ? 25 : 10;

  const score = Math.max(0, Math.min(100, autoLockPts + bioPts + shieldPts));

  return {
    autoLockTimeout,
    isAutoLockSecure,
    isBiometricsAvailable,
    isBiometricsEnrolled,
    isPrivacyShieldActive,
    score,
  };
}

/**
 * Performs a unified, zero-knowledge local security audit across all vault records and settings.
 *
 * @param items Decrypted vault items in active session RAM
 * @param config Optional platform & session security configurations
 * @returns Complete OverallVaultHealth report with prioritized actionable issues
 */
export function performSecurityAudit(
  items: VaultItem[],
  config?: Partial<VaultProtectionConfig>
): OverallVaultHealth {
  const passwordHealth = auditPasswordHealth(items);
  const totpCoverage = auditTOTPCoverage(items);
  const vaultProtection = auditVaultProtection(config);

  const issues: AuditIssue[] = [];

  // 1. Issue: Reused Passwords (CRITICAL)
  for (const group of passwordHealth.reusedGroups) {
    issues.push({
      id: `issue_reused_${group.passwordFingerprint}`,
      type: 'REUSED_PASSWORD',
      severity: 'critical',
      title: `Password Reused across ${group.count} Accounts`,
      description: `Accounts "${group.itemTitles.slice(0, 3).join(', ')}${
        group.itemTitles.length > 3 ? ` and ${group.itemTitles.length - 3} others` : ''
      }" share the exact same password. A breach on one service compromises all of them.`,
      affectedItemIds: group.itemIds,
      affectedItemTitles: group.itemTitles,
      metric: `${group.count} accounts affected`,
      resolutionAction: 'edit_item',
    });
  }

  // 2. Issue: Insecure Auto-Lock (CRITICAL)
  if (!vaultProtection.isAutoLockSecure) {
    issues.push({
      id: 'issue_autolock_never',
      type: 'INSECURE_AUTOLOCK',
      severity: 'critical',
      title: 'Auto-Lock is Disabled',
      description:
        'The vault never automatically locks when backgrounded or inactive. Master cryptographic keys remain resident in memory indefinitely.',
      affectedItemIds: [],
      affectedItemTitles: [],
      metric: 'Auto-Lock: Never',
      resolutionAction: 'configure_autolock',
    });
  }

  // 3. Issue: Weak Passwords (WARNING)
  if (passwordHealth.weakItems.length > 0) {
    issues.push({
      id: 'issue_weak_passwords',
      type: 'WEAK_PASSWORD',
      severity: 'warning',
      title: `${passwordHealth.weakItems.length} Weak Password${
        passwordHealth.weakItems.length > 1 ? 's' : ''
      } Detected`,
      description: `Identified credentials with low entropy or predictable patterns susceptible to brute-force attacks: ${passwordHealth.weakItems
        .map((w) => w.itemTitle)
        .slice(0, 3)
        .join(', ')}${
        passwordHealth.weakItems.length > 3
          ? ` and ${passwordHealth.weakItems.length - 3} more`
          : ''
      }.`,
      affectedItemIds: passwordHealth.weakItems.map((w) => w.itemId),
      affectedItemTitles: passwordHealth.weakItems.map((w) => w.itemTitle),
      metric: `${passwordHealth.weakItems.length} accounts with entropy < 50 bits`,
      resolutionAction: 'edit_item',
    });
  }

  // 4. Issue: Missing 2FA (WARNING)
  if (totpCoverage.missing2FACount > 0) {
    issues.push({
      id: 'issue_missing_2fa',
      type: 'MISSING_2FA',
      severity: 'warning',
      title: `${totpCoverage.missing2FACount} Account${
        totpCoverage.missing2FACount > 1 ? 's' : ''
      } Missing 2FA Protection`,
      description:
        'Logins without two-factor authentication rely solely on single-factor passwords. Attach a TOTP authenticator secret to defend against credential stuffing.',
      affectedItemIds: totpCoverage.missing2FAItems.map((m) => m.itemId),
      affectedItemTitles: totpCoverage.missing2FAItems.map((m) => m.title),
      metric: `${totpCoverage.coveragePercentage}% 2FA coverage`,
      resolutionAction: 'configure_totp',
    });
  }

  // 5. Issue: Biometrics Available but Not Enrolled (INFO)
  if (vaultProtection.isBiometricsAvailable && !vaultProtection.isBiometricsEnrolled) {
    issues.push({
      id: 'issue_biometrics_disabled',
      type: 'BIOMETRICS_DISABLED',
      severity: 'info',
      title: 'Biometric Fast Unlock Not Configured',
      description:
        'Hardware-backed biometric authentication (Face ID / Fingerprint) is available on this device but not enabled for quick vault unlock.',
      affectedItemIds: [],
      affectedItemTitles: [],
      metric: 'Biometrics disabled',
      resolutionAction: 'configure_biometric',
    });
  }

  // 6. Issue: Extended Auto-Lock Timeout (INFO)
  if (vaultProtection.autoLockTimeout === '15m') {
    issues.push({
      id: 'issue_autolock_15m',
      type: 'INSECURE_AUTOLOCK',
      severity: 'info',
      title: 'Extended Auto-Lock Timeout (15m)',
      description:
        'Vault remains unlocked for 15 minutes in the background. Consider reducing to 1m or 5m for optimal security hygiene.',
      affectedItemIds: [],
      affectedItemTitles: [],
      metric: 'Auto-Lock: 15m',
      resolutionAction: 'configure_autolock',
    });
  }

  // 7. Issue: Privacy Shield Inactive (INFO)
  if (!vaultProtection.isPrivacyShieldActive) {
    issues.push({
      id: 'issue_privacy_shield',
      type: 'PRIVACY_SHIELD_INACTIVE',
      severity: 'info',
      title: 'Multitasking Privacy Shield Inactive',
      description:
        'App contents may be visible in the operating system multitasking app switcher preview.',
      affectedItemIds: [],
      affectedItemTitles: [],
      metric: 'Privacy Shield Off',
      resolutionAction: 'configure_privacy',
    });
  }

  // Calculate Weighted Overall Health Score [0..100]
  let overallScore = 100;
  if (passwordHealth.totalCredentials === 0) {
    // If no credentials exist yet, base score heavily on perimeter security
    overallScore = Math.round(
      passwordHealth.score * 0.25 +
        totpCoverage.score * 0.25 +
        vaultProtection.score * 0.5
    );
  } else {
    // Standard weighting: 40% Password Health, 35% 2FA Coverage, 25% Vault Protection
    overallScore = Math.round(
      passwordHealth.score * 0.4 +
        totpCoverage.score * 0.35 +
        vaultProtection.score * 0.25
    );
  }

  overallScore = Math.max(0, Math.min(100, overallScore));

  // Determine Rating and Palette
  let rating: SecurityRating = 'excellent';
  let label = 'Excellent Defense';
  let color: string = colors.emerald;
  let summary = 'Your vault credentials and perimeter hygiene meet elite security standards.';

  if (overallScore >= 90) {
    rating = 'excellent';
    label = 'Excellent Defense';
    color = colors.emerald;
    summary = 'Your vault credentials and perimeter hygiene meet elite security standards.';
  } else if (overallScore >= 75) {
    rating = 'good';
    label = 'Good Hygiene';
    color = colors.primary;
    summary = 'Solid security posture with minor opportunities for two-factor or password improvements.';
  } else if (overallScore >= 50) {
    rating = 'fair';
    label = 'Action Recommended';
    color = colors.amber;
    summary = 'Moderate hygiene risks found. Resolve weak passwords or missing 2FA credentials.';
  } else if (overallScore >= 25) {
    rating = 'poor';
    label = 'Vulnerabilities Detected';
    color = colors.amberDark;
    summary = 'Significant credential reuse or perimeter vulnerabilities detected.';
  } else {
    rating = 'critical';
    label = 'Critical Risk';
    color = colors.crimson;
    summary = 'Urgent security attention required. Passwords are weak, reused, or auto-lock is disabled.';
  }

  const criticalCount = issues.filter((i) => i.severity === 'critical').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const infoCount = issues.filter((i) => i.severity === 'info').length;

  return {
    overallScore,
    rating,
    label,
    color,
    summary,
    passwordHealth,
    totpCoverage,
    vaultProtection,
    issues,
    criticalCount,
    warningCount,
    infoCount,
    auditedAt: Date.now(),
  };
}
