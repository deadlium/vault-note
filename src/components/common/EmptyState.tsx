/**
 * EmptyState Component
 * Obsidian-themed glassmorphism empty state card for category filtering and search
 * Features glowing double-ring icon, quick-action shortcuts, and action buttons.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../theme';

export interface EmptyStateQuickAction {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}

export interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  actionLabel?: string;
  onActionPress?: () => void;
  secondaryActionLabel?: string;
  onSecondaryActionPress?: () => void;
  quickActions?: EmptyStateQuickAction[];
}

export function EmptyState({
  icon = 'shield-outline',
  title,
  description,
  actionLabel,
  onActionPress,
  secondaryActionLabel,
  onSecondaryActionPress,
  quickActions,
}: EmptyStateProps) {
  return (
    <View style={styles.cardContainer}>
      {/* Glowing Dual-Ring Icon Container */}
      <View style={styles.outerGlowRing}>
        <View style={styles.innerIconCircle}>
          <Ionicons name={icon} size={32} color={colors.primaryLight} />
        </View>
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>

      {/* Quick Action Tiles (e.g. + Login, + Card, + Note) */}
      {quickActions && quickActions.length > 0 && (
        <View style={styles.quickActionsGrid}>
          {quickActions.map((qa, idx) => (
            <Pressable
              key={idx}
              onPress={qa.onPress}
              style={({ pressed }) => [
                styles.quickActionTile,
                pressed && styles.quickActionTilePressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={qa.label}
            >
              <Ionicons name={qa.icon} size={15} color={colors.primaryLight} />
              <Text style={styles.quickActionText}>{qa.label}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Primary Action Button */}
      {actionLabel && onActionPress && (
        <View style={styles.actionContainer}>
          <Pressable
            onPress={onActionPress}
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && styles.primaryBtnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
          >
            <Ionicons name="add-circle" size={18} color="#FFFFFF" />
            <Text style={styles.primaryBtnText}>{actionLabel}</Text>
          </Pressable>
        </View>
      )}

      {/* Secondary Ghost Button */}
      {secondaryActionLabel && onSecondaryActionPress && (
        <Pressable
          onPress={onSecondaryActionPress}
          style={({ pressed }) => [
            styles.secondaryBtn,
            pressed && styles.secondaryBtnPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={secondaryActionLabel}
        >
          <Ionicons name="refresh-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.secondaryBtnText}>{secondaryActionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20, 22, 32, 0.75)',
    borderWidth: 1.2,
    borderColor: 'rgba(123, 97, 255, 0.22)',
    borderRadius: radius['2xl'],
    paddingVertical: spacing['2xl'],
    paddingHorizontal: spacing.xl,
    marginHorizontal: spacing.xs,
    marginTop: spacing.md,
    marginBottom: spacing['2xl'],
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  outerGlowRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(123, 97, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(157, 141, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  innerIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(123, 97, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F1F5F9',
    textAlign: 'center',
    fontFamily: typography.fontFamily.sans,
    letterSpacing: -0.2,
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: 13.5,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 290,
    fontFamily: typography.fontFamily.sans,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  quickActionTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },
  quickActionTilePressed: {
    backgroundColor: 'rgba(123, 97, 255, 0.2)',
    borderColor: colors.primary,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily.sans,
  },
  actionContainer: {
    marginTop: spacing.lg,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: spacing.xl,
    height: 46,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.45,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  primaryBtnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.97 }],
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: typography.fontFamily.sans,
    letterSpacing: 0.2,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  secondaryBtnPressed: {
    opacity: 0.7,
  },
  secondaryBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.textSecondary,
    fontFamily: typography.fontFamily.sans,
  },
});
