/**
 * SecurityScoreRing Component
 * Cupertino/Obsidian-styled circular gauge presenting the overall vault hygiene score
 * Features animated circular SVG stroke, glowing neon accent, and health status tier
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors, typography } from '../../../theme';
import { SecurityRating } from '../types';

export interface SecurityScoreRingProps {
  score: number; // 0 - 100
  rating: SecurityRating;
  label?: string;
  size?: number; // default 136
  strokeWidth?: number; // default 10
}

export const SecurityScoreRing: React.FC<SecurityScoreRingProps> = ({
  score,
  rating,
  label = 'VAULT HEALTH',
  size = 136,
  strokeWidth = 10,
}) => {
  const animatedScore = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedScore, {
      toValue: Math.max(0, Math.min(100, score)),
      duration: 750,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [score, animatedScore]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * Math.max(0, Math.min(100, score))) / 100;

  // Determine palette based on score rating
  const getThemePalette = () => {
    switch (rating) {
      case 'excellent':
        return {
          stroke: colors.emerald,
          gradientStart: '#34D399',
          gradientEnd: '#059669',
          glow: 'rgba(16, 185, 129, 0.22)',
          badgeBg: 'rgba(16, 185, 129, 0.15)',
          badgeText: '#6EE7B7',
          badgeBorder: 'rgba(16, 185, 129, 0.35)',
        };
      case 'good':
        return {
          stroke: colors.primary,
          gradientStart: '#A78BFA',
          gradientEnd: '#6D28D9',
          glow: 'rgba(139, 92, 246, 0.24)',
          badgeBg: 'rgba(139, 92, 246, 0.15)',
          badgeText: '#C4B5FD',
          badgeBorder: 'rgba(139, 92, 246, 0.35)',
        };
      case 'fair':
        return {
          stroke: colors.amber,
          gradientStart: '#FBBF24',
          gradientEnd: '#D97706',
          glow: 'rgba(245, 158, 11, 0.22)',
          badgeBg: 'rgba(245, 158, 11, 0.15)',
          badgeText: '#FCD34D',
          badgeBorder: 'rgba(245, 158, 11, 0.35)',
        };
      case 'poor':
        return {
          stroke: colors.amberDark,
          gradientStart: '#F97316',
          gradientEnd: '#C2410C',
          glow: 'rgba(217, 119, 6, 0.25)',
          badgeBg: 'rgba(217, 119, 6, 0.15)',
          badgeText: '#FDBA74',
          badgeBorder: 'rgba(217, 119, 6, 0.35)',
        };
      case 'critical':
      default:
        return {
          stroke: colors.crimson,
          gradientStart: '#F87171',
          gradientEnd: '#DC2626',
          glow: 'rgba(239, 68, 68, 0.28)',
          badgeBg: 'rgba(239, 68, 68, 0.15)',
          badgeText: '#FCA5A5',
          badgeBorder: 'rgba(239, 68, 68, 0.35)',
        };
    }
  };

  const palette = getThemePalette();

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Background ambient glow */}
      <View
        style={[
          styles.glowLayer,
          {
            width: size * 0.82,
            height: size * 0.82,
            backgroundColor: palette.glow,
            borderRadius: (size * 0.82) / 2,
          },
        ]}
      />

      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={palette.gradientStart} />
            <Stop offset="100%" stopColor={palette.gradientEnd} />
          </LinearGradient>
        </Defs>

        {/* Inactive Track Ring */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Active Animated Progress Stroke Ring */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#scoreGradient)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          originX={size / 2}
          originY={size / 2}
          rotation="-90"
        />
      </Svg>

      {/* Center Metrics Display */}
      <View style={styles.centerContent}>
        <Text style={[styles.scoreNumber, { color: colors.textPrimary }]}>
          {Math.round(score)}
        </Text>
        <Text style={styles.subtext}>{label}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  glowLayer: {
    position: 'absolute',
    opacity: 0.85,
  },
  centerContent: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreNumber: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 38,
    fontFamily: typography.fontFamily.mono,
  },
  subtext: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 2,
  },
});
