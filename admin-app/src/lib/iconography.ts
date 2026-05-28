/**
 * Iconography Standards System
 * Centralized configuration for consistent icon usage across the application
 */

export const ICON_SIZES = {
  xs: 'h-3 w-3',      // 12px - badges, inline text
  sm: 'h-4 w-4',      // 16px - buttons, form labels
  md: 'h-5 w-5',      // 20px - default, navigation
  lg: 'h-6 w-6',      // 24px - section headers
  xl: 'h-8 w-8',      // 32px - empty states, hero icons
  '2xl': 'h-12 w-12', // 48px - feature showcases
} as const;

export const ICON_COLORS = {
  default: 'text-muted-foreground',
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-destructive',
  muted: 'text-muted-foreground/50',
} as const;

export const ICON_SPACING = {
  before: 'mr-2',     // Icon before text
  after: 'ml-2',      // Icon after text
  tight: 'mr-1.5',    // Compact spacing
  loose: 'mr-3',      // Generous spacing
} as const;

// Standard stroke width for consistency
export const ICON_STROKE_WIDTH = 2;

// Type exports for TypeScript
export type IconSize = keyof typeof ICON_SIZES;
export type IconColor = keyof typeof ICON_COLORS;
export type IconSpacing = keyof typeof ICON_SPACING;
