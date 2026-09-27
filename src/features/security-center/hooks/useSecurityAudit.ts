/**
 * useSecurityAudit Hook
 * Reactive hook computing real-time security hygiene metrics & vulnerability reports
 * Directly wired to vault items and session perimeter configurations with 0ms UI lag
 */

import { useState, useMemo, useCallback } from 'react';
import { useVaultStore } from '../../vault/store/useVaultStore';
import { useSessionStore } from '../../../core/session';
import { performSecurityAudit } from '../auditEngine';
import {
  AuditIssue,
  OverallVaultHealth,
  VaultProtectionConfig,
} from '../types';

export interface UseSecurityAuditReturn {
  auditResult: OverallVaultHealth;
  isAuditing: boolean;
  reAudit: () => void;
  criticalIssues: AuditIssue[];
  warningIssues: AuditIssue[];
  infoIssues: AuditIssue[];
  weakPasswordCount: number;
  reusedPasswordCount: number;
  missing2FACount: number;
  totpCoveragePercentage: number;
  overallScore: number;
}

export function useSecurityAudit(): UseSecurityAuditReturn {
  const items = useVaultStore((state) => state.items);
  const [revision, setRevision] = useState(0);

  const reAudit = useCallback(() => {
    setRevision((prev) => prev + 1);
  }, []);

  const autoLockTimeout = useSessionStore((s) => s.autoLockTimeout);
  const isPrivacyShieldActive = useSessionStore((s) => s.isPrivacyShieldEnabled);

  const protectionConfig: VaultProtectionConfig = useMemo(
    () => ({
      autoLockTimeout,
      isBiometricsAvailable: true,
      isBiometricsEnrolled: true,
      isPrivacyShieldActive,
    }),
    [autoLockTimeout, isPrivacyShieldActive]
  );

  const auditResult = useMemo(() => {
    // revision ensures manual re-scan triggers fresh audit
    return performSecurityAudit(items, protectionConfig);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, protectionConfig, revision]);

  const criticalIssues = useMemo(
    () => auditResult.issues.filter((i) => i.severity === 'critical'),
    [auditResult.issues]
  );

  const warningIssues = useMemo(
    () => auditResult.issues.filter((i) => i.severity === 'warning'),
    [auditResult.issues]
  );

  const infoIssues = useMemo(
    () => auditResult.issues.filter((i) => i.severity === 'info'),
    [auditResult.issues]
  );

  return {
    auditResult,
    isAuditing: false,
    reAudit,
    criticalIssues,
    warningIssues,
    infoIssues,
    weakPasswordCount: auditResult.passwordHealth.weakPasswordCount,
    reusedPasswordCount: auditResult.passwordHealth.reusedPasswordCount,
    missing2FACount: auditResult.totpCoverage.missing2FACount,
    totpCoveragePercentage: auditResult.totpCoverage.coveragePercentage,
    overallScore: auditResult.overallScore,
  };
}
