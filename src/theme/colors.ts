/**
 * VaultNote Obsidian Color Tokens
 * Pixel-matched with design/vault_home.png & design/login_detail.png
 */

export const colors = {
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

export type ColorToken = keyof typeof colors;
