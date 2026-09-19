import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, radius, spacing, typography } from '../../theme';

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
  const getStyles = (): { container: ViewStyle; text: TextStyle } => {
    switch (variant) {
      case 'primary':
        return {
          container: {
            backgroundColor: colors.primaryMuted,
            borderColor: colors.primary,
          },
          text: { color: colors.primaryLight },
        };
      case 'emerald':
        return {
          container: {
            backgroundColor: colors.emeraldMuted,
            borderColor: colors.emerald,
          },
          text: { color: colors.emerald },
        };
      case 'amber':
        return {
          container: {
            backgroundColor: colors.amberMuted,
            borderColor: colors.amber,
          },
          text: { color: colors.amber },
        };
      case 'crimson':
        return {
          container: {
            backgroundColor: colors.crimsonMuted,
            borderColor: colors.crimson,
          },
          text: { color: colors.crimson },
        };
      default:
        return {
          container: {
            backgroundColor: colors.surfaceSubtle,
            borderColor: colors.border,
          },
          text: { color: colors.textSecondary },
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
