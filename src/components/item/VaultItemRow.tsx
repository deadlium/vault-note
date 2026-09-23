/**
 * VaultItemRow Component
 * High-craft credentials card row inspired by Apple Notes + Linear + 1Password
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../theme';
import { ServiceIcon } from '../icon/ServiceIcon';
import { VaultItemType, VaultItemRowData } from '../../types/vault';

export type { VaultItemRowData };

export interface VaultItemRowProps {
  item: VaultItemRowData;
  onPress: () => void;
  onToggleFavorite?: (id: string) => void;
}

export function VaultItemRow({
  item,
  onPress,
  onToggleFavorite,
}: VaultItemRowProps) {
  const displaySubtitle = item.subtitle ?? '';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        pressed && styles.containerPressed,
      ]}
      onPress={onPress}
    >
      {/* Service Icon / Monogram */}
      <ServiceIcon
        iconType={item.iconType}
        category={item.category}
        title={item.title}
        size="md"
      />

      {/* Item Information */}
      <View style={styles.centerInfo}>
        <View style={styles.titleRow}>
          <Text style={styles.titleText} numberOfLines={1}>
            {item.title}
          </Text>
          {item.isProtected && (
            <Ionicons
              name="lock-closed"
              size={12}
              color={colors.primaryLight}
              style={{ marginLeft: 4 }}
            />
          )}
        </View>

        {displaySubtitle.length > 0 && (
          <Text style={styles.subtitleText} numberOfLines={1}>
            {displaySubtitle}
          </Text>
        )}

        {/* Feature Badges & Category Tags */}
        <View style={styles.badgesRow}>
          <View style={styles.categoryPill}>
            <Text style={styles.categoryPillText}>{item.tag ?? item.category}</Text>
          </View>

          {item.hasTOTP && (
            <View style={styles.totpPill}>
              <View style={styles.totpDot} />
              <Text style={styles.totpText}>{item.totpLabel ?? 'TOTP'}</Text>
            </View>
          )}

          {item.twoFactorLabel && !item.hasTOTP && (
            <View style={styles.twoFactorPill}>
              <Text style={styles.twoFactorText}>{item.twoFactorLabel}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Right Actions: Favorite Star & Chevron */}
      <View style={styles.rightActions}>
        <Pressable
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={() => onToggleFavorite?.(item.id)}
          style={styles.starBtn}
          accessibilityLabel={item.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Ionicons
            name={item.isFavorite ? 'star' : 'star-outline'}
            size={18}
            color={item.isFavorite ? '#FBBF24' : colors.textTertiary}
          />
        </Pressable>

        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm + 2,
  },
  containerPressed: {
    backgroundColor: colors.surfaceActive,
    borderColor: 'rgba(123, 97, 255, 0.3)',
  },
  centerInfo: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  subtitleText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
    fontFamily: typography.code.fontFamily,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  categoryPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  categoryPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textTertiary,
  },
  totpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.xs,
    gap: 4,
  },
  totpDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.emerald,
  },
  totpText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.emerald,
  },
  twoFactorPill: {
    backgroundColor: 'rgba(123, 97, 255, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.xs,
  },
  twoFactorText: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.primaryLight,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  starBtn: {
    padding: 2,
  },
});
