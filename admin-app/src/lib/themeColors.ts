export interface ThemeColor {
  name: string;
  hex: string;
  darkHex: string;
  hsl: string;
  hslLight: string;
  hslDark: string;
  darkHsl: string;
  darkHslLight: string;
  darkHslDark: string;
  gradient?: string;
}

export const THEME_STORAGE_KEY = 'zentrix-theme-color';
export const DEFAULT_THEME = '∿ Ocean Deep';

export const THEME_GRADIENTS: Record<string, string> = {
  '∿ Aurora': 'linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)',
  '∿ Sunset Glow': 'linear-gradient(135deg, #f97316 0%, #ef4444 50%, #ec4899 100%)',
  '∿ Midnight': 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
  '∿ Steel Chrome': 'linear-gradient(135deg, #636e72 0%, #b2bec3 50%, #dfe6e9 100%)',
  '∿ Ash': 'linear-gradient(135deg, #485460 0%, #808e9b 50%, #a5b1c2 100%)',
  '∿ Carbon': 'linear-gradient(135deg, #2d3436 0%, #636e72 100%)',
  '∿ Ocean Deep': 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
  '∿ Forge': 'linear-gradient(135deg, #b8860b 0%, #cd7f32 50%, #8b6914 100%)',
  '∿ Inferno': 'linear-gradient(135deg, #7f0000 0%, #c0392b 40%, #e74c3c 100%)',
  '∿ Venom': 'linear-gradient(135deg, #1a472a 0%, #2d6a4f 50%, #00b09b 100%)',
  '∿ Titan': 'linear-gradient(135deg, #0d0d0d 0%, #1a237e 50%, #283593 100%)',
  '∿ Blade': 'linear-gradient(135deg, #37474f 0%, #546e7a 40%, #00b0ff 100%)',
  '∿ Ember': 'linear-gradient(135deg, #bf360c 0%, #e64a19 40%, #ff6f00 100%)',
  '∿ Viper': 'linear-gradient(135deg, #1b5e20 0%, #2e7d32 50%, #76ff03 100%)',
  '∿ War': 'linear-gradient(135deg, #4a0000 0%, #880e4f 50%, #ad1457 100%)',
  '∿ Thunder': 'linear-gradient(135deg, #212121 0%, #37474f 40%, #7986cb 100%)',
};

export const THEME_COLORS: ThemeColor[] = [
  {
    name: 'Linear Blue',
    hex: '#5e6ad2',
    darkHex: '#5c84fe',
    hsl: '231 56% 60%',
    hslLight: '231 56% 70%',
    hslDark: '231 56% 50%',
    darkHsl: '224 98% 68%',
    darkHslLight: '224 98% 78%',
    darkHslDark: '224 98% 58%',
  },
  {
    name: 'Cobalt',
    hex: '#2563eb',
    darkHex: '#3b82f6',
    hsl: '217 91% 53%',
    hslLight: '217 91% 63%',
    hslDark: '217 91% 43%',
    darkHsl: '217 91% 60%',
    darkHslLight: '217 91% 70%',
    darkHslDark: '217 91% 50%',
  },
  {
    name: 'Indigo',
    hex: '#4f46e5',
    darkHex: '#6366f1',
    hsl: '245 75% 58%',
    hslLight: '245 75% 68%',
    hslDark: '245 75% 48%',
    darkHsl: '239 84% 67%',
    darkHslLight: '239 84% 77%',
    darkHslDark: '239 84% 57%',
  },
  {
    name: 'Violet',
    hex: '#7c3aed',
    darkHex: '#8b5cf6',
    hsl: '263 84% 58%',
    hslLight: '263 84% 68%',
    hslDark: '263 84% 48%',
    darkHsl: '258 90% 66%',
    darkHslLight: '258 90% 76%',
    darkHslDark: '258 90% 56%',
  },
  {
    name: 'Emerald',
    hex: '#059669',
    darkHex: '#34d399',
    hsl: '160 84% 30%',
    hslLight: '160 84% 40%',
    hslDark: '160 84% 22%',
    darkHsl: '160 64% 52%',
    darkHslLight: '160 64% 62%',
    darkHslDark: '160 64% 42%',
  },
  {
    name: 'Slate',
    hex: '#475569',
    darkHex: '#94a3b8',
    hsl: '215 16% 34%',
    hslLight: '215 16% 44%',
    hslDark: '215 16% 26%',
    darkHsl: '215 20% 65%',
    darkHslLight: '215 20% 75%',
    darkHslDark: '215 20% 55%',
  },
  {
    name: 'Rose',
    hex: '#e11d48',
    darkHex: '#fb7185',
    hsl: '347 77% 50%',
    hslLight: '347 77% 60%',
    hslDark: '347 77% 40%',
    darkHsl: '351 95% 73%',
    darkHslLight: '351 95% 83%',
    darkHslDark: '351 95% 63%',
  },
  {
    name: 'Amber',
    hex: '#d97706',
    darkHex: '#fbbf24',
    hsl: '32 95% 44%',
    hslLight: '32 95% 54%',
    hslDark: '32 95% 36%',
    darkHsl: '45 93% 56%',
    darkHslLight: '45 93% 66%',
    darkHslDark: '45 93% 46%',
  },
  {
    name: 'Neon Mint',
    hex: '#00c9a7',
    darkHex: '#00e5bf',
    hsl: '170 100% 39%',
    hslLight: '170 100% 49%',
    hslDark: '170 100% 31%',
    darkHsl: '170 100% 45%',
    darkHslLight: '170 100% 55%',
    darkHslDark: '170 100% 35%',
  },
  {
    name: 'Electric Purple',
    hex: '#9b00ff',
    darkHex: '#b44dff',
    hsl: '277 100% 50%',
    hslLight: '277 100% 60%',
    hslDark: '277 100% 40%',
    darkHsl: '277 100% 65%',
    darkHslLight: '277 100% 75%',
    darkHslDark: '277 100% 55%',
  },
  {
    name: 'Coral',
    hex: '#ff6b6b',
    darkHex: '#ff8585',
    hsl: '0 100% 71%',
    hslLight: '0 100% 81%',
    hslDark: '0 100% 61%',
    darkHsl: '0 100% 76%',
    darkHslLight: '0 100% 86%',
    darkHslDark: '0 100% 66%',
  },
  {
    name: 'Sky',
    hex: '#0ea5e9',
    darkHex: '#38bdf8',
    hsl: '199 89% 48%',
    hslLight: '199 89% 58%',
    hslDark: '199 89% 40%',
    darkHsl: '199 95% 60%',
    darkHslLight: '199 95% 70%',
    darkHslDark: '199 95% 50%',
  },
  {
    name: 'Teal',
    hex: '#0d9488',
    darkHex: '#2dd4bf',
    hsl: '177 75% 32%',
    hslLight: '177 75% 42%',
    hslDark: '177 75% 24%',
    darkHsl: '174 72% 51%',
    darkHslLight: '174 72% 61%',
    darkHslDark: '174 72% 41%',
  },
  {
    name: 'Sunset',
    hex: '#f97316',
    darkHex: '#fb923c',
    hsl: '25 95% 53%',
    hslLight: '25 95% 63%',
    hslDark: '25 95% 43%',
    darkHsl: '25 97% 61%',
    darkHslLight: '25 97% 71%',
    darkHslDark: '25 97% 51%',
  },
  {
    name: 'Gold',
    hex: '#eab308',
    darkHex: '#facc15',
    hsl: '45 93% 47%',
    hslLight: '45 93% 57%',
    hslDark: '45 93% 37%',
    darkHsl: '48 96% 53%',
    darkHslLight: '48 96% 63%',
    darkHslDark: '48 96% 43%',
  },
  {
    name: 'Fuchsia',
    hex: '#a21caf',
    darkHex: '#d946ef',
    hsl: '296 74% 40%',
    hslLight: '296 74% 50%',
    hslDark: '296 74% 30%',
    darkHsl: '292 91% 60%',
    darkHslLight: '292 91% 70%',
    darkHslDark: '292 91% 50%',
  },
  {
    name: 'Gunmetal',
    hex: '#2d3436',
    darkHex: '#4a5568',
    hsl: '210 9% 20%',
    hslLight: '210 9% 30%',
    hslDark: '210 9% 14%',
    darkHsl: '214 14% 35%',
    darkHslLight: '214 14% 45%',
    darkHslDark: '214 14% 25%',
  },
  {
    name: 'Steel',
    hex: '#546e7a',
    darkHex: '#78909c',
    hsl: '199 16% 40%',
    hslLight: '199 16% 50%',
    hslDark: '199 16% 32%',
    darkHsl: '199 14% 54%',
    darkHslLight: '199 14% 64%',
    darkHslDark: '199 14% 44%',
  },
  {
    name: 'Obsidian',
    hex: '#1a1a2e',
    darkHex: '#16213e',
    hsl: '240 32% 14%',
    hslLight: '240 32% 24%',
    hslDark: '240 32% 8%',
    darkHsl: '222 42% 17%',
    darkHslLight: '222 42% 27%',
    darkHslDark: '222 42% 11%',
  },
  {
    name: 'Forest',
    hex: '#2d6a4f',
    darkHex: '#40916c',
    hsl: '152 39% 30%',
    hslLight: '152 39% 40%',
    hslDark: '152 39% 22%',
    darkHsl: '152 37% 41%',
    darkHslLight: '152 37% 51%',
    darkHslDark: '152 37% 31%',
  },
  {
    name: 'Crimson',
    hex: '#9b2335',
    darkHex: '#c0392b',
    hsl: '352 62% 37%',
    hslLight: '352 62% 47%',
    hslDark: '352 62% 29%',
    darkHsl: '5 63% 46%',
    darkHslLight: '5 63% 56%',
    darkHslDark: '5 63% 36%',
  },
  {
    name: 'Navy',
    hex: '#1b3a6b',
    darkHex: '#2b5099',
    hsl: '218 59% 26%',
    hslLight: '218 59% 36%',
    hslDark: '218 59% 18%',
    darkHsl: '218 56% 39%',
    darkHslLight: '218 56% 49%',
    darkHslDark: '218 56% 29%',
  },
  {
    name: 'Bronze',
    hex: '#cd7f32',
    darkHex: '#e8a84e',
    hsl: '30 58% 50%',
    hslLight: '30 58% 60%',
    hslDark: '30 58% 40%',
    darkHsl: '35 75% 60%',
    darkHslLight: '35 75% 70%',
    darkHslDark: '35 75% 50%',
  },
  {
    name: 'Charcoal',
    hex: '#36454f',
    darkHex: '#546e7a',
    hsl: '200 18% 26%',
    hslLight: '200 18% 36%',
    hslDark: '200 18% 18%',
    darkHsl: '199 16% 40%',
    darkHslLight: '199 16% 50%',
    darkHslDark: '199 16% 30%',
  },
  {
    name: '∿ Aurora',
    hex: '#6366f1',
    darkHex: '#818cf8',
    hsl: '239 84% 67%',
    hslLight: '239 84% 77%',
    hslDark: '239 84% 57%',
    darkHsl: '234 89% 74%',
    darkHslLight: '234 89% 84%',
    darkHslDark: '234 89% 64%',
  },
  {
    name: '∿ Sunset Glow',
    hex: '#f97316',
    darkHex: '#fb923c',
    hsl: '25 95% 53%',
    hslLight: '25 95% 63%',
    hslDark: '25 95% 43%',
    darkHsl: '25 97% 61%',
    darkHslLight: '25 97% 71%',
    darkHslDark: '25 97% 51%',
  },
  {
    name: '∿ Midnight',
    hex: '#1b3a6b',
    darkHex: '#2b5099',
    hsl: '218 59% 26%',
    hslLight: '218 59% 36%',
    hslDark: '218 59% 18%',
    darkHsl: '218 56% 39%',
    darkHslLight: '218 56% 49%',
    darkHslDark: '218 56% 29%',
  },
  {
    name: '∿ Steel Chrome',
    hex: '#546e7a',
    darkHex: '#78909c',
    hsl: '199 16% 40%',
    hslLight: '199 16% 50%',
    hslDark: '199 16% 32%',
    darkHsl: '199 14% 54%',
    darkHslLight: '199 14% 64%',
    darkHslDark: '199 14% 44%',
  },
  {
    name: '∿ Ash',
    hex: '#485460',
    darkHex: '#808e9b',
    hsl: '210 15% 33%',
    hslLight: '210 15% 43%',
    hslDark: '210 15% 25%',
    darkHsl: '210 12% 55%',
    darkHslLight: '210 12% 65%',
    darkHslDark: '210 12% 45%',
  },
  {
    name: '∿ Carbon',
    hex: '#2d3436',
    darkHex: '#636e72',
    hsl: '210 9% 20%',
    hslLight: '210 9% 30%',
    hslDark: '210 9% 14%',
    darkHsl: '195 5% 42%',
    darkHslLight: '195 5% 52%',
    darkHslDark: '195 5% 32%',
  },
  {
    name: '∿ Ocean Deep',
    hex: '#302b63',
    darkHex: '#24243e',
    hsl: '245 39% 28%',
    hslLight: '245 39% 38%',
    hslDark: '245 39% 20%',
    darkHsl: '240 25% 19%',
    darkHslLight: '240 25% 29%',
    darkHslDark: '240 25% 13%',
  },
  {
    name: '∿ Forge',
    hex: '#cd7f32',
    darkHex: '#e8a84e',
    hsl: '30 58% 50%',
    hslLight: '30 58% 60%',
    hslDark: '30 58% 40%',
    darkHsl: '35 75% 60%',
    darkHslLight: '35 75% 70%',
    darkHslDark: '35 75% 50%',
  },
  {
    name: '∿ Inferno',
    hex: '#c0392b',
    darkHex: '#e74c3c',
    hsl: '5 63% 46%',
    hslLight: '5 63% 56%',
    hslDark: '5 63% 36%',
    darkHsl: '4 77% 57%',
    darkHslLight: '4 77% 67%',
    darkHslDark: '4 77% 47%',
  },
  {
    name: '∿ Venom',
    hex: '#2d6a4f',
    darkHex: '#00b09b',
    hsl: '152 39% 30%',
    hslLight: '152 39% 40%',
    hslDark: '152 39% 22%',
    darkHsl: '173 100% 35%',
    darkHslLight: '173 100% 45%',
    darkHslDark: '173 100% 25%',
  },
  {
    name: '∿ Titan',
    hex: '#1a237e',
    darkHex: '#283593',
    hsl: '234 67% 30%',
    hslLight: '234 67% 40%',
    hslDark: '234 67% 22%',
    darkHsl: '231 56% 37%',
    darkHslLight: '231 56% 47%',
    darkHslDark: '231 56% 27%',
  },
  {
    name: '∿ Blade',
    hex: '#37474f',
    darkHex: '#00b0ff',
    hsl: '200 16% 26%',
    hslLight: '200 16% 36%',
    hslDark: '200 16% 18%',
    darkHsl: '199 100% 50%',
    darkHslLight: '199 100% 60%',
    darkHslDark: '199 100% 40%',
  },
  {
    name: '∿ Ember',
    hex: '#e64a19',
    darkHex: '#ff6f00',
    hsl: '16 78% 50%',
    hslLight: '16 78% 60%',
    hslDark: '16 78% 40%',
    darkHsl: '27 100% 50%',
    darkHslLight: '27 100% 60%',
    darkHslDark: '27 100% 40%',
  },
  {
    name: '∿ Viper',
    hex: '#2e7d32',
    darkHex: '#76ff03',
    hsl: '123 46% 34%',
    hslLight: '123 46% 44%',
    hslDark: '123 46% 26%',
    darkHsl: '88 100% 50%',
    darkHslLight: '88 100% 60%',
    darkHslDark: '88 100% 40%',
  },
  {
    name: '∿ War',
    hex: '#880e4f',
    darkHex: '#ad1457',
    hsl: '335 82% 29%',
    hslLight: '335 82% 39%',
    hslDark: '335 82% 21%',
    darkHsl: '337 78% 37%',
    darkHslLight: '337 78% 47%',
    darkHslDark: '337 78% 27%',
  },
  {
    name: '∿ Thunder',
    hex: '#37474f',
    darkHex: '#7986cb',
    hsl: '200 16% 26%',
    hslLight: '200 16% 36%',
    hslDark: '200 16% 18%',
    darkHsl: '231 44% 63%',
    darkHslLight: '231 44% 73%',
    darkHslDark: '231 44% 53%',
  },
];

export function applyThemeColor(colorName: string): void {
  const color = THEME_COLORS.find((c) => c.name === colorName);
  if (!color) return;

  const root = document.documentElement;
  const isDark = root.classList.contains('dark');
  const hsl = isDark ? color.darkHsl : color.hsl;
  const hslLight = isDark ? color.darkHslLight : color.hslLight;
  const hslDark = isDark ? color.darkHslDark : color.hslDark;
  const hex = isDark ? color.darkHex : color.hex;

  root.style.setProperty('--primary', hsl);
  root.style.setProperty('--primary-light', hslLight);
  root.style.setProperty('--primary-dark', hslDark);
  root.style.setProperty('--active', `${hex}14`);
  root.style.setProperty('--ring', hex);
  root.style.setProperty('--accent', hex);
  root.style.setProperty('--accent-hover', hex);
  root.style.setProperty('--accent-muted', hex);
  root.style.setProperty('--info', hex);

  const grad = THEME_GRADIENTS[color.name];
  if (grad) {
    root.style.setProperty('--btn-bg', grad);
    root.style.setProperty('--primary-gradient', grad);
  } else {
    root.style.setProperty('--btn-bg', hex);
    root.style.setProperty('--primary-gradient', 'none');
  }

  // Set --metric-off-bg: neutral gray for warm/green themes, primary tint for cool/dark
  // Parse hue from HSL string (first number)
  const hslParts = hsl.split(' ');
  const hue = parseFloat(hslParts[0]);
  const sat = parseFloat(hslParts[1]);
  // Warm hues: 30–180 (yellow, green, teal) → use gray. Cool/dark: others → use primary tint
  const isWarmOrGreen = !isNaN(hue) && !isNaN(sat) && sat > 20 && hue >= 60 && hue <= 200;
  // Also treat very low saturation (grays) as neutral
  const isGray = !isNaN(sat) && sat < 15;
  if (isWarmOrGreen || isGray) {
    root.style.setProperty('--metric-off-bg', isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)');
  } else {
    root.style.setProperty('--metric-off-bg', `hsl(${hsl} / 0.15)`);
  }
}

export function getSavedTheme(): string {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved && THEME_COLORS.some((c) => c.name === saved)) {
      return saved;
    }
  } catch {
    // ignore
  }
  return DEFAULT_THEME;
}

export function saveThemeColor(
  color: string,
  updateFn: (color: string) => Promise<void>
): void {
  // 1. Save to localStorage immediately
  try {
    localStorage.setItem(THEME_STORAGE_KEY, color);
  } catch {
    // Storage full or private browsing — still persist to DB
  }
  // 2. Persist to DB
  updateFn(color);
}

export function initTheme(): void {
  applyThemeColor(getSavedTheme());
}
