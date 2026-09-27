/**
 * VaultNote Security Center & Vault Hygiene Types
 * Comprehensive data models for local zero-knowledge security audits
 */

import { AutoLockTimeout } from '../../core/session/types';

export type AuditIssueType =
  | 'WEAK_PASSWORD'
  | 'REUSED_PASSWORD'
  | 'MISSING_2FA'
  | 'INSECURE_AUTOLOCK'
  | 'BIOMETRICS_DISABLED'
  | 'PRIVACY_SHIELD_INACTIVE';

export type AuditSeverity = 'critical' | 'warning' | 'info';

export type SecurityResolutionAction =
  | 'edit_item'
  | 'configure_autolock'
  | 'configure_biometric'
  | 'configure_totp'
  | 'configure_privacy';

export interface AuditIssue {
  id: string;
  type: AuditIssueType;
  severity: AuditSeverity;
  title: string;
  description: string;
  affectedItemIds: string[];
  affectedItemTitles: string[];
  metric?: string;
  resolutionAction: SecurityResolutionAction;
}

export interface WeakPasswordDetail {
  itemId: string;
  itemTitle: string;
  username?: string;
  entropyBits: number;
  score: number;
  rating: string;
  label: string;
  suggestions: string[];
}

export interface ReusedPasswordGroup {
  passwordFingerprint: string;
  passwordLength: number;
  count: number;
  itemIds: string[];
  itemTitles: string[];
}

export interface PasswordHealthAudit {
  totalCredentials: number;
  analyzedCount: number;
  weakPasswordCount: number;
  reusedPasswordCount: number;
  uniquePasswordsCount: number;
  reusedGroups: ReusedPasswordGroup[];
  weakItems: WeakPasswordDetail[];
  score: number; // 0 - 100
}

export interface Missing2FAItem {
  itemId: string;
  title: string;
  username?: string;
  websiteUrl?: string;
}

export interface TOTPCoverageAudit {
  totalCredentials: number;
  credentialsWith2FA: number;
  standaloneTOTPCount: number;
  missing2FACount: number;
  coveragePercentage: number; // 0 - 100
  missing2FAItems: Missing2FAItem[];
  score: number; // 0 - 100
}

export interface VaultProtectionConfig {
  autoLockTimeout: AutoLockTimeout;
  isBiometricsAvailable: boolean;
  isBiometricsEnrolled: boolean;
  isPrivacyShieldActive: boolean;
}

export interface VaultProtectionAudit {
  autoLockTimeout: AutoLockTimeout;
  isAutoLockSecure: boolean;
  isBiometricsAvailable: boolean;
  isBiometricsEnrolled: boolean;
  isPrivacyShieldActive: boolean;
  score: number; // 0 - 100
}

export type SecurityRating = 'excellent' | 'good' | 'fair' | 'poor' | 'critical';

export interface OverallVaultHealth {
  overallScore: number; // 0 - 100
  rating: SecurityRating;
  label: string;
  color: string;
  summary: string;
  passwordHealth: PasswordHealthAudit;
  totpCoverage: TOTPCoverageAudit;
  vaultProtection: VaultProtectionAudit;
  issues: AuditIssue[];
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  auditedAt: number;
}
