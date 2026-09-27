/**
 * TOTPCard Component
 * Obsidian-styled credential detail card for Two-Factor Authentication
 * Renders live offline TOTP countdown, token rotation cadence, and configuration triggers
 */

import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { colors, radius, spacing, typography, useTheme } from '../../../theme';
import { useTOTP } from '../hooks/useTOTP';
import { CountdownRing } from './CountdownRing';
import { useClipboardManager } from '../../../core/clipboard';
import type { TOTPRecord, TOTPAlgorithm } from '../types';

export interface TOTPCardProps {
  /** Attached TOTP record or item configuration */
  record?: TOTPRecord | null;
  /** Direct secret key (used if record is not provided) */
  secret?: string;
  /** Issuer / Service name */
  issuer?: string;
  /** Account / Username */
  account?: string;
  /** Cryptographic hash algorithm (default: SHA1) */
  algorithm?: TOTPAlgorithm;
  /** Number of digits (default: 6) */
  digits?: number;
  /** Rotation duration in seconds (default: 30) */
  period?: number;
  /** Attached Credential ID */
  credentialId?: string;
  /** Callback to trigger settings modal */
  onOpenSettings?: () => void;
  /** Callback fired after code is copied */
  onCopy?: (code: string) => void;
  /** Toggle visibility of settings button (default: true) */
  showSettings?: boolean;
}

export const TOTPCard: React.FC<TOTPCardProps> = ({
  record,
  secret: directSecret,
  issuer: directIssuer,
  account: directAccount,
  algorithm: directAlgorithm,
  digits: directDigits,
  period: directPeriod,
  onOpenSettings,
  onCopy,
  showSettings = true,
}) => {
  const effectiveSecret = (record?.secret || directSecret || '').trim();
  const effectiveIssuer = record?.issuer || directIssuer || 'Two-Factor Authentication';
  const effectiveAccount = record?.account || directAccount || '';
  const effectiveAlgorithm = (record?.algorithm || directAlgorithm || 'SHA1') as TOTPAlgorithm;
  const effectiveDigits = (record?.digits || directDigits || 6) as 6 | 8;
  const effectivePeriod = record?.period || directPeriod || 30;

  const { isDark, colors: activeColors } = useTheme();

  const {
    code,
    formattedCode,
    remainingSeconds,
    progress,
    isExpiringSoon,
    isValidSecret,
    error,
  } = useTOTP(effectiveSecret, {
    algorithm: effectiveAlgorithm,
    digits: effectiveDigits,
    period: effectivePeriod,
  });

  const { copySecret } = useClipboardManager();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!isValidSecret || code === '------') return;
    const rawDigits = code.replace(/\s/g, '');
    await copySecret(rawDigits, `${effectiveIssuer} OTP`, 30);
    setCopied(true);
    onCopy?.(rawDigits);
    setTimeout(() => setCopied(false), 2000);
  };

  // If no secret is configured, display setup action if onOpenSettings is provided
  if (!effectiveSecret) {
    if (!onOpenSettings) return null;
    return (
      <View style={styles.cardContainer}>
        <View style={[styles.setupCard, !isDark && { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
          <View style={[styles.setupIconCircle, !isDark && { backgroundColor: 'rgba(79, 70, 229, 0.10)' }]}>
            <Ionicons name="shield-outline" size={24} color={!isDark ? activeColors.primary : colors.primaryLight} />
          </View>
          <View style={styles.setupInfo}>
            <Text style={[styles.setupTitle, !isDark && { color: activeColors.textPrimary }]}>Two-Factor Authentication</Text>
            <Text style={[styles.setupSubtitle, !isDark && { color: activeColors.textSecondary }]}>Protect this login with time-based OTP codes</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.setupButton, !isDark && { backgroundColor: activeColors.primary }, pressed && styles.buttonPressed]}
            onPress={onOpenSettings}
            accessibilityRole="button"
            accessibilityLabel="Set up Two-Factor Authentication"
          >
            <Ionicons name="add" size={16} color={!isDark ? '#FFFFFF' : colors.textPrimary} style={{ marginRight: 4 }} />
            <Text style={[styles.setupButtonText, !isDark && { color: '#FFFFFF' }]}>Setup</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const codeColor = isExpiringSoon
    ? activeColors.crimson
    : remainingSeconds <= 7
    ? (isDark ? colors.gold : '#D97706')
    : activeColors.textPrimary;

  return (
    <View style={styles.cardContainer}>
      <View
        style={[
          styles.card,
          !isDark && {
            backgroundColor: activeColors.surface,
            borderColor: activeColors.border,
            shadowColor: '#0F172A',
            shadowOpacity: 0.04,
            shadowRadius: 3,
            elevation: 2,
          },
          isExpiringSoon && (isDark ? styles.cardExpiring : styles.cardExpiringLight),
        ]}
      >
        {/* Card Header Row */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={[styles.statusDot, isExpiringSoon && styles.statusDotExpiring]} />
            <Text style={[styles.headerTitle, !isDark && { color: activeColors.textSecondary }]}>TWO-FACTOR AUTHENTICATION</Text>
          </View>

          <View style={styles.headerRight}>
            <View style={styles.badgeOffline}>
              <Ionicons name="shield-checkmark" size={11} color={colors.emerald} />
              <Text style={styles.badgeOfflineText}>Offline Enclave</Text>
            </View>

            {showSettings && onOpenSettings && (
              <Pressable
                onPress={onOpenSettings}
                style={({ pressed }) => [
                  styles.settingsButton,
                  !isDark && { backgroundColor: activeColors.surfaceSubtle },
                  pressed && styles.buttonPressed,
                ]}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="TOTP Settings"
              >
                <Feather name="settings" size={14} color={activeColors.textSecondary} />
              </Pressable>
            )}
          </View>
        </View>

        {/* Account and Parameters Meta Row */}
        <View style={styles.metaRow}>
          {effectiveAccount.length > 0 && (
            <Text style={[styles.accountText, !isDark && { color: activeColors.textSecondary }]} numberOfLines={1}>
              {effectiveAccount}
            </Text>
          )}

          <View style={styles.specChips}>
            {effectiveAlgorithm !== 'SHA1' && (
              <View style={[styles.specChip, !isDark && { backgroundColor: activeColors.surfaceSubtle }]}>
                <Text style={[styles.specChipText, !isDark && { color: activeColors.textTertiary }]}>{effectiveAlgorithm}</Text>
              </View>
            )}
            {effectiveDigits !== 6 && (
              <View style={[styles.specChip, !isDark && { backgroundColor: activeColors.surfaceSubtle }]}>
                <Text style={[styles.specChipText, !isDark && { color: activeColors.textTertiary }]}>{effectiveDigits} DIGITS</Text>
              </View>
            )}
            {effectivePeriod !== 30 && (
              <View style={[styles.specChip, !isDark && { backgroundColor: activeColors.surfaceSubtle }]}>
                <Text style={[styles.specChipText, !isDark && { color: activeColors.textTertiary }]}>{effectivePeriod}s</Text>
              </View>
            )}
          </View>
        </View>

        {/* Center Display: Large OTP Code + Countdown Ring */}
        <Pressable
          onPress={handleCopy}
          style={({ pressed }) => [
            styles.codeDisplayContainer,
            !isDark && {
              backgroundColor: activeColors.surfaceSubtle,
              borderColor: activeColors.border,
            },
            pressed && (isDark ? styles.codeDisplayPressed : { backgroundColor: activeColors.surfaceActive }),
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Copy OTP Code ${formattedCode}`}
        >
          <View style={styles.codeColumn}>
            <Text
              style={[styles.codeText, { color: codeColor }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {isValidSecret ? formattedCode : 'INVALID SECRET'}
            </Text>

            {error && !isValidSecret && (
              <Text style={styles.errorText} numberOfLines={1}>
                {error}
              </Text>
            )}
          </View>

          <View style={styles.ringWrapper}>
            <CountdownRing
              remainingSeconds={remainingSeconds}
              period={effectivePeriod}
              progress={progress}
              size={42}
              strokeWidth={3.5}
              showSecondsText={true}
            />
          </View>
        </Pressable>

        {/* Footer Actions: [ Copy OTP ] Button */}
        <View style={styles.footerRow}>
          <Pressable
            onPress={handleCopy}
            style={({ pressed }) => [
              styles.copyButton,
              !isDark && {
                backgroundColor: activeColors.surface,
                borderColor: activeColors.border,
              },
              copied && styles.copyButtonActive,
              pressed && styles.buttonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Copy One-Time Password"
          >
            <Ionicons
              name={copied ? 'checkmark-circle' : 'copy-outline'}
              size={15}
              color={copied ? colors.emerald : activeColors.textPrimary}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.copyButtonText, !isDark && { color: activeColors.textPrimary }, copied && styles.copyButtonTextActive]}>
              {copied ? 'Copied to Clipboard' : 'Copy OTP'}
            </Text>
          </Pressable>

          <Text style={[styles.footerCadenceText, !isDark && { color: activeColors.textTertiary }]}>
            Rotates in <Text style={{ color: codeColor, fontWeight: '700' }}>{remainingSeconds}s</Text>
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    marginVertical: spacing.xs,
  },
  card: {
    backgroundColor: '#16181C',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#24272E',
    padding: spacing.md,
  },
  cardExpiring: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
    backgroundColor: '#1A1417',
  },
  cardExpiringLight: {
    borderColor: '#E11D48',
    backgroundColor: '#FFF1F2',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.emerald,
  },
  statusDotExpiring: {
    backgroundColor: colors.crimson,
  },
  headerTitle: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: colors.textMuted,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badgeOffline: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
    gap: 4,
  },
  badgeOfflineText: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 9,
    fontWeight: '600',
    color: colors.emerald,
  },
  settingsButton: {
    padding: 4,
    borderRadius: radius.sm,
    backgroundColor: '#20222A',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  accountText: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 11,
    color: colors.textSecondary,
    flex: 1,
    marginRight: spacing.xs,
  },
  specChips: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  specChip: {
    backgroundColor: '#20222A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  specChipText: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 9,
    fontWeight: '700',
    color: colors.textTertiary,
  },
  codeDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#111216',
    borderWidth: 1,
    borderColor: '#1F2229',
    borderRadius: radius.sm + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginVertical: spacing.xs,
  },
  codeDisplayPressed: {
    backgroundColor: '#191B22',
  },
  codeColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  codeText: {
    fontFamily: typography.fontFamily.mono,
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: 3,
  },
  ringWrapper: {
    marginLeft: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 11,
    color: colors.crimson,
    marginTop: 2,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#20222A',
    borderWidth: 1,
    borderColor: '#2D303B',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.sm,
  },
  copyButtonActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  copyButtonText: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  copyButtonTextActive: {
    color: colors.emerald,
  },
  footerCadenceText: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 11,
    color: colors.textTertiary,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  setupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16181C',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#24272E',
    borderStyle: 'dashed',
    padding: spacing.md,
    gap: spacing.sm,
  },
  setupIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(123, 97, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  setupInfo: {
    flex: 1,
  },
  setupTitle: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  setupSubtitle: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 11,
    color: colors.textSecondary,
  },
  setupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryDark,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.sm,
  },
  setupButtonText: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
