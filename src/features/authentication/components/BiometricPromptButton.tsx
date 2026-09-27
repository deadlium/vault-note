/**
 * VaultNote Biometric Prompt Button Component
 * Circular biometric trigger with animated scanner aesthetic
 * Phase 2: Authentication, Session State & Hardware Security
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radius, spacing, typography, useTheme } from '../../../theme';

interface BiometricPromptButtonProps {
  onPress: () => void;
  biometricLabel?: string;
  isAuthenticating?: boolean;
  disabled?: boolean;
}

export function BiometricPromptButton({
  onPress,
  biometricLabel = 'Biometrics',
  isAuthenticating = false,
  disabled = false,
}: BiometricPromptButtonProps) {
  const { colors: activeColors, isDark } = useTheme();
  const isFaceId = biometricLabel.toLowerCase().includes('face');

  return (
    <View style={styles.container}>
      <Pressable
        style={({ pressed }) => [
          styles.outerRing,
          !isDark && {
            borderColor: activeColors.primaryGlow,
            backgroundColor: activeColors.primaryMuted,
          },
          pressed && [styles.outerRingPressed, !isDark && { borderColor: activeColors.primary }],
          disabled && styles.disabled,
        ]}
        onPress={onPress}
        disabled={disabled || isAuthenticating}
      >
        <View style={[
          styles.middleRing,
          !isDark && {
            borderColor: activeColors.primaryMuted,
            backgroundColor: activeColors.surfaceSubtle,
          },
        ]}>
          <View style={[
            styles.innerCircle,
            !isDark && {
              backgroundColor: activeColors.surface,
              borderColor: activeColors.border,
            },
          ]}>
            {isAuthenticating ? (
              <ActivityIndicator size="large" color={isDark ? colors.primaryLight : activeColors.primary} />
            ) : isFaceId ? (
              <MaterialCommunityIcons
                name="face-recognition"
                size={44}
                color={isDark ? colors.primaryLight : activeColors.primary}
              />
            ) : (
              <Ionicons
                name="finger-print"
                size={48}
                color={isDark ? colors.primaryLight : activeColors.primary}
              />
            )}
          </View>
        </View>
      </Pressable>

      <Text style={[styles.promptLabel, !isDark && { color: activeColors.textSecondary }]}>
        {isAuthenticating ? 'Scanning...' : `Tap to scan ${biometricLabel}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.lg,
  },
  outerRing: {
    width: 108,
    height: 108,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: 'rgba(167, 139, 250, 0.25)',
    backgroundColor: 'rgba(167, 139, 250, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerRingPressed: {
    backgroundColor: 'rgba(167, 139, 250, 0.12)',
    borderColor: colors.primaryLight,
    transform: [{ scale: 0.96 }],
  },
  middleRing: {
    width: 88,
    height: 88,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.4)',
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerCircle: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  disabled: {
    opacity: 0.5,
  },
  promptLabel: {
    marginTop: spacing.md,
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
});
