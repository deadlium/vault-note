import React from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  ViewStyle,
  StyleProp,
  GestureResponderEvent,
} from 'react-native';
import { colors, radius, spacing, useTheme } from '../../theme';

export interface VaultCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: (event: GestureResponderEvent) => void;
  elevated?: boolean;
  active?: boolean;
  padding?: keyof typeof spacing;
}

export const VaultCard: React.FC<VaultCardProps> = ({
  children,
  style,
  onPress,
  elevated = false,
  active = false,
  padding = 'lg',
}) => {
  const { colors: activeColors, isDark } = useTheme();

  const cardStyle: ViewStyle = {
    backgroundColor: elevated ? activeColors.surfaceElevated : activeColors.surface,
    borderColor: active ? activeColors.borderFocus : activeColors.border,
    padding: spacing[padding],
    ...(!isDark && {
      shadowColor: '#0F172A',
      shadowOpacity: 0.04,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 6,
      elevation: 1,
    }),
  };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          cardStyle,
          pressed && [styles.pressed, { backgroundColor: activeColors.surfaceActive }],
          style,
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={[styles.card, cardStyle, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.85,
  },
});
