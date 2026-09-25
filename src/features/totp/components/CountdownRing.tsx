/**
 * CountdownRing Component
 * Obsidian-styled animated countdown ring with cadence warning colors
 * Visualizes remaining seconds in the TOTP rotation cycle with SVG circular stroke
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, typography } from '../../../theme';

export interface CountdownRingProps {
  /** Remaining seconds until next rotation */
  remainingSeconds: number;
  /** Total step period (usually 30) */
  period?: number;
  /** Normalized fraction [0, 1] representing remaining time ratio */
  progress?: number;
  /** Diameter of the circular widget in pixels (default: 34) */
  size?: number;
  /** Thickness of the progress stroke ring (default: 3) */
  strokeWidth?: number;
  /** Whether to render remaining seconds text inside center of ring (default: true) */
  showSecondsText?: boolean;
}

export const CountdownRing: React.FC<CountdownRingProps> = ({
  remainingSeconds,
  period = 30,
  progress: externalProgress,
  size = 34,
  strokeWidth = 3,
  showSecondsText = true,
}) => {
  const calculatedProgress =
    externalProgress !== undefined
      ? externalProgress
      : Math.max(0, Math.min(1, remainingSeconds / period));

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const isWarning = remainingSeconds <= 7 && remainingSeconds > 4;
  const isCritical = remainingSeconds <= 4;

  // Pulse animation when reaching critical expiry threshold
  useEffect(() => {
    if (isCritical) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.12,
            duration: 250,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1.0,
            duration: 250,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isCritical, pulseAnim]);

  // Color cadence based on time threshold
  const activeColor = isCritical
    ? colors.crimson
    : isWarning
    ? colors.gold
    : colors.emerald;

  const trackColor = '#1F2329';
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // Progress goes from 1 (full circle at 30s) down to 0 (empty ring at 0s)
  const strokeDashoffset = circumference * (1 - Math.max(0, Math.min(1, calculatedProgress)));

  return (
    <Animated.View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          transform: [{ scale: pulseAnim }],
        },
      ]}
    >
      <Svg width={size} height={size}>
        {/* Background Track Circle */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />

        {/* Dynamic Countdown Progress Stroke (starts at 12 o'clock, counts down clockwise) */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={activeColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${center}, ${center}`}
        />
      </Svg>

      {/* Inner Center Content displaying countdown seconds */}
      {showSecondsText && (
        <View style={styles.centerTextContainer}>
          <Text
            style={[
              styles.secondsText,
              {
                color: activeColor,
                fontSize: size >= 40 ? 12 : size >= 32 ? 10 : 8,
              },
            ]}
          >
            {remainingSeconds}s
          </Text>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  centerTextContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondsText: {
    fontFamily: typography.fontFamily.mono,
    fontWeight: '700',
    textAlign: 'center',
  },
});
