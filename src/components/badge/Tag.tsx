import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, radius, spacing, typography, useTheme } from '../../theme';

export type TagVariant = 'default' | 'primary' | 'emerald' | 'amber' | 'crimson';

export interface TagProps {
  label: string;
  variant?: TagVariant;
  size?: 'sm' | 'md';
}

export const Tag: React.FC<TagProps> = ({
  label,
  variant = 'default',
  size = 'md',
}) => {
  const { colors: activeColors, isDark } = useTheme();

  const getStyles = (): { container: ViewStyle; text: TextStyle } => {
    switch (variant) {
      case 'primary':
        return {
          container: {
            backgroundColor: activeColors.primaryMuted,
            borderColor: isDark ? activeColors.primary : 'rgba(79, 70, 229, 0.3)',
          },
          text: { color: isDark ? activeColors.primaryLight : activeColors.primary },
        };
      case 'emerald':
        return {
          container: {
            backgroundColor: activeColors.emeraldMuted,
            borderColor: activeColors.emeraldBorder,
          },
          text: { color: isDark ? activeColors.emerald : activeColors.emeraldDark },
        };
      case 'amber':
        return {
          container: {
            backgroundColor: activeColors.amberMuted,
            borderColor: activeColors.amberBorder,
          },
          text: { color: isDark ? activeColors.amber : activeColors.amberDark },
        };
      case 'crimson':
        return {
          container: {
            backgroundColor: activeColors.crimsonMuted,
            borderColor: isDark ? activeColors.crimson : 'rgba(225, 29, 72, 0.3)',
          },
          text: { color: isDark ? activeColors.crimson : activeColors.crimsonDark },
        };
      default:
        return {
          container: {
            backgroundColor: activeColors.surfaceSubtle,
            borderColor: activeColors.border,
          },
          text: { color: activeColors.textSecondary },
        };
    }
  };

  const dynamicStyles = getStyles();

  return (
    <View
      style={[
        styles.container,
        size === 'sm' ? styles.sizeSm : styles.sizeMd,
        dynamicStyles.container,
      ]}
    >
      <Text
        style={[
          styles.text,
          size === 'sm' ? styles.textSm : styles.textMd,
          dynamicStyles.text,
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.xs,
    borderWidth: 1,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeSm: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  sizeMd: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  text: {
    fontWeight: typography.weights.medium,
  },
  textSm: {
    fontSize: typography.sizes.xs.fontSize - 1,
  },
  textMd: {
    fontSize: typography.sizes.xs.fontSize,
  },
});
