/**
 * VaultNote 24-Word BIP-39 Mnemonic Grid Display
 * Phase 2: Authentication, Session State & Hardware Security
 */

import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography, useTheme } from '../../../theme';

interface MnemonicGridProps {
  words: string[];
  onCopy?: () => void;
  copied?: boolean;
}

export function MnemonicGrid({ words, onCopy, copied }: MnemonicGridProps) {
  const { colors: themeColors, isDark } = useTheme();
  const [isRevealed, setIsRevealed] = useState(true);

  return (
    <View
      style={[
        styles.container,
        !isDark && {
          backgroundColor: themeColors.surface,
          borderColor: themeColors.border,
          shadowColor: '#0F172A',
          shadowOpacity: 0.04,
          shadowOffset: { width: 0, height: 2 },
          shadowRadius: 6,
          elevation: 1,
        },
      ]}
    >
      {/* Privacy Header */}
      <View style={styles.headerRow}>
        <View style={styles.badgeRow}>
          <Ionicons
            name="key-outline"
            size={16}
            color={isDark ? colors.primaryLight : themeColors.primary}
          />
          <Text
            style={[
              styles.headerTitle,
              !isDark && { color: themeColors.primary },
            ]}
          >
            24-Word Emergency Kit
          </Text>
        </View>

        <Pressable
          style={[
            styles.toggleBtn,
            !isDark && { backgroundColor: themeColors.surfaceSubtle },
          ]}
          onPress={() => setIsRevealed(!isRevealed)}
          hitSlop={8}
        >
          <Ionicons
            name={isRevealed ? 'eye-off-outline' : 'eye-outline'}
            size={16}
            color={themeColors.textSecondary}
          />
          <Text
            style={[
              styles.toggleBtnText,
              !isDark && { color: themeColors.textSecondary },
            ]}
          >
            {isRevealed ? 'Hide' : 'Reveal'}
          </Text>
        </Pressable>
      </View>

      {/* 24-Word Grid (2 columns or 3 columns) */}
      <View style={styles.grid}>
        {words.map((word, index) => {
          const numberLabel = (index + 1).toString().padStart(2, '0');
          return (
            <View
              key={index}
              style={[
                styles.wordChip,
                !isDark && {
                  backgroundColor: themeColors.surfaceElevated,
                  borderColor: themeColors.borderSubtle,
                },
              ]}
            >
              <Text
                style={[
                  styles.wordNumber,
                  !isDark && { color: themeColors.textTertiary },
                ]}
              >
                {numberLabel}
              </Text>
              <Text
                style={[
                  styles.wordText,
                  !isDark && { color: themeColors.textPrimary },
                ]}
              >
                {isRevealed ? word : '••••••'}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Copy / Actions Footer */}
      {onCopy && (
        <View style={styles.actionsRow}>
          <Pressable
            style={[
              styles.copyButton,
              !isDark && {
                backgroundColor: themeColors.surfaceElevated,
                borderColor: themeColors.border,
              },
              copied && styles.copyButtonActive,
              copied && !isDark && {
                backgroundColor: themeColors.emeraldMuted,
                borderColor: themeColors.emerald,
              },
            ]}
            onPress={onCopy}
          >
            <Ionicons
              name={copied ? 'checkmark' : 'copy-outline'}
              size={16}
              color={
                copied
                  ? isDark
                    ? colors.emerald
                    : themeColors.emerald
                  : isDark
                  ? colors.textPrimary
                  : themeColors.textPrimary
              }
            />
            <Text
              style={[
                styles.copyButtonText,
                !isDark && { color: themeColors.textPrimary },
                copied && styles.copyButtonTextActive,
                copied && !isDark && { color: themeColors.emerald },
              ]}
            >
              {copied ? 'Copied to Clipboard' : 'Copy All 24 Words'}
            </Text>
          </Pressable>
        </View>
      )}

      {/* Warning Alert */}
      <View
        style={[
          styles.warningBox,
          !isDark && {
            backgroundColor: themeColors.amberMuted,
            borderColor: themeColors.amberBorder,
          },
        ]}
      >
        <Ionicons
          name="warning-outline"
          size={16}
          color={isDark ? colors.amber : themeColors.amber}
        />
        <Text
          style={[
            styles.warningText,
            !isDark && { color: themeColors.amber },
          ]}
        >
          Write these words down on paper and keep them offline in a safe place. They cannot be recovered if lost.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerTitle: {
    fontSize: typography.caption.fontSize,
    fontWeight: '700',
    color: colors.primaryLight,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSubtle,
  },
  toggleBtnText: {
    fontSize: typography.caption.fontSize,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  wordChip: {
    width: '31%', // 3 columns
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
    paddingVertical: 6,
    paddingHorizontal: 8,
    gap: 6,
  },
  wordNumber: {
    fontSize: 11,
    color: colors.textTertiary,
    fontFamily: typography.code.fontFamily,
    fontWeight: '600',
  },
  wordText: {
    fontSize: 13,
    color: colors.textPrimary,
    fontFamily: typography.code.fontFamily,
    fontWeight: '500',
    flex: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
  },
  copyButtonActive: {
    borderColor: colors.emerald,
    backgroundColor: colors.emeraldMuted,
  },
  copyButtonText: {
    fontSize: typography.body2.fontSize,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  copyButtonTextActive: {
    color: colors.emerald,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.amberMuted,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.amberBorder,
  },
  warningText: {
    fontSize: typography.caption.fontSize,
    color: colors.amber,
    flex: 1,
    lineHeight: 16,
  },
});
