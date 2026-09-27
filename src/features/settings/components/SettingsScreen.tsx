/**
 * SettingsScreen Component
 * Executive-grade security configurations, auto-lock policies,
 * clipboard isolation controls, and cryptographic specifications.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography, useTheme, ThemeMode } from '../../../theme';
import { VaultSessionManager, useSessionStore } from '../../../core/session';
import { AutoLockTimeout } from '../../../core/session/types';
import { ClipboardManager } from '../../../core/clipboard/clipboardManager';
import { useVaultStore } from '../../vault/store/useVaultStore';
import { useSecurityAudit } from '../../security-center/hooks/useSecurityAudit';

export interface SettingsScreenProps {
  onOpenSecurity?: () => void;
  onOpenBackup?: () => void;
  onOpenFavorites?: () => void;
  onLock?: () => void;
}

interface AutoLockOption {
  id: AutoLockTimeout;
  label: string;
  subtitle: string;
}

const TIMEOUT_OPTIONS: AutoLockOption[] = [
  { id: 'immediate', label: 'Immediate', subtitle: 'Locks instantly on background' },
  { id: '1m', label: '1 Minute', subtitle: 'Recommended for high security' },
  { id: '5m', label: '5 Minutes', subtitle: 'Standard balanced policy' },
  { id: '15m', label: '15 Minutes', subtitle: 'Extended convenience period' },
  { id: 'never', label: 'Never', subtitle: 'Manual lock required' },
];

interface ThemeOption {
  id: ThemeMode;
  label: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  bg: string;
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'dark',
    label: 'Dark Mode',
    subtitle: 'Obsidian dark palette with glowing accents',
    icon: 'moon',
    iconColor: '#9D8DFF',
    bg: 'rgba(123, 97, 255, 0.14)',
  },
  {
    id: 'light',
    label: 'Light Mode',
    subtitle: 'High-contrast clean light aesthetic',
    icon: 'sunny',
    iconColor: '#F59E0B',
    bg: 'rgba(245, 158, 11, 0.14)',
  },
  {
    id: 'system',
    label: 'System Default',
    subtitle: 'Follow device OS theme mode',
    icon: 'phone-portrait-outline',
    iconColor: '#10B981',
    bg: 'rgba(16, 185, 129, 0.14)',
  },
];

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onOpenSecurity,
  onOpenBackup,
  onOpenFavorites,
  onLock,
}) => {
  const { themeMode, setThemeMode, colors: activeColors, isDark } = useTheme();
  const currentTimeout = useSessionStore((s) => s.autoLockTimeout);
  const isPrivacyShieldEnabled = useSessionStore((s) => s.isPrivacyShieldEnabled);
  const setPrivacyShieldEnabled = useSessionStore((s) => s.setPrivacyShieldEnabled);
  const items = useVaultStore((s) => s.items);

  const { auditResult } = useSecurityAudit();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2400);
  }, []);

  const handleThemeChange = useCallback(
    async (mode: ThemeMode) => {
      await setThemeMode(mode);
      const label = mode === 'dark' ? 'Dark theme' : mode === 'light' ? 'Light theme' : 'System theme';
      triggerToast(`Appearance set to ${label}`);
    },
    [setThemeMode, triggerToast]
  );

  const handleTimeoutChange = useCallback((timeout: AutoLockTimeout) => {
    VaultSessionManager.setAutoLockTimeout(timeout);
    triggerToast(`Auto-lock timeout updated to ${timeout}`);
  }, [triggerToast]);

  const handlePurgeClipboard = useCallback(async () => {
    await ClipboardManager.clearNow();
    triggerToast('Clipboard purged & zeroized');
  }, [triggerToast]);

  const handleLock = useCallback(() => {
    if (onLock) {
      onLock();
    } else {
      VaultSessionManager.lock();
    }
  }, [onLock]);

  const favoriteCount = items.filter((i) => i.isFavorite).length;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: activeColors.background }]} edges={['top', 'left', 'right']}>
      {/* Toast Alert Banner */}
      {toastMessage && (
        <View style={[styles.toastContainer, !isDark && { backgroundColor: activeColors.surface, borderColor: activeColors.emeraldBorder }]}>
          <Ionicons name="checkmark-circle" size={16} color={colors.emerald} />
          <Text style={[styles.toastText, { color: activeColors.textPrimary }]}>{toastMessage}</Text>
        </View>
      )}

      {/* Screen Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.screenTitle, { color: activeColors.textPrimary }]}>Settings</Text>
          <Text style={[styles.screenSubtitle, { color: activeColors.textSecondary }]}>Security Controls & Architecture</Text>
        </View>
        <Pressable
          onPress={handleLock}
          style={({ pressed }) => [
            styles.headerLockBtn,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Lock Vault Now"
        >
          <Ionicons name="lock-closed" size={16} color={colors.crimson} />
          <Text style={styles.headerLockText}>Lock</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Card */}
        <View
          style={[
            styles.statusCard,
            !isDark && {
              backgroundColor: activeColors.surface,
              borderColor: activeColors.border,
              shadowColor: '#0F172A',
              shadowOpacity: 0.04,
              shadowOffset: { width: 0, height: 2 },
              shadowRadius: 6,
              elevation: 1,
            },
          ]}
        >
          <View style={styles.statusCardGlow} />
          <View style={styles.statusHeaderRow}>
            <View style={styles.statusIconWrap}>
              <Ionicons name="shield-checkmark" size={24} color={colors.emerald} />
            </View>
            <View style={styles.statusTextGroup}>
              <View style={styles.statusBadgeRow}>
                <View style={styles.pulsingDot} />
                <Text style={styles.statusBadgeText}>Vault Unlocked & Active</Text>
              </View>
              <Text style={[styles.statusTitle, { color: activeColors.textPrimary }]}>Argon2id + AES-256-GCM</Text>
              <Text style={[styles.statusSubtitle, { color: activeColors.textSecondary }]}>
                {items.length} Protected Items in Volatile RAM
              </Text>
            </View>
          </View>
        </View>

        {/* Section: Hub Navigation */}
        <Text style={[styles.sectionHeader, { color: activeColors.textTertiary }]}>SECURITY HUBS</Text>
        <View
          style={[
            styles.cardGroup,
            !isDark && {
              backgroundColor: activeColors.surface,
              borderColor: activeColors.border,
              shadowColor: '#0F172A',
              shadowOpacity: 0.04,
              shadowOffset: { width: 0, height: 2 },
              shadowRadius: 6,
              elevation: 1,
            },
          ]}
        >
          {/* Security Center Hub */}
          <Pressable
            onPress={onOpenSecurity}
            style={({ pressed }) => [
              styles.hubRow,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Open Security Center"
          >
            <View style={[styles.hubIconWrap, { backgroundColor: isDark ? colors.primaryMuted : activeColors.primaryMuted }]}>
              <Ionicons name="shield-half" size={20} color={isDark ? colors.primary : activeColors.primary} />
            </View>
            <View style={styles.hubContent}>
              <Text style={[styles.hubTitle, { color: activeColors.textPrimary }]}>Security Center</Text>
              <Text style={[styles.hubSubtitle, { color: activeColors.textSecondary }]}>Password health, reuse & 2FA hygiene</Text>
            </View>
            <View style={styles.hubScoreBadge}>
              <Text style={styles.hubScoreText}>{auditResult.overallScore}/100</Text>
              <Ionicons name="chevron-forward" size={16} color={activeColors.textTertiary} />
            </View>
          </Pressable>

          <View style={[styles.divider, !isDark && { backgroundColor: activeColors.borderSubtle }]} />

          {/* Backup & Restore Hub */}
          <Pressable
            onPress={onOpenBackup}
            style={({ pressed }) => [
              styles.hubRow,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Open Backup and Restore"
          >
            <View style={[styles.hubIconWrap, { backgroundColor: colors.emeraldMuted }]}>
              <Ionicons name="cloud-upload-outline" size={20} color={colors.emerald} />
            </View>
            <View style={styles.hubContent}>
              <Text style={[styles.hubTitle, { color: activeColors.textPrimary }]}>Encrypted Backup</Text>
              <Text style={[styles.hubSubtitle, { color: activeColors.textSecondary }]}>Export & restore .vaultnote envelopes</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={activeColors.textTertiary} />
          </Pressable>

          <View style={[styles.divider, !isDark && { backgroundColor: activeColors.borderSubtle }]} />

          {/* Favorites Hub */}
          <Pressable
            onPress={onOpenFavorites}
            style={({ pressed }) => [
              styles.hubRow,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Open Favorites"
          >
            <View style={[styles.hubIconWrap, { backgroundColor: colors.amberMuted }]}>
              <Ionicons name="star" size={20} color={colors.gold} />
            </View>
            <View style={styles.hubContent}>
              <Text style={[styles.hubTitle, { color: activeColors.textPrimary }]}>Favorites Hub</Text>
              <Text style={[styles.hubSubtitle, { color: activeColors.textSecondary }]}>Quick access to pinned credentials</Text>
            </View>
            <View style={styles.favBadge}>
              <Text style={styles.favBadgeText}>{favoriteCount}</Text>
              <Ionicons name="chevron-forward" size={16} color={activeColors.textTertiary} />
            </View>
          </Pressable>
        </View>

        {/* Section: Appearance & Theme */}
        <Text style={[styles.sectionHeader, { color: activeColors.textTertiary }]}>APPEARANCE & THEME</Text>
        <View
          style={[
            styles.cardGroup,
            !isDark && {
              backgroundColor: activeColors.surface,
              borderColor: activeColors.border,
              shadowColor: '#0F172A',
              shadowOpacity: 0.04,
              shadowOffset: { width: 0, height: 2 },
              shadowRadius: 6,
              elevation: 1,
            },
          ]}
        >
          {THEME_OPTIONS.map((opt, idx) => {
            const isSelected = themeMode === opt.id;
            return (
              <React.Fragment key={opt.id}>
                {idx > 0 && <View style={[styles.divider, !isDark && { backgroundColor: activeColors.borderSubtle }]} />}
                <Pressable
                  onPress={() => handleThemeChange(opt.id)}
                  style={({ pressed }) => [
                    styles.timeoutOptionRow,
                    isSelected && styles.timeoutOptionRowSelected,
                    isSelected && !isDark && { backgroundColor: activeColors.primaryMuted },
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`Switch to ${opt.label}`}
                >
                  <View style={styles.timeoutLeft}>
                    <View
                      style={[
                        styles.radioCircle,
                        !isDark && { borderColor: activeColors.borderActive },
                        isSelected && styles.radioCircleSelected,
                        isSelected && !isDark && { borderColor: activeColors.primary },
                      ]}
                    >
                      {isSelected && <View style={[styles.radioInner, !isDark && { backgroundColor: activeColors.primary }]} />}
                    </View>
                    <View style={[styles.hubIconWrap, { backgroundColor: opt.bg, marginRight: 8 }]}>
                      <Ionicons name={opt.icon} size={18} color={opt.iconColor} />
                    </View>
                    <View style={styles.timeoutTextGroup}>
                      <Text
                        style={[
                          styles.timeoutLabel,
                          { color: activeColors.textPrimary },
                          isSelected && styles.timeoutLabelSelected,
                          isSelected && !isDark && { color: activeColors.primary },
                        ]}
                      >
                        {opt.label}
                      </Text>
                      <Text style={[styles.timeoutSubtitle, { color: activeColors.textSecondary }]}>{opt.subtitle}</Text>
                    </View>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark" size={18} color={isDark ? colors.primary : activeColors.primary} />
                  )}
                </Pressable>
              </React.Fragment>
            );
          })}
        </View>

        {/* Section: Session & Privacy Controls */}
        <Text style={[styles.sectionHeader, { color: activeColors.textTertiary }]}>SESSION & PRIVACY</Text>
        <View
          style={[
            styles.cardGroup,
            !isDark && {
              backgroundColor: activeColors.surface,
              borderColor: activeColors.border,
              shadowColor: '#0F172A',
              shadowOpacity: 0.04,
              shadowOffset: { width: 0, height: 2 },
              shadowRadius: 6,
              elevation: 1,
            },
          ]}
        >
          {/* Privacy Shield Toggle */}
          <View style={styles.settingToggleRow}>
            <View style={[styles.hubIconWrap, { backgroundColor: 'rgba(96, 165, 250, 0.12)' }]}>
              <Ionicons name="eye-off-outline" size={20} color="#60A5FA" />
            </View>
            <View style={styles.hubContent}>
              <Text style={[styles.hubTitle, { color: activeColors.textPrimary }]}>Multitasking Privacy Shield</Text>
              <Text style={[styles.hubSubtitle, { color: activeColors.textSecondary }]}>Hides contents in system app switcher</Text>
            </View>
            <Switch
              value={isPrivacyShieldEnabled}
              onValueChange={(val) => {
                setPrivacyShieldEnabled(val);
                triggerToast(val ? 'Privacy shield enabled' : 'Privacy shield disabled');
              }}
              trackColor={{ false: isDark ? colors.surfaceActive : activeColors.surfaceSubtle, true: activeColors.primary }}
              thumbColor={activeColors.textPrimary}
            />
          </View>

          <View style={[styles.divider, !isDark && { backgroundColor: activeColors.borderSubtle }]} />

          {/* Clipboard Purge Action */}
          <View style={styles.settingActionRow}>
            <View style={[styles.hubIconWrap, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
              <Ionicons name="clipboard-outline" size={20} color={colors.crimson} />
            </View>
            <View style={styles.hubContent}>
              <Text style={[styles.hubTitle, { color: activeColors.textPrimary }]}>Clipboard Auto-Purge</Text>
              <Text style={[styles.hubSubtitle, { color: activeColors.textSecondary }]}>30s TTL with immediate manual wipe</Text>
            </View>
            <Pressable
              onPress={handlePurgeClipboard}
              style={({ pressed }) => [
                styles.actionBtn,
                !isDark && { backgroundColor: activeColors.surfaceSubtle, borderColor: activeColors.border },
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Purge Clipboard Now"
            >
              <Text style={[styles.actionBtnText, !isDark && { color: activeColors.crimson }]}>Purge Now</Text>
            </Pressable>
          </View>
        </View>

        {/* Section: Auto-Lock Timeout */}
        <Text style={[styles.sectionHeader, { color: activeColors.textTertiary }]}>AUTO-LOCK TIMEOUT POLICY</Text>
        <View
          style={[
            styles.cardGroup,
            !isDark && {
              backgroundColor: activeColors.surface,
              borderColor: activeColors.border,
              shadowColor: '#0F172A',
              shadowOpacity: 0.04,
              shadowOffset: { width: 0, height: 2 },
              shadowRadius: 6,
              elevation: 1,
            },
          ]}
        >
          {TIMEOUT_OPTIONS.map((opt, idx) => {
            const isSelected = currentTimeout === opt.id;
            return (
              <React.Fragment key={opt.id}>
                {idx > 0 && <View style={[styles.divider, !isDark && { backgroundColor: activeColors.borderSubtle }]} />}
                <Pressable
                  onPress={() => handleTimeoutChange(opt.id)}
                  style={({ pressed }) => [
                    styles.timeoutOptionRow,
                    isSelected && styles.timeoutOptionRowSelected,
                    isSelected && !isDark && { backgroundColor: activeColors.primaryMuted },
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                >
                  <View style={styles.timeoutLeft}>
                    <View
                      style={[
                        styles.radioCircle,
                        !isDark && { borderColor: activeColors.borderActive },
                        isSelected && styles.radioCircleSelected,
                        isSelected && !isDark && { borderColor: activeColors.primary },
                      ]}
                    >
                      {isSelected && <View style={[styles.radioInner, !isDark && { backgroundColor: activeColors.primary }]} />}
                    </View>
                    <View style={styles.timeoutTextGroup}>
                      <Text
                        style={[
                          styles.timeoutLabel,
                          { color: activeColors.textPrimary },
                          isSelected && styles.timeoutLabelSelected,
                          isSelected && !isDark && { color: activeColors.primary },
                        ]}
                      >
                        {opt.label}
                      </Text>
                      <Text style={[styles.timeoutSubtitle, { color: activeColors.textSecondary }]}>{opt.subtitle}</Text>
                    </View>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark" size={18} color={isDark ? colors.primary : activeColors.primary} />
                  )}
                </Pressable>
              </React.Fragment>
            );
          })}
        </View>

        {/* Section: Cryptographic Specs */}
        <Text style={[styles.sectionHeader, { color: activeColors.textTertiary }]}>CRYPTOGRAPHIC SPECIFICATIONS</Text>
        <View
          style={[
            styles.cardGroup,
            !isDark && {
              backgroundColor: activeColors.surface,
              borderColor: activeColors.border,
              shadowColor: '#0F172A',
              shadowOpacity: 0.04,
              shadowOffset: { width: 0, height: 2 },
              shadowRadius: 6,
              elevation: 1,
            },
          ]}
        >
          <View style={styles.specRow}>
            <Text style={[styles.specLabel, { color: activeColors.textSecondary }]}>Key Derivation</Text>
            <Text style={[styles.specValue, { color: activeColors.textPrimary }]}>Argon2id (RFC 9106, 19 MiB RAM)</Text>
          </View>
          <View style={[styles.divider, !isDark && { backgroundColor: activeColors.borderSubtle }]} />
          <View style={styles.specRow}>
            <Text style={[styles.specLabel, { color: activeColors.textSecondary }]}>Symmetric Cipher</Text>
            <Text style={[styles.specValue, { color: activeColors.textPrimary }]}>AES-256-GCM (96-bit Nonce, 128-bit Tag)</Text>
          </View>
          <View style={[styles.divider, !isDark && { backgroundColor: activeColors.borderSubtle }]} />
          <View style={styles.specRow}>
            <Text style={[styles.specLabel, { color: activeColors.textSecondary }]}>Entropy Generator</Text>
            <Text style={[styles.specValue, { color: activeColors.textPrimary }]}>OS Hardware CSPRNG</Text>
          </View>
          <View style={[styles.divider, !isDark && { backgroundColor: activeColors.borderSubtle }]} />
          <View style={styles.specRow}>
            <Text style={[styles.specLabel, { color: activeColors.textSecondary }]}>Recovery Phrase</Text>
            <Text style={[styles.specValue, { color: activeColors.textPrimary }]}>24-Word BIP-39 Standard</Text>
          </View>
          <View style={[styles.divider, !isDark && { backgroundColor: activeColors.borderSubtle }]} />
          <View style={styles.specRow}>
            <Text style={[styles.specLabel, { color: activeColors.textSecondary }]}>OTP Engine</Text>
            <Text style={[styles.specValue, { color: activeColors.textPrimary }]}>Offline RFC 6238 TOTP (SHA1/256/512)</Text>
          </View>
          <View style={[styles.divider, !isDark && { backgroundColor: activeColors.borderSubtle }]} />
          <View style={styles.specRow}>
            <Text style={[styles.specLabel, { color: activeColors.textSecondary }]}>Network Footprint</Text>
            <Text style={[styles.specValue, { color: activeColors.textPrimary }]}>Zero Telemetry, 100% Offline</Text>
          </View>
          <View style={[styles.divider, !isDark && { backgroundColor: activeColors.borderSubtle }]} />
          <View style={styles.specRow}>
            <Text style={[styles.specLabel, { color: activeColors.textSecondary }]}>App Version</Text>
            <Text style={[styles.specValue, { color: activeColors.textPrimary }]}>VaultNote v1.0.0 (Production)</Text>
          </View>
        </View>

        {/* Bottom Danger Action: Lock Vault */}
        <View style={styles.lockVaultSection}>
          <Pressable
            onPress={handleLock}
            style={({ pressed }) => [
              styles.lockVaultButton,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Lock Vault & Zeroize Memory"
          >
            <Ionicons name="lock-closed" size={18} color="#FFFFFF" />
            <Text style={styles.lockVaultButtonText}>Lock Vault & Zeroize Memory</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  screenTitle: {
    fontFamily: typography.fontFamily.sans,
    fontWeight: '700',
    fontSize: 24,
    color: colors.textPrimary,
  },
  screenSubtitle: {
    fontFamily: typography.fontFamily.sans,
    fontWeight: '400',
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  headerLockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.crimsonMuted,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    gap: 6,
  },
  headerLockText: {
    fontFamily: typography.fontFamily.sans,
    fontWeight: '600',
    fontSize: 12,
    color: colors.crimson,
  },
  toastContainer: {
    position: 'absolute',
    top: 50,
    alignSelf: 'center',
    zIndex: 999,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.emeraldBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  toastText: {
    fontFamily: typography.fontFamily.sans,
    fontWeight: '500',
    fontSize: 12,
    color: colors.textPrimary,
  },
  statusCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  statusCardGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.emerald,
  },
  statusHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  statusIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.emeraldMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.emeraldBorder,
  },
  statusTextGroup: {
    flex: 1,
  },
  statusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulsingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.emerald,
  },
  statusBadgeText: {
    fontFamily: typography.fontFamily.sans,
    fontWeight: '600',
    fontSize: 11,
    color: colors.emerald,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  statusTitle: {
    fontFamily: typography.fontFamily.sans,
    fontWeight: '700',
    fontSize: 16,
    color: colors.textPrimary,
    marginTop: 2,
  },
  statusSubtitle: {
    fontFamily: typography.fontFamily.sans,
    fontWeight: '400',
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  sectionHeader: {
    fontFamily: typography.fontFamily.sans,
    fontWeight: '600',
    fontSize: 11,
    color: colors.textTertiary,
    letterSpacing: 1,
    marginTop: spacing.xl,
    marginBottom: spacing.xs,
    marginLeft: spacing.xs,
  },
  cardGroup: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  hubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  hubIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  hubContent: {
    flex: 1,
  },
  hubTitle: {
    fontFamily: typography.fontFamily.sans,
    fontWeight: '500',
    fontSize: 14,
    color: colors.textPrimary,
  },
  hubSubtitle: {
    fontFamily: typography.fontFamily.sans,
    fontWeight: '400',
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  hubScoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hubScoreText: {
    fontFamily: typography.fontFamily.sans,
    fontWeight: '600',
    fontSize: 12,
    color: colors.emerald,
  },
  favBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  favBadgeText: {
    fontFamily: typography.fontFamily.sans,
    fontWeight: '600',
    fontSize: 12,
    color: colors.gold,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginLeft: 56,
  },
  settingToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  settingActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  actionBtn: {
    backgroundColor: colors.surfaceActive,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  actionBtnText: {
    fontFamily: typography.fontFamily.sans,
    fontWeight: '500',
    fontSize: 12,
    color: colors.crimson,
  },
  timeoutOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  timeoutOptionRowSelected: {
    backgroundColor: 'rgba(123, 97, 255, 0.05)',
  },
  timeoutLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.borderActive,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  radioCircleSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  timeoutTextGroup: {
    flex: 1,
  },
  timeoutLabel: {
    fontFamily: typography.fontFamily.sans,
    fontWeight: '500',
    fontSize: 14,
    color: colors.textPrimary,
  },
  timeoutLabelSelected: {
    fontFamily: typography.fontFamily.sans,
    fontWeight: '600',
    color: colors.primaryLight,
  },
  timeoutSubtitle: {
    fontFamily: typography.fontFamily.sans,
    fontWeight: '400',
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 1,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  specLabel: {
    fontFamily: typography.fontFamily.sans,
    fontWeight: '500',
    fontSize: 12,
    color: colors.textSecondary,
  },
  specValue: {
    fontFamily: typography.fontFamily.sans,
    fontWeight: '400',
    fontSize: 12,
    color: colors.textPrimary,
    textAlign: 'right',
  },
  lockVaultSection: {
    marginTop: spacing.xl,
  },
  lockVaultButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.crimsonDark,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    gap: 8,
  },
  lockVaultButtonText: {
    fontFamily: typography.fontFamily.sans,
    fontWeight: '600',
    fontSize: 14,
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.75,
  },
});
