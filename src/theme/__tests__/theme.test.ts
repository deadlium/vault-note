import test from 'node:test';
import assert from 'node:assert';
import { colors, darkColors, lightColors } from '../colors';

test('Theme Tokens: Dark color tokens adhere to executive obsidian specifications', () => {
  assert.strictEqual(darkColors.background, '#0D0E11');
  assert.strictEqual(darkColors.textPrimary, '#FFFFFF');
  assert.strictEqual(darkColors.primary, '#7B61FF');
  assert.strictEqual(darkColors.emerald, '#10B981');
  assert.strictEqual(darkColors.crimson, '#EF4444');
});

test('Theme Tokens: Light color tokens provide high-contrast clean aesthetic', () => {
  assert.strictEqual(lightColors.background, '#FAF8FF');
  assert.strictEqual(lightColors.textPrimary, '#0F172A');
  assert.strictEqual(lightColors.surface, '#FFFFFF');
  assert.strictEqual(lightColors.primary, '#4F46E5');
  assert.strictEqual(lightColors.emerald, '#10B981');
});

test('Theme Tokens: Base colors object defaults to dark palette for backwards compatibility', () => {
  assert.strictEqual(colors.background, '#0D0E11');
  assert.strictEqual(colors.textPrimary, '#FFFFFF');
});
