import { describe, it, expect } from 'vitest';
import {
  ICON_SIZES,
  ICON_COLORS,
  ICON_SPACING,
  ICON_STROKE_WIDTH,
} from './iconography';

describe('ICON_SIZES', () => {
  it('has all expected size keys', () => {
    expect(ICON_SIZES).toHaveProperty('xs');
    expect(ICON_SIZES).toHaveProperty('sm');
    expect(ICON_SIZES).toHaveProperty('md');
    expect(ICON_SIZES).toHaveProperty('lg');
    expect(ICON_SIZES).toHaveProperty('xl');
    expect(ICON_SIZES).toHaveProperty('2xl');
  });

  it('all values are tailwind h-w class strings', () => {
    for (const value of Object.values(ICON_SIZES)) {
      expect(value).toMatch(/^h-\S+ w-\S+$/);
    }
  });

  it('returns correct classes', () => {
    expect(ICON_SIZES.xs).toBe('h-3 w-3');
    expect(ICON_SIZES.sm).toBe('h-4 w-4');
    expect(ICON_SIZES.md).toBe('h-5 w-5');
    expect(ICON_SIZES['2xl']).toBe('h-12 w-12');
  });
});

describe('ICON_COLORS', () => {
  it('has expected color keys', () => {
    expect(ICON_COLORS).toHaveProperty('default');
    expect(ICON_COLORS).toHaveProperty('primary');
    expect(ICON_COLORS).toHaveProperty('success');
    expect(ICON_COLORS).toHaveProperty('warning');
    expect(ICON_COLORS).toHaveProperty('error');
    expect(ICON_COLORS).toHaveProperty('muted');
  });

  it('all values are tailwind text- classes', () => {
    for (const value of Object.values(ICON_COLORS)) {
      expect(value).toMatch(/^text-/);
    }
  });
});

describe('ICON_SPACING', () => {
  it('has expected spacing keys', () => {
    expect(ICON_SPACING).toHaveProperty('before');
    expect(ICON_SPACING).toHaveProperty('after');
    expect(ICON_SPACING).toHaveProperty('tight');
    expect(ICON_SPACING).toHaveProperty('loose');
  });

  it('returns margin classes', () => {
    expect(ICON_SPACING.before).toBe('mr-2');
    expect(ICON_SPACING.after).toBe('ml-2');
    expect(ICON_SPACING.tight).toBe('mr-1.5');
    expect(ICON_SPACING.loose).toBe('mr-3');
  });
});

describe('ICON_STROKE_WIDTH', () => {
  it('is a number', () => {
    expect(typeof ICON_STROKE_WIDTH).toBe('number');
  });

  it('equals 2', () => {
    expect(ICON_STROKE_WIDTH).toBe(2);
  });
});
