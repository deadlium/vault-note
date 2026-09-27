import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  Pressable,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { colors, radius, spacing, typography, useTheme } from '../../theme';

export interface SecureInputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  containerStyle?: StyleProp<ViewStyle>;
  isPassword?: boolean;
}

export const SecureInput: React.FC<SecureInputProps> = ({
  label,
  error,
  helperText,
  containerStyle,
  isPassword = false,
  secureTextEntry,
  style,
  onFocus,
  onBlur,
  ...rest
}) => {
  const { colors: activeColors, isDark } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [hidePassword, setHidePassword] = useState(isPassword);

  const shouldSecure = isPassword ? hidePassword : secureTextEntry;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={[styles.label, !isDark && { color: activeColors.textSecondary }]}>{label}</Text>}
      <View
        style={[
          styles.inputContainer,
          !isDark && { backgroundColor: activeColors.surface, borderColor: activeColors.border },
          isFocused && (isDark ? styles.inputFocused : { borderColor: activeColors.primary, backgroundColor: activeColors.surface }),
          error ? styles.inputError : null,
        ]}
      >
        <TextInput
          style={[
            styles.input,
            !isDark && { color: activeColors.textPrimary },
            shouldSecure ? styles.monoInput : null,
            style,
          ]}
          placeholderTextColor={activeColors.textMuted}
          secureTextEntry={shouldSecure}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
        {isPassword && (
          <Pressable
            onPress={() => setHidePassword((prev) => !prev)}
            style={styles.toggleButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={[styles.toggleText, !isDark && { color: activeColors.primary }]}>
              {hidePassword ? 'SHOW' : 'HIDE'}
            </Text>
          </Pressable>
        )}
      </View>
      {error ? (
        <Text style={[styles.errorText, !isDark && { color: activeColors.crimson }]}>{error}</Text>
      ) : helperText ? (
        <Text style={[styles.helperText, !isDark && { color: activeColors.textTertiary }]}>{helperText}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm.fontSize,
    lineHeight: typography.sizes.sm.lineHeight,
    fontWeight: typography.weights.medium,
    marginBottom: spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    height: 48,
    paddingHorizontal: spacing.md,
  },
  inputFocused: {
    borderColor: colors.borderFocus,
    backgroundColor: colors.surfaceElevated,
  },
  inputError: {
    borderColor: colors.crimson,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.sizes.base.fontSize,
    height: '100%',
  },
  monoInput: {
    fontFamily: typography.fontFamily.mono,
  },
  toggleButton: {
    paddingHorizontal: spacing.xs,
  },
  toggleText: {
    color: colors.primaryLight,
    fontSize: typography.sizes.xs.fontSize,
    fontWeight: typography.weights.semibold,
    letterSpacing: typography.letterSpacing.wide,
  },
  errorText: {
    color: colors.crimson,
    fontSize: typography.sizes.xs.fontSize,
    marginTop: spacing.xs,
  },
  helperText: {
    color: colors.textTertiary,
    fontSize: typography.sizes.xs.fontSize,
    marginTop: spacing.xs,
  },
});
