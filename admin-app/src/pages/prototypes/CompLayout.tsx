// Shared Comprehensive Design System layout: sidebar + top bar + content area
// Warm, clean, professional/enterprise aesthetic — light-first design

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
  Sun,
  Moon,
} from 'lucide-react';
import { compThemes, CompTheme, CompThemeTokens } from './compTheme';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', route: '/prototype/comp-dashboard' },
  { icon: BarChart3, label: 'Metrics', route: '/prototype/comp-metrics' },
  { icon: CheckSquare, label: 'Tasks', route: '/prototype/comp-tasks' },
  { icon: Target, label: 'Goals', route: '/prototype/comp-goals' },
  { icon: AlertCircle, label: 'Issues', route: '/prototype/comp-dashboard' },
  { icon: Video, label: 'Meetings', route: '/prototype/comp-dashboard' },
  { icon: Users, label: 'People', route: '/prototype/comp-dashboard' },
  { icon: Network, label: 'Org Chart', route: '/prototype/comp-dashboard' },
  { icon: HeartPulse, label: 'Org Health', route: '/prototype/comp-dashboard' },
  { icon: Compass, label: 'Strategy', route: '/prototype/comp-dashboard' },
  { icon: Sparkles, label: 'Zentrix AI', route: '/prototype/comp-dashboard' },
  { icon: GraduationCap, label: 'Academy', route: '/prototype/comp-dashboard' },
];

interface CompLayoutProps {
  activeLabel: string;
  searchPlaceholder?: string;
  headerActions?: React.ReactNode;
  children: (props: { t: CompThemeTokens; theme: CompTheme }) => React.ReactNode;
  maxWidth?: string;
}

export const CompLayout: React.FC<CompLayoutProps> = ({
  activeLabel,
  searchPlaceholder = 'Search...',
  headerActions,
  children,
  maxWidth = '1000px',
}) => {
  const navigate = useNavigate();
  const [searchFocused, setSearchFocused] = useState(false);
  const [theme, setTheme] = useState<CompTheme>(() =>
    (localStorage.getItem('comp-prototype-theme') as CompTheme) || 'light'
  );
  const t = compThemes[theme];

  return (
    <div
      className="fixed inset-0 z-[9999] flex font-['Inter',system-ui,sans-serif] text-[14px] leading-[1.5] antialiased"
      style={{ backgroundColor: t.pageBg, color: t.textPrimary }}
    >
      {/* ── Sidebar ── */}
      <aside
        className="w-[240px] flex-shrink-0 flex flex-col border-r"
        style={{ borderColor: t.sidebarBorder, backgroundColor: t.sidebarBg }}
      >
        <div className="flex items-center gap-2.5 px-5 h-[56px] border-b" style={{ borderColor: t.divider }}>
          <div
            className="w-7 h-7 rounded-[6px] flex items-center justify-center text-[12px] font-bold text-white"
            style={{ backgroundColor: t.accent }}
          >
            Z
          </div>
          <span className="text-[16px] font-semibold" style={{ color: t.textPrimary }}>Zentrix OS</span>
        </div>
        <nav className="flex-1 py-3 px-3 space-y-[2px] overflow-y-auto">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = item.label === activeLabel;
            return (
              <button
                key={item.label}
                onClick={() => navigate(item.route)}
                className="w-full flex items-center gap-3 px-3 py-[7px] rounded-[8px] text-[14px] font-normal transition-colors duration-100"
                style={
                  isActive
                    ? { backgroundColor: t.accentBg, color: t.accentDark }
                    : { color: t.textSecondary }
                }
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = t.hover;
                    e.currentTarget.style.color = t.textPrimary;
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = t.textSecondary;
                  }
                }}
              >
                <Icon
                  size={18}
                  strokeWidth={1.6}
                  style={isActive ? { color: t.accent } : { color: t.textMuted }}
                />
                <span className="flex-1 text-left">{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="px-4 py-4 border-t" style={{ borderColor: t.divider }}>
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold"
              style={{ backgroundColor: t.avatarBg, color: t.accentDark }}
            >
              MG
            </div>
            <div>
              <div className="text-[13px] font-medium" style={{ color: t.textPrimary }}>Marcio Gonçalves</div>
              <div className="text-[11px]" style={{ color: t.textMuted }}>Admin</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: t.pageBg }}>
        {/* ── Top bar ── */}
        <header
          className="flex items-center h-[56px] px-6 border-b gap-3 flex-shrink-0"
          style={{ borderColor: t.divider, backgroundColor: t.cardBg }}
        >
          <div
            className="flex items-center gap-2.5 flex-1 max-w-[480px] px-3.5 py-[7px] rounded-[8px] transition-colors border"
            style={{
              backgroundColor: searchFocused ? t.searchFocusBg : t.searchBg,
              borderColor: searchFocused ? t.accent : 'transparent',
            }}
          >
            <Search size={16} style={{ color: t.textMuted }} />
            <input
              type="text"
              placeholder={searchPlaceholder}
              className="bg-transparent border-none outline-none text-[14px] w-full"
              style={{ color: t.textPrimary }}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
            <kbd
              className="text-[11px] rounded-[4px] px-1.5 py-0.5 font-mono border"
              style={{ color: t.textMuted, backgroundColor: t.kbdBg, borderColor: t.kbdBorder }}
            >
              ⌘K
            </kbd>
          </div>
          <div className="flex-1" />
          <button
            onClick={() => {
              const newTheme = theme === 'light' ? 'dark' : 'light';
              localStorage.setItem('comp-prototype-theme', newTheme);
              setTheme(newTheme);
            }}
            className="flex items-center justify-center w-9 h-9 rounded-[8px] transition-colors border"
            style={{ color: t.textSecondary, borderColor: t.border, backgroundColor: t.cardBg }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = t.hover)}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = t.cardBg)}
            title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
          {headerActions}
        </header>

        {/* ── Content area ── */}
        <div className="flex-1 overflow-y-auto">
          <div style={{ maxWidth }} className="mx-auto px-8 py-8">
            {children({ t, theme })}
          </div>
        </div>
      </main>
    </div>
  );
};

// Loading skeleton
export const CompLoadingSkeleton: React.FC<{ t: CompThemeTokens; rows?: number }> = ({ t, rows = 5 }) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="h-12 rounded-[8px] animate-pulse" style={{ backgroundColor: t.hover }} />
    ))}
  </div>
);

// Empty state
export const CompEmptyState: React.FC<{ t: CompThemeTokens; message: string }> = ({ t, message }) => (
  <div className="flex items-center justify-center py-16">
    <p className="text-[14px]" style={{ color: t.textMuted }}>{message}</p>
  </div>
);
