import React from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  ViewStyle,
  StyleProp,
  GestureResponderEvent,
} from 'react-native';
import { colors, radius, spacing } from '../../theme';

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
  const cardStyle: ViewStyle = {
    backgroundColor: elevated ? colors.surfaceElevated : colors.surface,
    borderColor: active ? colors.borderFocus : colors.border,
    padding: spacing[padding],
  };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          cardStyle,
          pressed && styles.pressed,
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
    backgroundColor: colors.surfaceActive,
  },
});
