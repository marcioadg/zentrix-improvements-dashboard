// ─── Comprehensive Design System Theme Tokens ─────────────────────────────
// Extracted from Figma file CYCwgjdJDeTKV0BOqh2xk8 (Comprehensive Design System)
// Light-first design system: warm, clean, professional/enterprise aesthetic

export type CompTheme = 'light' | 'dark';

export interface CompThemeTokens {
  // Backgrounds
  pageBg: string;
  sidebarBg: string;
  sidebarBorder: string;
  cardBg: string;
  surfaceSecondary: string;
  surfaceTertiary: string;
  inputBg: string;
  // Borders
  border: string;
  borderDarker: string;
  divider: string;
  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textDisabled: string;
  // Accent (blue)
  accent: string;
  accentDark: string;
  accentDarker: string;
  accentLight: string;
  accentLighter: string;
  accentBg: string;
  // Status: success
  successDark: string;
  success: string;
  successLight: string;
  successLighter: string;
  // Status: error
  errorDark: string;
  error: string;
  errorLight: string;
  errorLighter: string;
  // Status: warning
  warningDark: string;
  warning: string;
  warningLight: string;
  // Interactive
  hover: string;
  active: string;
  // Avatar
  avatarBg: string;
  // Search
  searchBg: string;
  searchFocusBg: string;
  // Kbd
  kbdBg: string;
  kbdBorder: string;
}

export const compThemes: Record<CompTheme, CompThemeTokens> = {
  light: {
    pageBg: '#f7f7f7',
    sidebarBg: '#ffffff',
    sidebarBorder: '#e0e2e6',
    cardBg: '#ffffff',
    surfaceSecondary: '#f4f5f6',
    surfaceTertiary: '#eeeff1',
    inputBg: '#f0f6ff',
    border: '#e0e2e6',
    borderDarker: '#d4d8dd',
    divider: '#eeeff1',
    textPrimary: '#3a3e44',
    textSecondary: '#616469',
    textMuted: '#8f9297',
    textDisabled: '#bec1c6',
    accent: '#4483e9',
    accentDark: '#1c57b6',
    accentDarker: '#143263',
    accentLight: '#8db5f5',
    accentLighter: '#d5e4fd',
    accentBg: '#f0f6ff',
    successDark: '#266d20',
    success: '#429a3a',
    successLight: '#7ec578',
    successLighter: '#ace2a7',
    errorDark: '#9d1b1d',
    error: '#c9383a',
    errorLight: '#f06769',
    errorLighter: '#f59b9c',
    warningDark: '#d2a61d',
    warning: '#eeba1d',
    warningLight: '#f6d675',
    hover: '#f4f5f6',
    active: '#eeeff1',
    avatarBg: '#d5e4fd',
    searchBg: '#f4f5f6',
    searchFocusBg: '#f0f6ff',
    kbdBg: '#eeeff1',
    kbdBorder: '#e0e2e6',
  },
  dark: {
    pageBg: '#1a1c20',
    sidebarBg: '#1e2025',
    sidebarBorder: '#3a3e44',
    cardBg: '#24272c',
    surfaceSecondary: '#2e3138',
    surfaceTertiary: '#33363d',
    inputBg: '#2e3138',
    border: '#3a3e44',
    borderDarker: '#4a4e55',
    divider: '#2e3138',
    textPrimary: '#e0e2e6',
    textSecondary: '#8f9297',
    textMuted: '#616469',
    textDisabled: '#4a4e55',
    accent: '#4483e9',
    accentDark: '#6a9ef0',
    accentDarker: '#8db5f5',
    accentLight: '#3a6cc4',
    accentLighter: '#1c57b6',
    accentBg: 'rgba(68,131,233,0.12)',
    successDark: '#7ec578',
    success: '#429a3a',
    successLight: '#266d20',
    successLighter: 'rgba(66,154,58,0.15)',
    errorDark: '#f06769',
    error: '#c9383a',
    errorLight: '#9d1b1d',
    errorLighter: 'rgba(201,56,58,0.15)',
    warningDark: '#f6d675',
    warning: '#eeba1d',
    warningLight: '#d2a61d',
    hover: '#2e3138',
    active: '#33363d',
    avatarBg: 'rgba(68,131,233,0.2)',
    searchBg: '#24272c',
    searchFocusBg: '#2e3138',
    kbdBg: '#2e3138',
    kbdBorder: '#3a3e44',
  },
};
