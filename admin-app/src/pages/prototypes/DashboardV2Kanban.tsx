import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, LayoutDashboard, CheckSquare, Target, BarChart3, AlertCircle,
  Video, Users, Network, HeartPulse, Compass, Sparkles, GraduationCap,
  Command, Sun, Moon, Plus, GripVertical, Clock, Flag,
} from 'lucide-react';
import { themes, Theme } from './linearTheme';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', shortcut: 'G D', route: '/prototype/dashboard-v2' },
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

interface KanbanCard {
  title: string;
  team: string;
  due: string;
  priority: 'high' | 'medium' | 'low';
  type: 'task' | 'goal' | 'metric';
  progress?: number;
  value?: string;
}

const TODO_CARDS: KanbanCard[] = [
  { title: 'Update Q1 pricing strategy', team: 'Sales', due: 'Mar 22', priority: 'high', type: 'task' },
  { title: 'Launch enterprise tier', team: 'Product', due: 'Apr 30', priority: 'high', type: 'goal', progress: 35 },
  { title: 'Hire 5 senior engineers', team: 'Engineering', due: 'Mar 31', priority: 'medium', type: 'goal', progress: 40 },
];

const IN_PROGRESS_CARDS: KanbanCard[] = [
  { title: 'Prepare board presentation', team: 'Operations', due: 'Mar 25', priority: 'high', type: 'task' },
  { title: 'Increase MRR to $500K', team: 'Revenue', due: 'Jun 30', priority: 'high', type: 'goal', progress: 57 },
  { title: 'Reduce churn below 3%', team: 'Success', due: 'Mar 31', priority: 'high', type: 'goal', progress: 72 },
  { title: 'Review hiring pipeline', team: 'Engineering', due: 'Mar 21', priority: 'medium', type: 'task' },
];

const DONE_CARDS: KanbanCard[] = [
  { title: 'Complete compliance audit', team: 'Operations', due: 'Mar 18', priority: 'low', type: 'task' },
  { title: 'Achieve SOC2 compliance', team: 'Security', due: 'Mar 31', priority: 'high', type: 'goal', progress: 88 },
  { title: 'Support Tickets at 94%', team: 'Support', due: 'Mar 20', priority: 'low', type: 'metric', value: '94%' },
];

const MY_METRICS = [
  { name: 'Revenue', value: '$423K', target: '$500K', trend: 'up' as const },
  { name: 'NPS Score', value: '72', target: '75', trend: 'up' as const },
  { name: 'Churn Rate', value: '3.2%', target: '<3%', trend: 'flat' as const },
  { name: 'MAU', value: '12,847', target: '15,000', trend: 'up' as const },
];

const PRIORITY_COLORS = { high: '#ef4444', medium: '#f59e0b', low: '#6b7280' };

const DashboardV2Kanban: React.FC = () => {
  const navigate = useNavigate();
  const [searchFocused, setSearchFocused] = useState(false);
  const [theme, setTheme] = useState<Theme>('dark');
  const t = themes[theme];

  const columns = [
    { title: 'To Do', count: TODO_CARDS.length, cards: TODO_CARDS, color: '#6b7280' },
    { title: 'In Progress', count: IN_PROGRESS_CARDS.length, cards: IN_PROGRESS_CARDS, color: '#f59e0b' },
    { title: 'Done', count: DONE_CARDS.length, cards: DONE_CARDS, color: '#22c55e' },
  ];

  const renderCard = (card: KanbanCard) => (
    <div key={card.title} className="rounded-lg p-3 border mb-2 cursor-pointer transition-all hover:translate-y-[-1px]"
      style={{ backgroundColor: t.cardBg, borderColor: t.border, boxShadow: `0 1px 3px ${theme === 'dark' ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.08)'}` }}
      onMouseEnter={e => e.currentTarget.style.borderColor = t.accent} onMouseLeave={e => e.currentTarget.style.borderColor = t.border}>
      <div className="flex items-start gap-2 mb-2">
        <GripVertical size={12} className="mt-0.5 opacity-30" style={{ color: t.textMuted }} />
        <span className="text-[12px] font-medium flex-1" style={{ color: t.textPrimary }}>{card.title}</span>
      </div>
      {card.progress !== undefined && (
        <div className="ml-5 mb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px]" style={{ color: t.textMuted }}>Progress</span>
            <span className="text-[10px] font-mono" style={{ color: t.textSecondary }}>{card.progress}%</span>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: t.border }}>
            <div className="h-full rounded-full" style={{ width: `${card.progress}%`, backgroundColor: t.accent }} />
          </div>
        </div>
      )}
      {card.value && (
        <div className="ml-5 mb-2">
          <span className="text-[16px] font-bold" style={{ color: t.accent }}>{card.value}</span>
        </div>
      )}
      <div className="flex items-center gap-2 ml-5">
        <Flag size={10} style={{ color: PRIORITY_COLORS[card.priority] }} />
        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: t.hover, color: t.textMuted }}>{card.team}</span>
        <div className="flex-1" />
        <Clock size={10} style={{ color: t.textMuted }} />
        <span className="text-[10px] font-mono" style={{ color: t.textMuted }}>{card.due}</span>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[9999] flex font-['Inter',system-ui,sans-serif] text-[13px] leading-[1.5] antialiased" style={{ backgroundColor: t.pageBg, color: t.textPrimary }}>
      {/* Sidebar */}
      <aside className="w-[220px] flex-shrink-0 flex flex-col border-r" style={{ borderColor: t.border, backgroundColor: t.sidebarBg }}>
        <div className="flex items-center gap-2 px-4 h-[52px] border-b" style={{ borderColor: t.border }}>
          <div className="w-5 h-5 rounded-[4px] bg-[#5c84fe] flex items-center justify-center text-[10px] font-bold text-white">Z</div>
          <span className="text-[13px] font-semibold tracking-[-0.01em]" style={{ color: t.textPrimary }}>Zentrix OS</span>
        </div>
        <nav className="flex-1 py-2 px-2 space-y-[2px] overflow-y-auto">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = item.label === 'Dashboard';
            return (
              <button key={item.label} onClick={() => navigate(item.route)}
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
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px]" style={{ backgroundColor: t.avatarBg, color: t.accent }}>SK</div>
            <span className="text-[12px]" style={{ color: t.textSecondary }}>Sarah Kim</span>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: t.pageBg }}>
        <header className="flex items-center h-[52px] px-5 border-b gap-3 flex-shrink-0" style={{ borderColor: t.border }}>
          <div className="flex items-center gap-2 flex-1 max-w-[480px] px-3 py-[6px] rounded-[5px]"
            style={{ backgroundColor: searchFocused ? t.searchFocusBg : t.searchBg, ...(searchFocused ? { boxShadow: `0 0 0 1px ${t.accent}40` } : {}) }}>
            <Search size={14} style={{ color: t.textMuted }} />
            <input type="text" placeholder="Search or jump to..." className="bg-transparent border-none outline-none text-[13px] placeholder:text-[var(--placeholder-color)] w-full" style={{ color: t.textPrimary, '--placeholder-color': t.textMuted } as React.CSSProperties}
              onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)} />
            <kbd className="text-[10px] rounded-[2px] px-1.5 py-0.5 font-mono border" style={{ color: t.textMuted, backgroundColor: t.kbdBg, borderColor: t.kbdBorder }}>
              <Command size={9} className="inline mr-0.5 -mt-px" />K
            </kbd>
          </div>
          <div className="flex-1" />
          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex items-center justify-center w-8 h-8 rounded-[4px]" style={{ color: t.textSecondary }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = t.hover} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <button className="flex items-center gap-1.5 text-[12px] px-2 py-1 rounded-[4px]" style={{ color: t.textSecondary }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = t.hover} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
            <Plus size={14} /><span>New</span>
          </button>
        </header>

        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="px-6 pt-6 pb-4">
            <h1 className="text-[22px] font-semibold tracking-[-0.03em] mb-1" style={{ color: t.textPrimary }}>Kanban Board</h1>
            <p className="text-[13px]" style={{ color: t.textMuted }}>Friday, March 20, 2026 · Drag and drop to organize</p>
          </div>

          {/* Metric strip */}
          <div className="px-6 mb-4">
            <div className="flex gap-3">
              {MY_METRICS.map(m => (
                <div key={m.name} className="flex-1 rounded-lg px-4 py-2.5 border" style={{ backgroundColor: t.cardBg, borderColor: t.border }}>
                  <div className="text-[10px] uppercase tracking-wider" style={{ color: t.textMuted }}>{m.name}</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[18px] font-bold" style={{ color: t.textPrimary }}>{m.value}</span>
                    <span className="text-[10px]" style={{ color: m.trend === 'up' ? '#34d399' : t.textMuted }}>
                      {m.trend === 'up' ? '↑' : m.trend === 'flat' ? '→' : '↓'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Kanban columns */}
          <div className="flex-1 overflow-x-auto px-6 pb-6">
            <div className="flex gap-4 h-full min-w-max">
              {columns.map(col => (
                <div key={col.title} className="w-[320px] flex flex-col rounded-xl border" style={{ backgroundColor: theme === 'dark' ? '#0d0e10' : '#f7f7f8', borderColor: t.border }}>
                  <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: t.border }}>
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
                    <span className="text-[13px] font-semibold" style={{ color: t.textPrimary }}>{col.title}</span>
                    <span className="text-[11px] font-mono ml-auto px-1.5 py-0.5 rounded" style={{ backgroundColor: t.hover, color: t.textMuted }}>{col.count}</span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3">
                    {col.cards.map(renderCard)}
                    <button className="w-full py-2 text-[12px] rounded-lg border border-dashed flex items-center justify-center gap-1.5 mt-1 transition-colors"
                      style={{ borderColor: t.border, color: t.textMuted }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = t.accent; e.currentTarget.style.color = t.textSecondary; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = t.textMuted; }}>
                      <Plus size={12} /> Add card
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardV2Kanban;
