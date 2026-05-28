import { describe, it, expect } from 'vitest';
import {
  THEME_COLORS,
  THEME_GRADIENTS,
  THEME_STORAGE_KEY,
  DEFAULT_THEME,
} from './themeColors';

describe('THEME_STORAGE_KEY', () => {
  it('is a non-empty string', () => {
    expect(typeof THEME_STORAGE_KEY).toBe('string');
    expect(THEME_STORAGE_KEY.length).toBeGreaterThan(0);
  });
});

describe('DEFAULT_THEME', () => {
  it('is a non-empty string', () => {
    expect(typeof DEFAULT_THEME).toBe('string');
    expect(DEFAULT_THEME.length).toBeGreaterThan(0);
  });

  it('refers to a color that exists in THEME_COLORS', () => {
    const names = THEME_COLORS.map((c) => c.name);
    expect(names).toContain(DEFAULT_THEME);
  });
});

describe('THEME_COLORS', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(THEME_COLORS)).toBe(true);
    expect(THEME_COLORS.length).toBeGreaterThan(0);
  });

  it('each entry has required fields', () => {
    for (const color of THEME_COLORS) {
      expect(typeof color.name).toBe('string');
      expect(typeof color.hex).toBe('string');
      expect(typeof color.darkHex).toBe('string');
      expect(typeof color.hsl).toBe('string');
      expect(typeof color.hslLight).toBe('string');
      expect(typeof color.hslDark).toBe('string');
      expect(typeof color.darkHsl).toBe('string');
      expect(typeof color.darkHslLight).toBe('string');
      expect(typeof color.darkHslDark).toBe('string');
    }
  });

  it('hex values start with #', () => {
    for (const color of THEME_COLORS) {
      expect(color.hex).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(color.darkHex).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it('has unique names', () => {
    const names = THEME_COLORS.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('contains known colors', () => {
    const names = THEME_COLORS.map((c) => c.name);
    expect(names).toContain('Linear Blue');
    expect(names).toContain('Cobalt');
    expect(names).toContain('Emerald');
  });
});

describe('THEME_GRADIENTS', () => {
  it('is a non-empty object', () => {
    expect(typeof THEME_GRADIENTS).toBe('object');
    expect(Object.keys(THEME_GRADIENTS).length).toBeGreaterThan(0);
  });

  it('all values are CSS linear-gradient strings', () => {
    for (const gradient of Object.values(THEME_GRADIENTS)) {
      expect(gradient).toMatch(/^linear-gradient\(/);
    }
  });

  it('gradient keys correspond to theme color names', () => {
    const colorNames = new Set(THEME_COLORS.map((c) => c.name));
    for (const key of Object.keys(THEME_GRADIENTS)) {
      expect(colorNames.has(key)).toBe(true);
    }
  });
});
