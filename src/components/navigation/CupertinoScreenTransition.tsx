/**
 * CupertinoScreenTransition Component
 * Silky-smooth 60fps native hardware-accelerated slide navigation.
 * Features stable non-shifting background layers, responsive slide-out dismissals,
 * and zero stutter/hitch when navigating back.
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
} from 'react-native';
import { colors } from '../../theme';

const SCREEN_WIDTH = Dimensions.get('window').width;

// Snappy, silky-smooth ease-out bezier curve
const CUPERTINO_EASING = Easing.bezier(0.22, 1, 0.36, 1);
const SLIDE_DURATION = 240;

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
  const [shouldRender, setShouldRender] = useState(visible);

  // Cache children to ensure content stays rendered during the slide-out animation
  const cachedChildrenRef = useRef<React.ReactNode>(children);
  if (children !== null && children !== undefined) {
    cachedChildrenRef.current = children;
  }

  // Slide animation value:
  // 0: Fully presented in foreground (translateX = 0)
  // 1: Dismissed offscreen to the right (translateX = SCREEN_WIDTH)
  const slideAnim = useRef(new Animated.Value(visible ? 0 : 1)).current;

  // Covered dimming value:
  // 0: Not covered (dimOpacity = 0)
  // 1: Covered by another subscreen (dimOpacity = 0.22)
  const coveredAnim = useRef(new Animated.Value(covered ? 1 : 0)).current;

  const isDismissingRef = useRef(false);

  const triggerDismiss = useCallback(() => {
    if (isDismissingRef.current) return;
    isDismissingRef.current = true;

    Animated.timing(slideAnim, {
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
  }, [slideAnim, onDismiss]);

  // Handle visibility changes
  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      isDismissingRef.current = false;

      Animated.timing(slideAnim, {
        toValue: 0,
        duration: SLIDE_DURATION,
        easing: CUPERTINO_EASING,
        useNativeDriver: true,
      }).start();
    } else if (shouldRender && !isDismissingRef.current) {
      triggerDismiss();
    }
  }, [visible, shouldRender, slideAnim, triggerDismiss]);

  // Handle covered state: smoothly fade dimming overlay without moving this screen
  useEffect(() => {
    Animated.timing(coveredAnim, {
      toValue: covered ? 1 : 0,
      duration: SLIDE_DURATION,
      easing: CUPERTINO_EASING,
      useNativeDriver: true,
    }).start();
  }, [covered, coveredAnim]);

  // Intercept Android hardware back button when this is the active top screen
  useEffect(() => {
    const isTopScreen = visible && !covered && enableHardwareBack;
    if (!isTopScreen) return;

    const onHardwareBack = () => {
      triggerDismiss();
      return true;
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

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SCREEN_WIDTH],
    extrapolate: 'clamp',
  });

  const dimOpacity = coveredAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.22],
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

      {/* Gentle stationary dimming overlay when covered by a deeper screen */}
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
        shadowColor: '#000000',
        shadowOffset: { width: -4, height: 0 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  dimmingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000000',
    zIndex: 999,
  },
});
