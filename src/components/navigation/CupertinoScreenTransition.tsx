/**
 * CupertinoScreenTransition Component
 * Authentic 60fps iOS-style slide navigation with parallax background shifts,
 * backdrop dimming, authentic drop shadows, and Android hardware back interception
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  BackHandler,
  ViewStyle,
  StyleProp,
  Platform,
  View,
} from 'react-native';
import { colors } from '../../theme';

const SCREEN_WIDTH = Dimensions.get('window').width;

// Signature Apple iOS cubic bezier curve
const CUPERTINO_EASING = Easing.bezier(0.25, 0.1, 0.25, 1);
const SLIDE_DURATION = 300;

export interface CupertinoScreenTransitionProps {
  visible: boolean;
  covered?: boolean;
  onDismiss: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  enableHardwareBack?: boolean;
}

export function CupertinoScreenTransition({
  visible,
  covered = false,
  onDismiss,
  children,
  style,
  enableHardwareBack = true,
}: CupertinoScreenTransitionProps) {
  // Should this screen be mounted in the layout?
  const [shouldRender, setShouldRender] = useState(visible);

  // Cache children to prevent blank renders during dismiss animation
  const cachedChildrenRef = useRef<React.ReactNode>(children);
  if (children !== null && children !== undefined) {
    cachedChildrenRef.current = children;
  }

  // Animation value:
  //  1: Offscreen right (translateX = SCREEN_WIDTH, dim = 0)
  //  0: Active foreground (translateX = 0, dim = 0)
  // -1: Covered background (translateX = -SCREEN_WIDTH * 0.25, dim = 0.28)
  const animValue = useRef(new Animated.Value(visible ? (covered ? -1 : 0) : 1)).current;
  const isDismissingRef = useRef(false);

  const triggerDismiss = useCallback(() => {
    if (isDismissingRef.current) return;
    isDismissingRef.current = true;

    Animated.timing(animValue, {
      toValue: 1,
      duration: SLIDE_DURATION - 20,
      easing: CUPERTINO_EASING,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setShouldRender(false);
        isDismissingRef.current = false;
        onDismiss();
      }
    });
  }, [animValue, onDismiss]);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      isDismissingRef.current = false;

      const targetValue = covered ? -1 : 0;
      Animated.timing(animValue, {
        toValue: targetValue,
        duration: SLIDE_DURATION,
        easing: CUPERTINO_EASING,
        useNativeDriver: true,
      }).start();
    } else if (shouldRender && !isDismissingRef.current) {
      triggerDismiss();
    }
  }, [visible, covered, shouldRender, animValue, triggerDismiss]);

  // Intercept Android hardware back button only when this screen is the topmost active screen
  useEffect(() => {
    const isTopScreen = visible && !covered && enableHardwareBack;
    if (!isTopScreen) return;

    const onHardwareBack = () => {
      triggerDismiss();
      return true; // Consume event to prevent OS from exiting app
    };

    const backSubscription = BackHandler.addEventListener(
      'hardwareBackPress',
      onHardwareBack
    );

    return () => {
      backSubscription.remove();
    };
  }, [visible, covered, enableHardwareBack, triggerDismiss]);

  if (!shouldRender && !visible) {
    return null;
  }

  const translateX = animValue.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [-SCREEN_WIDTH * 0.25, 0, SCREEN_WIDTH],
    extrapolate: 'clamp',
  });

  const dimOpacity = animValue.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [0.28, 0, 0],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateX }],
        },
        style,
      ]}
    >
      {cachedChildrenRef.current}

      {/* Cupertino Parallax Dimming Overlay */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.dimmingOverlay,
          {
            opacity: dimOpacity,
          },
        ]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.background,
    zIndex: 100,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: -5, height: 0 },
        shadowOpacity: 0.35,
        shadowRadius: 14,
      },
      android: {
        elevation: 20,
      },
    }),
  },
  dimmingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000000',
    zIndex: 999,
  },
});
