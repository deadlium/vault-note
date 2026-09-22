/**
 * VaultNote 24-Word BIP-39 Mnemonic Grid Display
 * Phase 2: Authentication, Session State & Hardware Security (Day 4)
 */

import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../../theme';

interface MnemonicGridProps {
  words: string[];
  onCopy?: () => void;
  copied?: boolean;
}

export function MnemonicGrid({ words, onCopy, copied }: MnemonicGridProps) {
  const [isRevealed, setIsRevealed] = useState(true);

  return (
    <View style={styles.container}>
      {/* Privacy Header */}
      <View style={styles.headerRow}>
        <View style={styles.badgeRow}>
          <Ionicons name="key-outline" size={16} color={colors.primaryLight} />
          <Text style={styles.headerTitle}>24-Word Emergency Kit</Text>
        </View>

        <Pressable
          style={styles.toggleBtn}
          onPress={() => setIsRevealed(!isRevealed)}
          hitSlop={8}
        >
          <Ionicons
            name={isRevealed ? 'eye-off-outline' : 'eye-outline'}
            size={16}
            color={colors.textSecondary}
          />
          <Text style={styles.toggleBtnText}>{isRevealed ? 'Hide' : 'Reveal'}</Text>
        </Pressable>
      </View>

      {/* 24-Word Grid (2 columns or 3 columns) */}
      <View style={styles.grid}>
        {words.map((word, index) => {
          const numberLabel = (index + 1).toString().padStart(2, '0');
          return (
            <View key={index} style={styles.wordChip}>
              <Text style={styles.wordNumber}>{numberLabel}</Text>
              <Text style={styles.wordText}>
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
            style={[styles.copyButton, copied && styles.copyButtonActive]}
            onPress={onCopy}
          >
            <Ionicons
              name={copied ? 'checkmark' : 'copy-outline'}
              size={16}
              color={copied ? colors.emerald : colors.textPrimary}
            />
            <Text style={[styles.copyButtonText, copied && styles.copyButtonTextActive]}>
              {copied ? 'Copied to Clipboard' : 'Copy All 24 Words'}
            </Text>
          </Pressable>
        </View>
      )}

      {/* Warning Alert */}
      <View style={styles.warningBox}>
        <Ionicons name="warning-outline" size={16} color={colors.amber} />
        <Text style={styles.warningText}>
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
