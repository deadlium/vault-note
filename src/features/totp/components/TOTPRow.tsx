/**
 * TOTPRow Component
 * Interactive TOTP authenticator card with live countdown ring and tap-to-copy
 * Designed for credential detail view and standalone authenticator screen
 */

import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../../theme';
import { useTOTP } from '../hooks/useTOTP';
import { CountdownRing } from './CountdownRing';
import { useClipboardManager } from '../../../core/clipboard';

export interface TOTPRowProps {
  /** Base32 secret string or otpauth URI */
  secret?: string;
  /** Service label (e.g. 'Google Authenticator', 'GitHub 2FA') */
  label?: string;
  /** Subtitle or account username */
  accountName?: string;
  /** Optional custom period (default: 30s) */
  period?: number;
  /** Optional callback fired when code is copied */
  onCopy?: (code: string) => void;
}

export const TOTPRow: React.FC<TOTPRowProps> = ({
  secret = '',
  label = 'AUTHENTICATOR CODE',
  accountName,
  period = 30,
  onCopy,
}) => {
  const { code, formattedCode, remainingSeconds, progress, isExpiringSoon, isValidSecret, error } =
    useTOTP(secret, { period });

  const { copySecret } = useClipboardManager();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!isValidSecret || code === '------') return;
    const rawDigits = code.replace(/\s/g, '');
    await copySecret(rawDigits, `${label} TOTP Code`, 30);
    setCopied(true);
    onCopy?.(rawDigits);
    setTimeout(() => setCopied(false), 2000);
  };

  const codeColor = isExpiringSoon
    ? colors.crimson
    : remainingSeconds <= 7
    ? colors.gold
    : colors.textPrimary;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        isExpiringSoon && styles.cardExpiring,
        pressed && styles.cardPressed,
      ]}
      onPress={handleCopy}
    >
      <View style={styles.contentRow}>
        {/* Left Section: Label and Large Code */}
        <View style={styles.codeSection}>
          <View style={styles.headerRow}>
            <Ionicons
              name="shield-checkmark"
              size={12}
              color={isExpiringSoon ? colors.crimson : colors.primaryLight}
            />
            <Text
              style={[
                styles.labelText,
                isExpiringSoon && { color: colors.crimson },
              ]}
              numberOfLines={1}
            >
              {label.toUpperCase()}
            </Text>
            {accountName && (
              <Text style={styles.accountText} numberOfLines={1}>
                • {accountName}
              </Text>
            )}
          </View>

          <View style={styles.codeRow}>
            <Text style={[styles.codeText, { color: codeColor }]}>
              {isValidSecret ? formattedCode : 'INVALID SECRET'}
            </Text>
            {copied ? (
              <View style={styles.copiedBadge}>
                <Ionicons name="checkmark-circle" size={13} color={colors.emerald} />
                <Text style={styles.copiedText}>Copied</Text>
              </View>
            ) : null}
          </View>

          {error && !isValidSecret && (
            <Text style={styles.errorText} numberOfLines={1}>
              {error}
            </Text>
          )}
        </View>

        {/* Right Section: Animated Countdown Ring & Copy Trigger */}
        <View style={styles.actionSection}>
          <CountdownRing
            remainingSeconds={remainingSeconds}
            period={period}
            progress={progress}
            size={36}
            strokeWidth={3}
            showSecondsText={true}
          />
          <View style={styles.copyIconWrapper}>
            <Ionicons
              name={copied ? 'checkmark' : 'copy-outline'}
              size={16}
              color={copied ? colors.emerald : colors.textMuted}
            />
          </View>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#16181C',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#24272E',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginVertical: spacing.xs,
  },
  cardExpiring: {
    borderColor: 'rgba(239, 68, 68, 0.35)',
    backgroundColor: '#1B1416',
  },
  cardPressed: {
    opacity: 0.88,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codeSection: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  labelText: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: colors.textMuted,
  },
  accountText: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 10,
    color: colors.textTertiary,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  codeText: {
    fontFamily: typography.fontFamily.mono,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 2,
  },
  copiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
    gap: 3,
  },
  copiedText: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 10,
    fontWeight: '600',
    color: colors.emerald,
  },
  errorText: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 11,
    color: colors.crimson,
    marginTop: 2,
  },
  actionSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  copyIconWrapper: {
    width: 30,
    height: 30,
    borderRadius: radius.full,
    backgroundColor: '#1F2228',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
