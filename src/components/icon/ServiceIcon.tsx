/**
 * ServiceIcon Component
 * Dynamic service brand icon, remote favicon/image, and monogram badge with obsidian dark palette
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome } from '@expo/vector-icons';
import { colors, radius } from '../../theme';
import { VaultItemType } from '../../types/vault';

export type ServiceIconType =
  | 'google'
  | 'github'
  | 'aws'
  | 'apple'
  | 'microsoft'
  | 'slack'
  | 'twitter'
  | 'x'
  | 'discord'
  | 'spotify'
  | 'netflix'
  | 'dropbox'
  | 'reddit'
  | 'amazon'
  | 'youtube'
  | 'archive'
  | 'mail'
  | 'key'
  | 'wifi';

export interface ServiceIconProps {
  iconType?: ServiceIconType | string;
  category?: VaultItemType | string;
  title?: string;
  size?: 'sm' | 'md' | 'lg';
}

const MONOGRAM_PALETTES = [
  { bg: 'rgba(123, 97, 255, 0.16)', text: '#9D85FF', border: 'rgba(123, 97, 255, 0.35)' }, // Purple / Amethyst
  { bg: 'rgba(16, 185, 129, 0.16)', text: '#34D399', border: 'rgba(16, 185, 129, 0.35)' }, // Emerald
  { bg: 'rgba(59, 130, 246, 0.16)', text: '#60A5FA', border: 'rgba(59, 130, 246, 0.35)' }, // Sapphire
  { bg: 'rgba(245, 158, 11, 0.16)', text: '#FBBF24', border: 'rgba(245, 158, 11, 0.35)' }, // Amber
  { bg: 'rgba(244, 63, 94, 0.16)',  text: '#FB7185', border: 'rgba(244, 63, 94, 0.35)' }, // Crimson
  { bg: 'rgba(6, 182, 212, 0.16)',  text: '#22D3EE', border: 'rgba(6, 182, 212, 0.35)' }, // Cyan
];

export function ServiceIcon({
  iconType,
  category,
  title = '',
  size = 'md',
}: ServiceIconProps) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [iconType]);

  const dimensions = {
    sm: { box: 34, icon: 18, radiusVal: radius.sm, font: 12 },
    md: { box: 42, icon: 22, radiusVal: radius.md, font: 14 },
    lg: { box: 52, icon: 26, radiusVal: radius.lg, font: 17 },
  }[size];

  const raw = (iconType ?? '').trim();
  const normalized = raw.toLowerCase();

  // 1. Remote Image URL or Favicon
  const isUrl =
    raw.startsWith('http://') ||
    raw.startsWith('https://') ||
    raw.startsWith('data:image/');

  if (!imgError && isUrl) {
    return (
      <View
        style={[
          styles.box,
          {
            width: dimensions.box,
            height: dimensions.box,
            borderRadius: dimensions.radiusVal,
            backgroundColor: '#12141A',
            borderColor: 'rgba(255, 255, 255, 0.15)',
            overflow: 'hidden',
          },
        ]}
      >
        <Image
          source={{ uri: raw }}
          style={{
            width: Math.round(dimensions.box * 0.65),
            height: Math.round(dimensions.box * 0.65),
            borderRadius: Math.round(dimensions.radiusVal * 0.3),
          }}
          resizeMode="contain"
          onError={() => setImgError(true)}
        />
      </View>
    );
  }

  // 2. Known Brand Icons
  if (normalized === 'google') {
    return (
      <View style={[styles.box, { width: dimensions.box, height: dimensions.box, borderRadius: dimensions.radiusVal, backgroundColor: '#1A1428', borderColor: 'rgba(234, 67, 53, 0.3)' }]}>
        <MaterialCommunityIcons name="google" size={dimensions.icon} color="#EA4335" />
      </View>
    );
  }

  if (normalized === 'github') {
    return (
      <View style={[styles.box, { width: dimensions.box, height: dimensions.box, borderRadius: dimensions.radiusVal, backgroundColor: '#131620', borderColor: 'rgba(255, 255, 255, 0.25)' }]}>
        <MaterialCommunityIcons name="github" size={dimensions.icon} color="#FFFFFF" />
      </View>
    );
  }

  if (normalized === 'aws') {
    return (
      <View style={[styles.box, { width: dimensions.box, height: dimensions.box, borderRadius: dimensions.radiusVal, backgroundColor: '#1C160E', borderColor: 'rgba(255, 153, 0, 0.35)' }]}>
        <MaterialCommunityIcons name="aws" size={dimensions.icon} color="#FF9900" />
      </View>
    );
  }

  if (normalized === 'apple') {
    return (
      <View style={[styles.box, { width: dimensions.box, height: dimensions.box, borderRadius: dimensions.radiusVal, backgroundColor: '#15171F', borderColor: 'rgba(255, 255, 255, 0.2)' }]}>
        <MaterialCommunityIcons name="apple" size={dimensions.icon} color="#F5F5F7" />
      </View>
    );
  }

  if (normalized === 'microsoft') {
    return (
      <View style={[styles.box, { width: dimensions.box, height: dimensions.box, borderRadius: dimensions.radiusVal, backgroundColor: '#0E1624', borderColor: 'rgba(0, 164, 239, 0.3)' }]}>
        <MaterialCommunityIcons name="microsoft" size={dimensions.icon} color="#00A4EF" />
      </View>
    );
  }

  if (normalized === 'slack') {
    return (
      <View style={[styles.box, { width: dimensions.box, height: dimensions.box, borderRadius: dimensions.radiusVal, backgroundColor: '#181120', borderColor: 'rgba(224, 30, 90, 0.3)' }]}>
        <MaterialCommunityIcons name="slack" size={dimensions.icon} color="#E01E5A" />
      </View>
    );
  }

  if (normalized === 'spotify') {
    return (
      <View style={[styles.box, { width: dimensions.box, height: dimensions.box, borderRadius: dimensions.radiusVal, backgroundColor: '#0D1A14', borderColor: 'rgba(29, 185, 84, 0.35)' }]}>
        <MaterialCommunityIcons name="spotify" size={dimensions.icon} color="#1DB954" />
      </View>
    );
  }

  if (normalized === 'discord') {
    return (
      <View style={[styles.box, { width: dimensions.box, height: dimensions.box, borderRadius: dimensions.radiusVal, backgroundColor: '#14152A', borderColor: 'rgba(88, 101, 242, 0.35)' }]}>
        <Ionicons name="logo-discord" size={dimensions.icon} color="#5865F2" />
      </View>
    );
  }

  if (normalized === 'netflix') {
    return (
      <View style={[styles.box, { width: dimensions.box, height: dimensions.box, borderRadius: dimensions.radiusVal, backgroundColor: '#200E12', borderColor: 'rgba(229, 9, 20, 0.35)' }]}>
        <MaterialCommunityIcons name="netflix" size={dimensions.icon} color="#E50914" />
      </View>
    );
  }

  if (normalized === 'twitter' || normalized === 'x') {
    return (
      <View style={[styles.box, { width: dimensions.box, height: dimensions.box, borderRadius: dimensions.radiusVal, backgroundColor: '#0C1826', borderColor: 'rgba(29, 161, 242, 0.35)' }]}>
        <MaterialCommunityIcons name="twitter" size={dimensions.icon} color="#1DA1F2" />
      </View>
    );
  }

  if (normalized === 'dropbox') {
    return (
      <View style={[styles.box, { width: dimensions.box, height: dimensions.box, borderRadius: dimensions.radiusVal, backgroundColor: '#0B1728', borderColor: 'rgba(0, 97, 255, 0.35)' }]}>
        <MaterialCommunityIcons name="dropbox" size={dimensions.icon} color="#0061FF" />
      </View>
    );
  }

  if (normalized === 'reddit') {
    return (
      <View style={[styles.box, { width: dimensions.box, height: dimensions.box, borderRadius: dimensions.radiusVal, backgroundColor: '#20120B', borderColor: 'rgba(255, 69, 0, 0.35)' }]}>
        <MaterialCommunityIcons name="reddit" size={dimensions.icon} color="#FF4500" />
      </View>
    );
  }

  if (normalized === 'amazon') {
    return (
      <View style={[styles.box, { width: dimensions.box, height: dimensions.box, borderRadius: dimensions.radiusVal, backgroundColor: '#1C160E', borderColor: 'rgba(255, 153, 0, 0.35)' }]}>
        <FontAwesome name="amazon" size={dimensions.icon} color="#FF9900" />
      </View>
    );
  }

  if (normalized === 'youtube') {
    return (
      <View style={[styles.box, { width: dimensions.box, height: dimensions.box, borderRadius: dimensions.radiusVal, backgroundColor: '#200E0E', borderColor: 'rgba(255, 0, 0, 0.35)' }]}>
        <MaterialCommunityIcons name="youtube" size={dimensions.icon} color="#FF0000" />
      </View>
    );
  }

  if (normalized === 'wifi') {
    return (
      <View style={[styles.box, { width: dimensions.box, height: dimensions.box, borderRadius: dimensions.radiusVal, backgroundColor: '#0E1A1E', borderColor: 'rgba(6, 182, 212, 0.3)' }]}>
        <Ionicons name="wifi" size={dimensions.icon} color="#22D3EE" />
      </View>
    );
  }

  // 3. Category Generic Icons
  const cat = (category ?? '').toUpperCase();
  if (cat === 'CARD' || normalized === 'card') {
    return (
      <View style={[styles.box, { width: dimensions.box, height: dimensions.box, borderRadius: dimensions.radiusVal, backgroundColor: '#1A1324', borderColor: 'rgba(123, 97, 255, 0.35)' }]}>
        <Ionicons name="card-outline" size={dimensions.icon} color={colors.primaryLight} />
      </View>
    );
  }

  if (cat === 'SECURE_NOTE' || cat === 'SECURE NOTE' || normalized === 'archive' || normalized === 'note') {
    return (
      <View style={[styles.box, { width: dimensions.box, height: dimensions.box, borderRadius: dimensions.radiusVal, backgroundColor: '#111822', borderColor: 'rgba(59, 130, 246, 0.3)' }]}>
        <MaterialCommunityIcons name="note-text-outline" size={dimensions.icon} color="#60A5FA" />
      </View>
    );
  }

  if (cat === 'TOTP' || normalized === 'totp') {
    return (
      <View style={[styles.box, { width: dimensions.box, height: dimensions.box, borderRadius: dimensions.radiusVal, backgroundColor: '#0F1A15', borderColor: 'rgba(16, 185, 129, 0.35)' }]}>
        <MaterialCommunityIcons name="shield-key-outline" size={dimensions.icon} color={colors.emerald} />
      </View>
    );
  }

  if (cat === 'API_KEY' || cat === 'API KEY' || normalized === 'key') {
    return (
      <View style={[styles.box, { width: dimensions.box, height: dimensions.box, borderRadius: dimensions.radiusVal, backgroundColor: '#1C150D', borderColor: 'rgba(245, 158, 11, 0.35)' }]}>
        <MaterialCommunityIcons name="key-variant" size={dimensions.icon} color="#FBBF24" />
      </View>
    );
  }

  if (cat === 'IDENTITY' || normalized === 'identity') {
    return (
      <View style={[styles.box, { width: dimensions.box, height: dimensions.box, borderRadius: dimensions.radiusVal, backgroundColor: '#131A24', borderColor: 'rgba(56, 189, 248, 0.3)' }]}>
        <Ionicons name="person-outline" size={dimensions.icon} color="#38BDF8" />
      </View>
    );
  }

  if (cat === 'RECOVERY_CODES' || normalized === 'recovery') {
    return (
      <View style={[styles.box, { width: dimensions.box, height: dimensions.box, borderRadius: dimensions.radiusVal, backgroundColor: '#1E1218', borderColor: 'rgba(244, 63, 94, 0.35)' }]}>
        <Ionicons name="grid-outline" size={dimensions.icon} color="#FB7185" />
      </View>
    );
  }

  // 4. Monogram Fallback from Title
  const cleanTitle = title.trim();
  const initials = cleanTitle.length > 0
    ? cleanTitle.substring(0, cleanTitle.length >= 2 && !cleanTitle.includes(' ') ? 2 : 1).toUpperCase()
    : 'VN';

  // Compute deterministic index based on title characters
  let charSum = 0;
  for (let i = 0; i < cleanTitle.length; i++) {
    charSum += cleanTitle.charCodeAt(i);
  }
  const palette = MONOGRAM_PALETTES[charSum % MONOGRAM_PALETTES.length];

  return (
    <View
      style={[
        styles.box,
        {
          width: dimensions.box,
          height: dimensions.box,
          borderRadius: dimensions.radiusVal,
          backgroundColor: palette.bg,
          borderColor: palette.border,
        },
      ]}
    >
      <Text style={[styles.monogramText, { fontSize: dimensions.font, color: palette.text }]}>
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  monogramText: {
    fontWeight: '800',
    letterSpacing: -0.2,
  },
});
