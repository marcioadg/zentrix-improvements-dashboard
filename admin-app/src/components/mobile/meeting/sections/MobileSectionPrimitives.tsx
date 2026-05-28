/**
 * Shared visual primitives for mobile meeting sections (v2 design pass).
 *
 * Mobile-only — these mirror the desktop meeting sections' look in the v2
 * editorial style WITHOUT importing or modifying any desktop component, so
 * mobile changes can never affect the desktop /meeting view.
 *
 * Theme-safe: built entirely on existing Tailwind tokens (bg-card,
 * border-border, text-foreground/-muted-foreground, primary, success). No
 * new design tokens or fonts are introduced — the prototype's literal hex
 * palette maps onto these so dark mode adapts automatically.
 */
import React from 'react';
import { cn } from '@/lib/utils';

const AVATAR_COLORS = [
  '#1e2235',
  '#0e7490',
  '#7c2d92',
  '#4338ca',
  '#16a34a',
  '#b45309',
  '#be123c',
];

const initialsFor = (name?: string | null, email?: string | null): string => {
  const source = (name || '').trim();
  if (source) {
    const parts = source.split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  const e = (email || '').trim();
  return e ? e.slice(0, 2).toUpperCase() : '?';
};

const colorFor = (key: string): string => {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

interface MobileAvatarProps {
  name?: string | null;
  email?: string | null;
  /** Stable key for deterministic colour (falls back to name/email). */
  colorKey?: string;
  size?: number;
  className?: string;
}

/** Initials avatar with a deterministic colour — mirrors the prototype's avatar atoms. */
export const MobileAvatar: React.FC<MobileAvatarProps> = ({
  name,
  email,
  colorKey,
  size = 24,
  className,
}) => {
  const bg = colorFor(colorKey || name || email || '?');
  return (
    <span
      className={cn('inline-flex items-center justify-center rounded-full text-white shrink-0', className)}
      style={{
        width: size,
        height: size,
        background: bg,
        fontSize: Math.round(size * 0.4),
        fontWeight: 700,
        letterSpacing: '-0.02em',
      }}
      aria-hidden="true"
    >
      {initialsFor(name, email)}
    </span>
  );
};

/**
 * Editorial title accent — the gradient second-word treatment from the
 * prototype. Uses foreground→muted-foreground so it reads on both themes.
 */
export const SectionTitleAccent: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
    {children}
  </span>
);

/** Mono-ish uppercase eyebrow label (tabular-nums approximates the mono look). */
export const SectionEyebrow: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <div
    className={cn(
      'text-[9.5px] font-medium uppercase tracking-[0.12em] text-muted-foreground tabular-nums',
      className,
    )}
  >
    {children}
  </div>
);

interface MobileSectionShellProps {
  /** Mono eyebrow, e.g. "NOW · 5 MIN". */
  eyebrow?: React.ReactNode;
  /** Large editorial title (string or node with <SectionTitleAccent>). */
  title: React.ReactNode;
  /** Optional one-line subtitle. */
  sub?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * In-body editorial header (eyebrow + big title + subtitle) followed by the
 * section content. Rendered by every mobile section so the v2 header is
 * consistent across sections.
 */
export const MobileSectionShell: React.FC<MobileSectionShellProps> = ({
  eyebrow,
  title,
  sub,
  children,
}) => (
  <div>
    <div className="mb-5">
      {eyebrow && <SectionEyebrow className="mb-2">{eyebrow}</SectionEyebrow>}
      <h1 className="text-[26px] leading-[1.05] font-semibold tracking-[-0.028em] text-foreground">
        {title}
      </h1>
      {sub && <p className="mt-2 text-[13px] leading-[1.45] text-muted-foreground">{sub}</p>}
    </div>
    {children}
  </div>
);

interface MobileSectionCardProps {
  icon?: React.ReactNode;
  /** Tailwind classes for the icon tile (bg + text color), e.g. 'bg-primary/10 text-primary'. */
  iconClassName?: string;
  title: React.ReactNode;
  sub?: React.ReactNode;
  /** Emphasised card (stronger border). */
  accent?: boolean;
  children?: React.ReactNode;
  className?: string;
}

/** White card with an icon tile + title/sub header and arbitrary body. */
export const MobileSectionCard: React.FC<MobileSectionCardProps> = ({
  icon,
  iconClassName = 'bg-primary/10 text-primary',
  title,
  sub,
  accent = false,
  children,
  className,
}) => (
  <div
    className={cn(
      'bg-card border rounded-xl p-3.5 mb-2.5',
      accent ? 'border-foreground/25' : 'border-border',
      className,
    )}
  >
    <div className="flex items-start gap-2.5 mb-3">
      {icon && (
        <div
          className={cn(
            'w-[30px] h-[30px] rounded-lg flex items-center justify-center shrink-0',
            iconClassName,
          )}
        >
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-[13.5px] font-semibold text-foreground tracking-[-0.01em]">
          {title}
        </div>
        {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
      </div>
    </div>
    {children}
  </div>
);

/** Bulleted discussion-prompt list with a mono eyebrow. */
export const MobilePromptList: React.FC<{ items: string[]; label?: string }> = ({
  items,
  label = 'Discussion Prompts',
}) => (
  <div>
    <SectionEyebrow className="mb-2">{label}</SectionEyebrow>
    <ul className="flex flex-col gap-[7px] m-0 p-0 list-none">
      {items.map((t, i) => (
        <li
          key={i}
          className="flex gap-2 items-start text-[12.5px] leading-[1.45] text-foreground/80"
        >
          <span className="w-1 h-1 rounded-full bg-muted-foreground/50 mt-[7px] shrink-0" aria-hidden="true" />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  </div>
);
