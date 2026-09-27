import { colors, darkColors, lightColors, ColorToken, ThemeColors, ThemeMode } from './colors';
import { typography, TypographySize } from './typography';
import { spacing, radius, shadows, SpacingToken, RadiusToken } from './spacing';
import { ThemeContext, ThemeProvider, useTheme, ThemeContextValue } from './ThemeContext';

export const theme = {
  colors,
  darkColors,
  lightColors,
  typography,
  spacing,
  radius,
  shadows,
} as const;

export type Theme = typeof theme;

export {
  colors,
  darkColors,
  lightColors,
  typography,
  spacing,
  radius,
  shadows,
  ColorToken,
  ThemeColors,
  ThemeMode,
  TypographySize,
  SpacingToken,
  RadiusToken,
  ThemeContext,
  ThemeProvider,
  useTheme,
  ThemeContextValue,
};

export default theme;
