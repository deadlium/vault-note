import { Platform, TextStyle } from 'react-native';

export const typography = {
  // Font Families
  fontFamily: {
    sans: Platform.select({
      ios: 'System',
      android: 'Roboto',
      default: 'sans-serif',
    }),
    mono: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      default: 'monospace',
    }),
  },

  // Font Sizes & Corresponding Line Heights
  sizes: {
    xs: { fontSize: 12, lineHeight: 16 } as const,
    sm: { fontSize: 14, lineHeight: 20 } as const,
    base: { fontSize: 16, lineHeight: 24 } as const,
    lg: { fontSize: 18, lineHeight: 26 } as const,
    xl: { fontSize: 20, lineHeight: 28 } as const,
    '2xl': { fontSize: 24, lineHeight: 32 } as const,
    '3xl': { fontSize: 30, lineHeight: 38 } as const,
    '4xl': { fontSize: 36, lineHeight: 44 } as const,
  },

  // Font Weights
  weights: {
    regular: '400' as TextStyle['fontWeight'],
    medium: '500' as TextStyle['fontWeight'],
    semibold: '600' as TextStyle['fontWeight'],
    bold: '700' as TextStyle['fontWeight'],
  },

  // Letter Spacing
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
    mono: 1.2,
  },
} as const;

export type TypographySize = keyof typeof typography.sizes;
