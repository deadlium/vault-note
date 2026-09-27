/**
 * VaultNote Color Tokens
 * Pixel-matched with design specifications
 */

export const darkColors = {
  // Base Canvas & Surfaces
  background: '#0D0E11',
  backgroundSubtle: '#101116',
  surface: '#15161C',
  surfaceElevated: '#1C1D24',
  surfaceSubtle: '#20222A',
  surfaceActive: '#292B35',

  // Borders
  border: '#21232B',
  borderSubtle: '#181A20',
  borderFocus: '#7B61FF',
  borderActive: '#30333E',

  // Brand Accent (Lavender / Purple)
  primary: '#7B61FF',
  primaryDark: '#6246EA',
  primaryLight: '#9D8DFF',
  primaryMuted: 'rgba(123, 97, 255, 0.14)',
  primaryGlow: 'rgba(123, 97, 255, 0.25)',
  fabPurple: '#C4B5FD',

  // Semantic Status Colors
  emerald: '#10B981',
  emeraldDark: '#059669',
  emeraldMuted: 'rgba(16, 185, 129, 0.12)',
  emeraldBorder: 'rgba(16, 185, 129, 0.25)',

  amber: '#F59E0B',
  amberDark: '#D97706',
  amberMuted: 'rgba(245, 158, 11, 0.12)',
  amberBorder: 'rgba(245, 158, 11, 0.25)',

  crimson: '#EF4444',
  crimsonDark: '#DC2626',
  crimsonMuted: 'rgba(239, 68, 68, 0.12)',

  cyan: '#06B6D4',
  cyanMuted: 'rgba(6, 182, 212, 0.12)',

  gold: '#FBBF24',

  // Typography Hierarchy
  textPrimary: '#FFFFFF',
  textSecondary: '#8A8F9E',
  textTertiary: '#606474',
  textMuted: '#444754',
  textInverse: '#0D0E11',

  // Overlay & Shield
  overlay: 'rgba(13, 14, 17, 0.85)',
  privacyShield: '#0D0E11',
} as const;

export const lightColors = {
  // Base Canvas & Surfaces
  background: '#FAF8FF',
  backgroundSubtle: '#F2F3FF',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceSubtle: '#F1F5F9',
  surfaceActive: '#EAEDFF',

  // Borders
  border: '#E2E8F0',
  borderSubtle: '#F1F5F9',
  borderFocus: '#4F46E5',
  borderActive: '#CBD5E1',

  // Brand Accent (Electric Indigo / Violet)
  primary: '#4F46E5',
  primaryDark: '#3525CD',
  primaryLight: '#6366F1',
  primaryMuted: 'rgba(79, 70, 229, 0.10)',
  primaryGlow: 'rgba(79, 70, 229, 0.20)',
  fabPurple: '#4F46E5',

  // Semantic Status Colors
  emerald: '#10B981',
  emeraldDark: '#059669',
  emeraldMuted: 'rgba(16, 185, 129, 0.10)',
  emeraldBorder: 'rgba(16, 185, 129, 0.25)',

  amber: '#F59E0B',
  amberDark: '#D97706',
  amberMuted: 'rgba(245, 158, 11, 0.10)',
  amberBorder: 'rgba(245, 158, 11, 0.25)',

  crimson: '#E11D48',
  crimsonDark: '#BA1A1A',
  crimsonMuted: 'rgba(225, 29, 72, 0.10)',

  cyan: '#06B6D4',
  cyanMuted: 'rgba(6, 182, 212, 0.10)',

  gold: '#F59E0B',

  // Typography Hierarchy
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textTertiary: '#64748B',
  textMuted: '#94A3B8',
  textInverse: '#FFFFFF',

  // Overlay & Shield
  overlay: 'rgba(19, 27, 46, 0.45)',
  privacyShield: '#FAF8FF',
} as const;

export type ColorToken = keyof typeof darkColors;

export type ThemeColors = {
  [K in ColorToken]: string;
};

export const colors: ThemeColors = { ...darkColors };

export type ThemeMode = 'dark' | 'light' | 'system';
