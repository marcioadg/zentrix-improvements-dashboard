// ─── Linear Design System Theme Tokens ──────────────────────────────────────
// Extracted from Linear Figma Design System file (Light + Dark sections)

export type Theme = 'dark' | 'light';

export interface ThemeTokens {
  // Backgrounds
  pageBg: string;
  sidebarBg: string;
  cardBg: string;
  // Borders
  border: string;
  borderSecondary: string;
  separator: string;
  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textTertiary: string;
  // Accent
  accent: string;
  // Interactive states
  hover: string;
  active: string;
  // Search
  searchBg: string;
  searchFocusBg: string;
  // Kbd
  kbdBg: string;
  kbdBorder: string;
  // Avatar
  avatarBg: string;
  // Semantic status colors
  success: string;
  error: string;
  info: string;
  warning: string;
  // Logo text stays white on blue
}

export const themes: Record<Theme, ThemeTokens> = {
  dark: {
    pageBg: '#090909',
    sidebarBg: '#0f1011',
    cardBg: '#191a22',
    border: '#25262b',
    borderSecondary: '#25262b',
    separator: '#25262b',
    textPrimary: '#e2e3e5',
    textSecondary: '#96979a',
    textMuted: '#5e5e5f',
    textTertiary: '#5e5e5f',
    accent: '#5c84fe',
    hover: '#151619',
    active: '#121314',
    searchBg: '#151619',
    searchFocusBg: '#1a1c1f',
    kbdBg: '#25262b',
    kbdBorder: '#25262b',
    avatarBg: 'rgba(92,132,254,0.2)',
    success: '#34d399',
    error: '#ef4444',
    info: '#3b82f6',
    warning: '#fbbf24',
  },
  light: {
    pageBg: '#fbfbfb',
    sidebarBg: '#f3f3f3',
    cardBg: '#ffffff',
    border: '#e0e0e2',
    borderSecondary: '#dedee0',
    separator: '#dedee0',
    textPrimary: '#2d2d2e',
    textSecondary: '#5e5e5f',
    textMuted: '#959699',
    textTertiary: '#575859',
    accent: '#5e6ad2',
    hover: '#ececec',
    active: '#e8e8ea',
    searchBg: '#ececec',
    searchFocusBg: '#e8e8ea',
    kbdBg: '#e0e0e2',
    kbdBorder: '#dedee0',
    avatarBg: 'rgba(94,106,210,0.15)',
    success: '#22c55e',
    error: '#ef4444',
    info: '#3b82f6',
    warning: '#f59e0b',
  },
};
