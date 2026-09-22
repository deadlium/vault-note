/**
 * VaultNote Password Strength Bar & Real-Time Entropy Scorer
 * Phase 2: Authentication, Session State & Hardware Security
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../../theme';

export interface PasswordStrengthResult {
  score: number; // 0 to 4
  entropyBits: number;
  label: 'Very Weak' | 'Weak' | 'Fair' | 'Strong' | 'Obsidian Shield';
  color: string;
  hasLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSymbol: boolean;
  isAcceptable: boolean;
}

/**
 * Calculates mathematical entropy and criteria checklist for a passphrase.
 */
export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  if (!password || password.length === 0) {
    return {
      score: 0,
      entropyBits: 0,
      label: 'Very Weak',
      color: colors.crimson,
      hasLength: false,
      hasUpper: false,
      hasLower: false,
      hasNumber: false,
      hasSymbol: false,
      isAcceptable: false,
    };
  }

  const hasLength = password.length >= 10;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);

  let poolSize = 0;
  if (hasLower) poolSize += 26;
  if (hasUpper) poolSize += 26;
  if (hasNumber) poolSize += 10;
  if (hasSymbol) poolSize += 33;

  const entropyBits = poolSize > 0
    ? Math.round(password.length * Math.log2(poolSize))
    : 0;

  let score = 0;
  if (password.length >= 8) score++;
  if (hasUpper && hasLower) score++;
  if (hasNumber && hasSymbol) score++;
  if (password.length >= 14 && entropyBits >= 60) score++;

  let label: PasswordStrengthResult['label'] = 'Weak';
  let color: string = colors.crimson;

  if (score === 0 || password.length < 8) {
    label = 'Very Weak';
    color = colors.crimson;
  } else if (score === 1) {
    label = 'Weak';
    color = colors.crimson;
  } else if (score === 2) {
    label = 'Fair';
    color = colors.amber;
  } else if (score === 3) {
    label = 'Strong';
    color = colors.primary;
  } else {
    label = 'Obsidian Shield';
    color = colors.emerald;
  }

  // Minimum bar to proceed: at least 10 chars, upper, lower, and number or symbol
  const isAcceptable = hasLength && ((hasUpper && hasLower) && (hasNumber || hasSymbol));

  return {
    score,
    entropyBits,
    label,
    color,
    hasLength,
    hasUpper,
    hasLower,
    hasNumber,
    hasSymbol,
    isAcceptable,
  };
}

export function PasswordStrengthBar({ password }: { password: string }) {
  const result = useMemo(() => evaluatePasswordStrength(password), [password]);

  if (!password) return null;

  return (
    <View style={styles.container}>
      {/* 4-Segment Progress Bar */}
      <View style={styles.meterRow}>
        {[1, 2, 3, 4].map((step) => {
          const filled = result.score >= step;
          return (
            <View
              key={step}
              style={[
                styles.meterSegment,
                filled ? { backgroundColor: result.color } : styles.meterSegmentEmpty,
              ]}
            />
          );
        })}
      </View>

      {/* Label and Entropy readout */}
      <View style={styles.infoRow}>
        <Text style={[styles.strengthLabel, { color: result.color }]}>
          {result.label}
        </Text>
        <Text style={styles.entropyText}>
          {result.entropyBits > 0 ? `${result.entropyBits} bits entropy` : ''}
        </Text>
      </View>

      {/* Checklist criteria */}
      <View style={styles.criteriaList}>
        <CriteriaItem met={result.hasLength} text="At least 10 characters (14+ recommended)" />
        <CriteriaItem met={result.hasUpper && result.hasLower} text="Uppercase & lowercase letters" />
        <CriteriaItem met={result.hasNumber && result.hasSymbol} text="Numbers & special symbols" />
      </View>
    </View>
  );
}

function CriteriaItem({ met, text }: { met: boolean; text: string }) {
  return (
    <View style={styles.criteriaRow}>
      <Ionicons
        name={met ? 'checkmark-circle' : 'ellipse-outline'}
        size={14}
        color={met ? colors.emerald : colors.textMuted}
      />
      <Text style={[styles.criteriaText, met && styles.criteriaTextMet]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  meterRow: {
    flexDirection: 'row',
    gap: 6,
    height: 4,
  },
  meterSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  meterSegmentEmpty: {
    backgroundColor: colors.surfaceActive,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  strengthLabel: {
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
  },
  entropyText: {
    fontSize: typography.caption.fontSize,
    color: colors.textTertiary,
    fontFamily: typography.code.fontFamily,
  },
  criteriaList: {
    gap: 3,
    marginTop: 4,
  },
  criteriaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  criteriaText: {
    fontSize: typography.caption.fontSize,
    color: colors.textTertiary,
  },
  criteriaTextMet: {
    color: colors.textSecondary,
  },
});
