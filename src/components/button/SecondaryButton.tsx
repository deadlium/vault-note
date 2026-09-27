import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ViewStyle,
  StyleProp,
  TextStyle,
} from 'react-native';
import { colors, radius, spacing, typography, useTheme } from '../../theme';

export interface SecondaryButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const SecondaryButton: React.FC<SecondaryButtonProps> = ({
  title,
  onPress,
  disabled = false,
  style,
  textStyle,
}) => {
  const { colors: activeColors, isDark } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        !isDark && {
          backgroundColor: '#FFFFFF',
          borderColor: activeColors.border,
        },
        pressed && !disabled && (isDark ? styles.pressed : {
          backgroundColor: activeColors.backgroundSubtle,
          borderColor: activeColors.borderActive,
        }),
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          !isDark && { color: activeColors.textPrimary },
          disabled && (isDark ? styles.disabledText : { color: activeColors.textMuted }),
          textStyle,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  pressed: {
    backgroundColor: colors.surfaceActive,
    borderColor: colors.borderActive,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    color: colors.textPrimary,
    fontSize: typography.sizes.base.fontSize,
    lineHeight: typography.sizes.base.lineHeight,
    fontWeight: typography.weights.medium,
  },
  disabledText: {
    color: colors.textMuted,
  },
});
