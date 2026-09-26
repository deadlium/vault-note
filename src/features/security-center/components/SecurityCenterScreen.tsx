/**
 * SecurityCenterScreen Component
 * Executive-grade Security Center dashboard providing real-time zero-knowledge
 * password hygiene, credential reuse, TOTP coverage, and perimeter vulnerability audits.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../../theme';
import { useSecurityAudit } from '../hooks/useSecurityAudit';
import { SecurityScoreRing } from './SecurityScoreRing';
import { SecurityAuditIssueCard } from './SecurityAuditIssueCard';
import { AuditIssue } from '../types';
import { VaultItem } from '../../../types/vault';
import { useVaultStore } from '../../vault/store/useVaultStore';
import { VaultSessionManager, useSessionStore } from '../../../core/session';
import { AutoLockTimeout } from '../../../core/session/types';

export interface SecurityCenterScreenProps {
  onBack: () => void;
  onSelectItem?: (item: VaultItem) => void;
  onEditItem?: (item: VaultItem) => void;
  onOpenBackup?: () => void;
}

type FilterTab = 'all' | 'critical' | 'warning' | 'info';

const AUTO_LOCK_OPTIONS: { id: AutoLockTimeout; label: string; desc: string }[] = [
  { id: '1m', label: '1 Minute', desc: 'Recommended — tightest balance of security & flow' },
  { id: '5m', label: '5 Minutes', desc: 'Standard protection for active sessions' },
  { id: 'immediate', label: 'Immediate', desc: 'Locks instantly whenever app is backgrounded' },
  { id: '15m', label: '15 Minutes', desc: 'Extended convenience window' },
];

export const SecurityCenterScreen: React.FC<SecurityCenterScreenProps> = ({
  onBack,
  onSelectItem,
  onEditItem,
  onOpenBackup,
}) => {
  const {
    auditResult,
    reAudit,
    criticalIssues,
    warningIssues,
    infoIssues,
  } = useSecurityAudit();

  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [isAutoLockModalOpen, setIsAutoLockModalOpen] = useState(false);
  const [accountPickerIssue, setAccountPickerIssue] = useState<AuditIssue | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getItemById = useVaultStore((state) => state.getItemById);
  const currentAutoLock = useSessionStore((state) => state.autoLockTimeout);

  const showToast = (message: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setFeedbackToast(message);
    toastTimeoutRef.current = setTimeout(() => {
      setFeedbackToast(null);
    }, 2800);
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const displayedIssues = React.useMemo(() => {
    switch (activeTab) {
      case 'critical':
        return criticalIssues;
      case 'warning':
        return warningIssues;
      case 'info':
        return infoIssues;
      case 'all':
      default:
        return auditResult.issues;
    }
  }, [activeTab, criticalIssues, warningIssues, infoIssues, auditResult.issues]);

  const handleResolveIssue = (issue: AuditIssue) => {
    switch (issue.resolutionAction) {
      case 'configure_autolock':
        setIsAutoLockModalOpen(true);
        break;

      case 'configure_privacy':
        useSessionStore.getState().setPrivacyShieldActive(true);
        reAudit();
        showToast('Privacy Shield activated');
        break;

      case 'configure_biometric':
        showToast('Biometric unlock confirmed');
        reAudit();
        break;

      case 'configure_totp':
      case 'edit_item':
        if (issue.affectedItemIds.length === 1) {
          const found = getItemById(issue.affectedItemIds[0]);
          if (found) {
            if (onEditItem) {
              onEditItem(found);
            } else if (onSelectItem) {
              onSelectItem(found);
            }
          }
        } else if (issue.affectedItemIds.length > 1) {
          setAccountPickerIssue(issue);
        }
        break;

      default:
        if (issue.affectedItemIds.length > 0) {
          const found = getItemById(issue.affectedItemIds[0]);
          if (found && onEditItem) {
            onEditItem(found);
          }
        }
        break;
    }
  };

  const handleSelectItemId = (itemId: string) => {
    const foundItem = getItemById(itemId);
    if (foundItem) {
      if (onEditItem) {
        onEditItem(foundItem);
      } else if (onSelectItem) {
        onSelectItem(foundItem);
      }
    }
  };

  const handleSelectAutoLock = (timeout: AutoLockTimeout) => {
    VaultSessionManager.setAutoLockTimeout(timeout);
    useSessionStore.getState().setAutoLockTimeout(timeout);
    setIsAutoLockModalOpen(false);
    reAudit();
    showToast(`Auto-Lock set to ${timeout}`);
  };

  const handlePickAccount = (itemId: string) => {
    setAccountPickerIssue(null);
    const item = getItemById(itemId);
    if (item) {
      if (onEditItem) {
        onEditItem(item);
      } else if (onSelectItem) {
        onSelectItem(item);
      }
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Toast Notification */}
      {feedbackToast && (
        <View style={styles.toastContainer}>
          <Ionicons name="checkmark-circle" size={16} color={colors.emerald} />
          <Text style={styles.toastText}>{feedbackToast}</Text>
        </View>
      )}

      {/* Navigation Top Header */}
      <View style={styles.header}>
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.backButtonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Go Back"
        >
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </Pressable>

        <View style={styles.headerTitleGroup}>
          <Text style={styles.headerTitle}>Security Center</Text>
          <View style={styles.badgeRow}>
            <View style={styles.zeroKnowledgeDot} />
            <Text style={styles.badgeText}>Zero-Knowledge Audit</Text>
          </View>
        </View>

        <Pressable
          onPress={() => {
            reAudit();
            showToast('Audit refreshed');
          }}
          style={({ pressed }) => [
            styles.reAuditButton,
            pressed && styles.reAuditButtonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Scan Now"
        >
          <Ionicons name="refresh" size={17} color="#A78BFA" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Score Showcase Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroLeft}>
            <SecurityScoreRing
              score={auditResult.overallScore}
              rating={auditResult.rating}
              label="SCORE"
              size={118}
              strokeWidth={8}
            />
          </View>

          <View style={styles.heroRight}>
            <View
              style={[
                styles.ratingPill,
                {
                  borderColor: auditResult.color,
                  backgroundColor: `${auditResult.color}1A`,
                },
              ]}
            >
              <Ionicons
                name="shield-checkmark"
                size={13}
                color={auditResult.color}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.ratingPillText, { color: auditResult.color }]}>
                {auditResult.label}
              </Text>
            </View>

            <Text style={styles.summaryText}>{auditResult.summary}</Text>

            <View style={styles.heroStatsRow}>
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatValue}>
                  {auditResult.criticalCount}
                </Text>
                <Text style={styles.heroStatLabel}>Critical</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatValue}>
                  {auditResult.warningCount}
                </Text>
                <Text style={styles.heroStatLabel}>Warnings</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatValue}>
                  {auditResult.passwordHealth.totalCredentials}
                </Text>
                <Text style={styles.heroStatLabel}>Audited</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 3 Pillars of Vault Hygiene Breakdown */}
        <Text style={styles.sectionHeading}>HYGIENE PILLARS</Text>

        <View style={styles.pillarsContainer}>
          {/* Pillar 1: Password Health */}
          <Pressable
            onPress={() => setActiveTab('warning')}
            style={({ pressed }) => [
              styles.pillarCard,
              pressed && styles.pillarCardPressed,
            ]}
          >
            <View style={styles.pillarHeader}>
              <View style={styles.pillarTitleGroup}>
                <Ionicons name="key" size={15} color="#A78BFA" />
                <Text style={styles.pillarTitle}>Password Health</Text>
              </View>
              <Text style={styles.pillarScore}>
                {auditResult.passwordHealth.score}
                <Text style={styles.pillarScoreMax}>/100</Text>
              </Text>
            </View>

            {/* Meter Bar */}
            <View style={styles.meterTrack}>
              <View
                style={[
                  styles.meterFill,
                  {
                    width: `${auditResult.passwordHealth.score}%`,
                    backgroundColor:
                      auditResult.passwordHealth.score >= 80
                        ? colors.emerald
                        : auditResult.passwordHealth.score >= 50
                        ? colors.amber
                        : colors.crimson,
                  },
                ]}
              />
            </View>

            <View style={styles.pillarFooter}>
              <Text style={styles.pillarFootnote}>
                {auditResult.passwordHealth.weakPasswordCount} weak ·{' '}
                {auditResult.passwordHealth.reusedPasswordCount} reused
              </Text>
              <Text style={styles.pillarActionHint}>Inspect issues →</Text>
            </View>
          </Pressable>

          {/* Pillar 2: 2FA Coverage */}
          <Pressable
            onPress={() => setActiveTab('warning')}
            style={({ pressed }) => [
              styles.pillarCard,
              pressed && styles.pillarCardPressed,
            ]}
          >
            <View style={styles.pillarHeader}>
              <View style={styles.pillarTitleGroup}>
                <Ionicons name="finger-print" size={15} color="#34D399" />
                <Text style={styles.pillarTitle}>2FA Coverage</Text>
              </View>
              <Text style={styles.pillarScore}>
                {auditResult.totpCoverage.score}
                <Text style={styles.pillarScoreMax}>/100</Text>
              </Text>
            </View>

            {/* Meter Bar */}
            <View style={styles.meterTrack}>
              <View
                style={[
                  styles.meterFill,
                  {
                    width: `${auditResult.totpCoverage.score}%`,
                    backgroundColor:
                      auditResult.totpCoverage.score >= 80
                        ? colors.emerald
                        : auditResult.totpCoverage.score >= 50
                        ? colors.amber
                        : colors.crimson,
                  },
                ]}
              />
            </View>

            <View style={styles.pillarFooter}>
              <Text style={styles.pillarFootnote}>
                {auditResult.totpCoverage.coveragePercentage}% accounts protected ·{' '}
                {auditResult.totpCoverage.missing2FACount} single-factor
              </Text>
              <Text style={styles.pillarActionHint}>Inspect issues →</Text>
            </View>
          </Pressable>

          {/* Pillar 3: Vault Protection */}
          <Pressable
            onPress={() => setIsAutoLockModalOpen(true)}
            style={({ pressed }) => [
              styles.pillarCard,
              pressed && styles.pillarCardPressed,
            ]}
          >
            <View style={styles.pillarHeader}>
              <View style={styles.pillarTitleGroup}>
                <Ionicons name="lock-closed" size={15} color="#60A5FA" />
                <Text style={styles.pillarTitle}>Vault Perimeter</Text>
              </View>
              <Text style={styles.pillarScore}>
                {auditResult.vaultProtection.score}
                <Text style={styles.pillarScoreMax}>/100</Text>
              </Text>
            </View>

            {/* Meter Bar */}
            <View style={styles.meterTrack}>
              <View
                style={[
                  styles.meterFill,
                  {
                    width: `${auditResult.vaultProtection.score}%`,
                    backgroundColor:
                      auditResult.vaultProtection.score >= 80
                        ? colors.emerald
                        : colors.amber,
                  },
                ]}
              />
            </View>

            <View style={styles.pillarFooter}>
              <Text style={styles.pillarFootnote}>
                Lock: {auditResult.vaultProtection.autoLockTimeout} · Biometrics: Active
              </Text>
              <Text style={styles.pillarActionHint}>Adjust lock →</Text>
            </View>
          </Pressable>
        </View>

        {/* Encrypted Backup & Restore Quick Link */}
        {onOpenBackup && (
          <Pressable
            onPress={onOpenBackup}
            style={({ pressed }) => [
              styles.backupBannerCard,
              pressed && styles.pillarCardPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Encrypted Backup and Restore"
          >
            <View style={styles.backupBannerIconBox}>
              <Ionicons name="cloud-upload" size={18} color="#8B5CF6" />
            </View>
            <View style={styles.backupBannerText}>
              <Text style={styles.backupBannerTitle}>Encrypted .vaultnote Backup</Text>
              <Text style={styles.backupBannerSubtitle}>
                Zero-knowledge export &amp; pre-flight restore
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </Pressable>
        )}

        {/* Actionable Findings Header & Tabs */}
        <View style={styles.issuesHeader}>
          <Text style={styles.sectionHeading}>
            FINDINGS & RECOMMENDATIONS ({auditResult.issues.length})
          </Text>

          <View style={styles.tabRow}>
            {(['all', 'critical', 'warning', 'info'] as FilterTab[]).map((tab) => {
              const isActive = activeTab === tab;
              const count =
                tab === 'all'
                  ? auditResult.issues.length
                  : tab === 'critical'
                  ? auditResult.criticalCount
                  : tab === 'warning'
                  ? auditResult.warningCount
                  : auditResult.infoCount;

              return (
                <Pressable
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  style={[
                    styles.tabButton,
                    isActive && styles.tabButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.tabText,
                      isActive && styles.tabTextActive,
                    ]}
                  >
                    {tab.toUpperCase()} ({count})
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Issues List or Clean State */}
        {displayedIssues.length > 0 ? (
          displayedIssues.map((issue) => (
            <SecurityAuditIssueCard
              key={issue.id}
              issue={issue}
              onResolve={handleResolveIssue}
              onSelectItemId={handleSelectItemId}
            />
          ))
        ) : (
          <View style={styles.pristineCard}>
            <View style={styles.pristineIconWrapper}>
              <Ionicons name="checkmark-circle" size={32} color={colors.emerald} />
            </View>
            <Text style={styles.pristineTitle}>No Issues Found</Text>
            <Text style={styles.pristineSubtitle}>
              {activeTab === 'all'
                ? 'All credentials and perimeter protection settings meet elite zero-knowledge standards.'
                : `No ${activeTab} issues detected in this category.`}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Auto-Lock Configuration Modal */}
      <Modal
        visible={isAutoLockModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsAutoLockModalOpen(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setIsAutoLockModalOpen(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Ionicons name="timer-outline" size={20} color="#A78BFA" />
              <Text style={styles.modalTitle}>Auto-Lock Timeout</Text>
              <Pressable
                onPress={() => setIsAutoLockModalOpen(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </Pressable>
            </View>

            <Text style={styles.modalSubtitle}>
              Select inactivity window before master cryptographic keys are wiped from volatile memory.
            </Text>

            <View style={styles.optionsList}>
              {AUTO_LOCK_OPTIONS.map((opt) => {
                const isSelected = currentAutoLock === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => handleSelectAutoLock(opt.id)}
                    style={({ pressed }) => [
                      styles.optionRow,
                      isSelected && styles.optionRowSelected,
                      pressed && styles.optionRowPressed,
                    ]}
                  >
                    <View style={styles.optionLeft}>
                      <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                        {opt.label}
                      </Text>
                      <Text style={styles.optionDesc}>{opt.desc}</Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={18} color="#A78BFA" />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Account Picker Modal for multi-account issues */}
      <Modal
        visible={Boolean(accountPickerIssue)}
        transparent
        animationType="fade"
        onRequestClose={() => setAccountPickerIssue(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setAccountPickerIssue(null)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Ionicons name="shield-outline" size={20} color="#A78BFA" />
              <Text style={styles.modalTitle}>Select Account to Resolve</Text>
              <Pressable
                onPress={() => setAccountPickerIssue(null)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </Pressable>
            </View>

            <Text style={styles.modalSubtitle}>
              {accountPickerIssue?.title ?? 'Multiple credentials affected'}
            </Text>

            <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
              {accountPickerIssue?.affectedItemIds.map((itemId, idx) => {
                const item = getItemById(itemId);
                const title = accountPickerIssue.affectedItemTitles[idx] || item?.title || itemId;
                return (
                  <Pressable
                    key={itemId}
                    onPress={() => handlePickAccount(itemId)}
                    style={({ pressed }) => [
                      styles.accountPickerRow,
                      pressed && styles.accountPickerRowPressed,
                    ]}
                  >
                    <View style={styles.accountIconCircle}>
                      <Ionicons name="key" size={14} color="#C4B5FD" />
                    </View>
                    <View style={styles.accountInfoGroup}>
                      <Text style={styles.accountTitle}>{title}</Text>
                      <Text style={styles.accountSubtext}>
                        {accountPickerIssue.type === 'MISSING_2FA'
                          ? 'Setup 2FA Key'
                          : 'Update Password'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  toastContainer: {
    position: 'absolute',
    top: 54,
    left: spacing.md,
    right: spacing.md,
    zIndex: 9999,
    backgroundColor: 'rgba(24, 24, 27, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.35)',
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  toastText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E4E4E7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitleGroup: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  zeroKnowledgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34D399',
    marginRight: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  reAuditButton: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: 'rgba(167, 139, 250, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reAuditButtonPressed: {
    backgroundColor: 'rgba(167, 139, 250, 0.22)',
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl * 2,
  },
  heroCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.035)',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  heroLeft: {
    marginRight: spacing.md,
  },
  heroRight: {
    flex: 1,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    marginBottom: 6,
  },
  ratingPillText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  summaryText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
    marginBottom: spacing.sm,
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: radius.md,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  heroStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatDivider: {
    width: 1,
    height: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  heroStatValue: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily.mono,
  },
  heroStatLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.textTertiary,
    textTransform: 'uppercase',
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textTertiary,
    letterSpacing: 1,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  pillarsContainer: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  pillarCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: spacing.sm + 2,
  },
  pillarCardPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  pillarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  pillarTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pillarTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  pillarScore: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily.mono,
  },
  pillarScoreMax: {
    fontSize: 10,
    color: colors.textTertiary,
    fontWeight: '500',
  },
  meterTrack: {
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  meterFill: {
    height: '100%',
    borderRadius: 3,
  },
  pillarFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pillarFootnote: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  pillarActionHint: {
    fontSize: 10,
    color: '#A78BFA',
    fontWeight: '600',
  },
  issuesHeader: {
    marginBottom: spacing.sm,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  tabButton: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  tabButtonActive: {
    backgroundColor: 'rgba(167, 139, 250, 0.18)',
    borderColor: 'rgba(167, 139, 250, 0.45)',
  },
  tabText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  tabTextActive: {
    color: '#DDD6FE',
  },
  pristineCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    padding: spacing.xl,
    marginTop: spacing.sm,
  },
  pristineIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  pristineTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.emerald,
    marginBottom: 4,
  },
  pristineSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalContent: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#18181B',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
    marginLeft: 8,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
    marginBottom: spacing.md,
  },
  optionsList: {
    gap: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.035)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: spacing.sm + 2,
  },
  optionRowSelected: {
    backgroundColor: 'rgba(167, 139, 250, 0.12)',
    borderColor: 'rgba(167, 139, 250, 0.35)',
  },
  optionRowPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  optionLeft: {
    flex: 1,
    marginRight: 8,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  optionLabelSelected: {
    color: '#DDD6FE',
  },
  optionDesc: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  accountPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.035)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: spacing.sm,
    marginBottom: 8,
  },
  accountPickerRowPressed: {
    backgroundColor: 'rgba(167, 139, 250, 0.15)',
  },
  accountIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(167, 139, 250, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  accountInfoGroup: {
    flex: 1,
  },
  accountTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  accountSubtext: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  backupBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.25)',
    gap: spacing.sm,
  },
  backupBannerIconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: 'rgba(139, 92, 246, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backupBannerText: {
    flex: 1,
  },
  backupBannerTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  backupBannerSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
