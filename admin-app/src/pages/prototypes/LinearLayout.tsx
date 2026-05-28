// Shared Linear prototype layout: sidebar + top bar + content area
// Extracted to avoid duplicating 100+ lines of layout code in each page

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  LayoutDashboard,
  CheckSquare,
  Target,
  BarChart3,
  AlertCircle,
  Video,
  Users,
  Network,
  HeartPulse,
  Compass,
  Sparkles,
  GraduationCap,
  Command,
  Sun,
  Moon,
} from 'lucide-react';
import { themes, Theme } from './linearTheme';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', shortcut: 'G D', route: '/prototype/linear-dashboard' },
  { icon: BarChart3, label: 'Metrics', shortcut: 'G M', route: '/prototype/linear-metrics' },
  { icon: CheckSquare, label: 'Tasks', shortcut: 'G T', route: '/prototype/linear-tasks' },
  { icon: Target, label: 'Goals', shortcut: 'G G', route: '/prototype/linear-goals' },
  { icon: AlertCircle, label: 'Issues', shortcut: 'G I', route: '/prototype/linear-issues' },
  { icon: Video, label: 'Meetings', shortcut: 'G E', route: '/prototype/linear-meetings' },
  { icon: Users, label: 'People', shortcut: 'G P', route: '/prototype/linear-people' },
  { icon: Network, label: 'Org Chart', shortcut: 'G O', route: '/prototype/linear-org-chart' },
  { icon: HeartPulse, label: 'Org Health', shortcut: 'G H', route: '/prototype/linear-org-health' },
  { icon: Compass, label: 'Strategy', shortcut: 'G S', route: '/prototype/linear-strategy' },
  { icon: Sparkles, label: 'Zentrix AI', shortcut: 'G A', route: '/prototype/linear-zentrix-ai' },
  { icon: GraduationCap, label: 'Academy', shortcut: 'G C', route: '/prototype/linear-academy' },
];

interface LinearLayoutProps {
  activeLabel: string;
  searchPlaceholder?: string;
  headerActions?: React.ReactNode;
  children: (props: { t: typeof themes.dark; theme: Theme }) => React.ReactNode;
  maxWidth?: string;
}

export const LinearLayout: React.FC<LinearLayoutProps> = ({
  activeLabel,
  searchPlaceholder = 'Search...',
  headerActions,
  children,
  maxWidth = '960px',
}) => {
  const navigate = useNavigate();
  const [searchFocused, setSearchFocused] = useState(false);
  const [theme, setTheme] = useState<Theme>(() =>
    (localStorage.getItem('linear-prototype-theme') as Theme) || 'dark'
  );
  const t = themes[theme];

  return (
    <div
      className="fixed inset-0 z-[9999] flex font-['Inter',system-ui,sans-serif] text-[13px] leading-[1.5] antialiased"
      style={{ backgroundColor: t.pageBg, color: t.textPrimary }}
    >
      {/* ── Sidebar ── */}
      <aside className="w-[220px] flex-shrink-0 flex flex-col border-r" style={{ borderColor: t.border, backgroundColor: t.sidebarBg }}>
        <div className="flex items-center gap-2 px-4 h-[52px] border-b" style={{ borderColor: t.border }}>
          <div className="w-5 h-5 rounded-[4px] flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: t.accent }}>Z</div>
          <span className="text-[13px] font-semibold tracking-[-0.01em]" style={{ color: t.textPrimary }}>Zentrix OS</span>
        </div>
        <nav className="flex-1 py-2 px-2 space-y-[2px] overflow-y-auto">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = item.label === activeLabel;
            return (
              <button
                key={item.label}
                onClick={() => navigate(item.route)}
                className="w-full flex items-center gap-2.5 px-2.5 py-[4px] rounded-[4px] text-[13px] font-medium transition-colors duration-75 group"
                style={isActive ? { backgroundColor: t.active, color: t.textPrimary } : { color: t.textSecondary }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.backgroundColor = t.hover; e.currentTarget.style.color = t.textPrimary; } }}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = t.textSecondary; } }}
              >
                <Icon size={15} strokeWidth={1.5} style={isActive ? { color: t.accent } : { color: t.textMuted }} />
                <span className="flex-1 text-left">{item.label}</span>
                <span className="text-[10px] font-mono opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: t.textMuted }}>{item.shortcut}</span>
              </button>
            );
          })}
        </nav>
        <div className="px-3 py-3 border-t" style={{ borderColor: t.border }}>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px]" style={{ backgroundColor: t.avatarBg, color: t.accent }}>MG</div>
            <span className="text-[12px]" style={{ color: t.textSecondary }}>Marcio Gonçalves</span>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: t.pageBg }}>
        {/* ── Top bar ── */}
        <header className="flex items-center h-[52px] px-5 border-b gap-3 flex-shrink-0" style={{ borderColor: t.border }}>
          <div
            className="flex items-center gap-2 flex-1 max-w-[480px] px-3 py-[6px] rounded-[5px] transition-colors"
            style={{
              backgroundColor: searchFocused ? t.searchFocusBg : t.searchBg,
              ...(searchFocused ? { boxShadow: `0 0 0 1px ${t.accent}40` } : {}),
            }}
          >
            <Search size={14} style={{ color: t.textMuted }} />
            <input
              type="text"
              placeholder={searchPlaceholder}
              className="bg-transparent border-none outline-none text-[13px] placeholder:text-[var(--placeholder-color)] w-full"
              style={{ color: t.textPrimary, '--placeholder-color': t.textMuted } as React.CSSProperties}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
            <kbd className="text-[10px] rounded-[2px] px-1.5 py-0.5 font-mono border" style={{ color: t.textMuted, backgroundColor: t.kbdBg, borderColor: t.kbdBorder }}>
              <Command size={9} className="inline mr-0.5 -mt-px" />K
            </kbd>
          </div>
          <div className="flex-1" />
          <button
            onClick={() => {
              const newTheme = theme === 'dark' ? 'light' : 'dark';
              localStorage.setItem('linear-prototype-theme', newTheme);
              setTheme(newTheme);
            }}
            className="flex items-center justify-center w-8 h-8 rounded-[4px] transition-colors"
            style={{ color: t.textSecondary }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = t.hover)}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          {headerActions}
        </header>

        {/* ── Content area ── */}
        <div className="flex-1 overflow-y-auto">
          <div style={{ maxWidth }} className="mx-auto px-6 py-6">
            {children({ t, theme })}
          </div>
        </div>
      </main>
    </div>
  );
};

// Loading skeleton
export const LoadingSkeleton: React.FC<{ t: typeof themes.dark; rows?: number }> = ({ t, rows = 5 }) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="h-10 rounded-[6px] animate-pulse" style={{ backgroundColor: t.hover }} />
    ))}
  </div>
);

// Empty state
export const EmptyState: React.FC<{ t: typeof themes.dark; message: string }> = ({ t, message }) => (
  <div className="flex items-center justify-center py-16">
    <p className="text-[13px]" style={{ color: t.textMuted }}>{message}</p>
  </div>
);

// Footer hint
export const FooterHint: React.FC<{ t: typeof themes.dark }> = ({ t }) => (
  <div className="flex items-center justify-center gap-3 mt-6 py-4 text-[11px]" style={{ color: t.textMuted }}>
    <span className="flex items-center gap-1">
      <kbd className="px-1 py-0.5 rounded-[2px] font-mono text-[10px] border" style={{ backgroundColor: t.hover, borderColor: t.border }}>?</kbd> Shortcuts
    </span>
    <span style={{ color: t.border }}>·</span>
    <span className="flex items-center gap-1">
      <kbd className="px-1 py-0.5 rounded-[2px] font-mono text-[10px] border" style={{ backgroundColor: t.hover, borderColor: t.border }}>
        <Command size={8} className="inline -mt-px" />K
      </kbd> Command
    </span>
  </div>
);
