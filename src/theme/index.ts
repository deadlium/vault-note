import { colors, ColorToken } from './colors';
import { typography, TypographySize } from './typography';
import { spacing, radius, shadows, SpacingToken, RadiusToken } from './spacing';

export const theme = {
  colors,
  typography,
  spacing,
  radius,
  shadows,
} as const;

export type Theme = typeof theme;

export {
  colors,
  typography,
  spacing,
  radius,
  shadows,
  ColorToken,
  TypographySize,
  SpacingToken,
  RadiusToken,
};

export default theme;
