/**
 * PasswordField Component
 * Monospace dot masked password container with reveal toggle, copy action,
 * and biometric authentication protection
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../theme';
import { authenticateBiometric } from '../../core/biometric';

export interface PasswordFieldProps {
  label?: string;
  value: string;
  isProtected?: boolean;
  onCopy?: (password: string) => void;
  onRevealChange?: (revealed: boolean) => void;
  allowCopy?: boolean;
  style?: StyleProp<ViewStyle>;
  helperText?: string;
}

export function PasswordField({
  label = 'Master Password',
  value,
  isProtected = false,
  onCopy,
  onRevealChange,
  allowCopy = true,
  style,
  helperText,
}: PasswordFieldProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Masked dots display string
  const maskDots = '•'.repeat(Math.max(16, Math.min(value.length, 24)));

  const handleToggleReveal = async () => {
    if (isRevealed) {
      setIsRevealed(false);
      onRevealChange?.(false);
      return;
    }

    if (isProtected) {
      setIsAuthenticating(true);
      try {
        const result = await authenticateBiometric({
          promptMessage: 'Authenticate to reveal credential',
          cancelLabel: 'Cancel',
        });

        if (result.success) {
          setIsRevealed(true);
          onRevealChange?.(true);
        }
      } catch {
        // Suppress prompt cancellation
      } finally {
        setIsAuthenticating(false);
      }
    } else {
      setIsRevealed(true);
      onRevealChange?.(true);
    }
  };

  const handleCopy = () => {
    onCopy?.(value);
  };

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View style={styles.card}>
        <View style={styles.textContainer}>
          <Text
            style={[
              styles.valueText,
              !isRevealed && styles.valueMasked,
            ]}
            numberOfLines={1}
            ellipsizeMode="middle"
          >
            {isRevealed ? value : maskDots}
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={handleToggleReveal}
            disabled={isAuthenticating}
            style={({ pressed }) => [
              styles.actionButton,
              pressed && styles.actionButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={isRevealed ? 'Hide Password' : 'Reveal Password'}
          >
            {isAuthenticating ? (
              <ActivityIndicator size="small" color={colors.primaryLight} />
            ) : (
              <>
                <Ionicons
                  name={isRevealed ? 'eye-off-outline' : 'eye-outline'}
                  size={15}
                  color={colors.textSecondary}
                  style={styles.actionIcon}
                />
                <Text style={styles.actionText}>
                  {isRevealed ? 'Hide' : 'Reveal'}
                </Text>
              </>
            )}
          </Pressable>

          {allowCopy && (
            <Pressable
              onPress={handleCopy}
              style={({ pressed }) => [
                styles.copyButton,
                pressed && styles.copyButtonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Copy Password"
            >
              <Ionicons
                name="copy-outline"
                size={14}
                color={colors.primaryLight}
                style={styles.actionIcon}
              />
              <Text style={styles.copyText}>Copy</Text>
            </Pressable>
          )}
        </View>
      </View>

      {isProtected && !isRevealed && (
        <View style={styles.helperRow}>
          <Ionicons
            name="finger-print-outline"
            size={13}
            color={colors.amber}
            style={styles.helperIcon}
          />
          <Text style={styles.helperText}>
            {helperText ?? 'Biometric auth required to reveal raw plaintext'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.xs,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: spacing.xs,
    fontWeight: '500',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 52,
  },
  textContainer: {
    flex: 1,
    marginRight: spacing.sm,
    justifyContent: 'center',
  },
  valueText: {
    ...typography.code,
    color: colors.textPrimary,
    fontSize: 15,
    letterSpacing: 0.5,
  },
  valueMasked: {
    letterSpacing: 2,
    fontSize: 16,
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  actionButtonPressed: {
    opacity: 0.7,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  actionIcon: {
    marginRight: 4,
  },
  actionText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(123, 97, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(123, 97, 255, 0.35)',
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  copyButtonPressed: {
    opacity: 0.7,
    backgroundColor: 'rgba(123, 97, 255, 0.25)',
  },
  copyText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '600',
    color: colors.primaryLight,
  },
  helperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingHorizontal: 2,
  },
  helperIcon: {
    marginRight: 5,
  },
  helperText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textTertiary,
  },
});
