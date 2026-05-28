import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, LayoutDashboard, CheckSquare, Target, BarChart3, AlertCircle,
  Video, Users, Network, HeartPulse, Compass, Sparkles, GraduationCap,
  Command, Sun, Moon, Plus, Circle, CheckCircle2, Flag, TrendingUp, Calendar,
} from 'lucide-react';
import { themes, Theme } from './linearTheme';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', shortcut: 'G D', route: '/prototype/dashboard-v3' },
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

interface TimelineEvent {
  date: string;
  time: string;
  title: string;
  description: string;
  type: 'task' | 'goal' | 'metric' | 'milestone';
  status: 'done' | 'todo' | 'in_progress';
  meta?: string;
}

const TIMELINE_EVENTS: TimelineEvent[] = [
  { date: 'Mar 18', time: '2:00 PM', title: 'Compliance audit completed', description: 'SOC2 compliance audit passed with 88% score', type: 'task', status: 'done', meta: 'Operations' },
  { date: 'Mar 19', time: '10:00 AM', title: 'Revenue milestone: $423K MRR', description: 'Monthly recurring revenue up 12% from last month', type: 'metric', status: 'done', meta: '+$45K' },
  { date: 'Mar 19', time: '3:30 PM', title: 'NPS Score reached 72', description: 'Customer satisfaction trending upward, target: 75', type: 'metric', status: 'done', meta: 'NPS +4' },
  { date: 'Mar 20', time: '9:00 AM', title: 'Today — Dashboard Review', description: 'Current sprint review and Q1 progress assessment', type: 'milestone', status: 'in_progress', meta: 'Q1 87% elapsed' },
  { date: 'Mar 21', time: '11:00 AM', title: 'Review hiring pipeline', description: 'Evaluate 12 candidates for senior engineering roles', type: 'task', status: 'todo', meta: 'Engineering' },
  { date: 'Mar 22', time: '2:00 PM', title: 'Update Q1 pricing strategy', description: 'Finalize enterprise pricing tiers for board review', type: 'task', status: 'todo', meta: 'Sales' },
  { date: 'Mar 25', time: '10:00 AM', title: 'Board presentation', description: 'Prepare and deliver quarterly board presentation', type: 'task', status: 'todo', meta: 'Operations' },
  { date: 'Mar 28', time: '9:00 AM', title: 'Customer onboarding v2 launch', description: 'Deploy new onboarding flow for enterprise customers', type: 'task', status: 'todo', meta: 'Customer Success' },
  { date: 'Mar 31', time: '—', title: 'Q1 Goal Deadline', description: 'Reduce churn below 3% (currently 3.2%) · Hire 5 senior engineers (2/5 hired)', type: 'goal', status: 'todo', meta: '2 goals at risk' },
  { date: 'Apr 30', time: '—', title: 'Enterprise tier launch', description: 'Full enterprise feature set go-live, 35% complete', type: 'goal', status: 'todo', meta: 'Product' },
  { date: 'Jun 30', time: '—', title: '$500K MRR target', description: 'Currently at $423K (57% progress toward stretch goal)', type: 'goal', status: 'todo', meta: 'Revenue' },
];

const MY_METRICS = [
  { name: 'Revenue', value: '$423K', trend: 'up' as const },
  { name: 'NPS', value: '72', trend: 'up' as const },
  { name: 'Churn', value: '3.2%', trend: 'flat' as const },
  { name: 'MAU', value: '12.8K', trend: 'up' as const },
];

const TYPE_COLORS = {
  task: '#5c84fe',
  goal: '#f59e0b',
  metric: '#22c55e',
  milestone: '#a855f7',
};

const DashboardV3Timeline: React.FC = () => {
  const navigate = useNavigate();
  const [searchFocused, setSearchFocused] = useState(false);
  const [theme, setTheme] = useState<Theme>('dark');
  const t = themes[theme];

  const todayIdx = TIMELINE_EVENTS.findIndex(e => e.date === 'Mar 20');

  return (
    <div className="fixed inset-0 z-[9999] flex font-['Inter',system-ui,sans-serif] text-[13px] leading-[1.5] antialiased" style={{ backgroundColor: t.pageBg, color: t.textPrimary }}>
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

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[800px] mx-auto px-6 py-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-[22px] font-semibold tracking-[-0.03em] mb-1" style={{ color: t.textPrimary }}>Timeline View</h1>
                <p className="text-[13px]" style={{ color: t.textMuted }}>Q1 2026 · Events, tasks & milestones</p>
              </div>
              <div className="flex gap-2">
                {MY_METRICS.map(m => (
                  <div key={m.name} className="px-3 py-1.5 rounded-lg border text-center" style={{ backgroundColor: t.cardBg, borderColor: t.border }}>
                    <div className="text-[10px]" style={{ color: t.textMuted }}>{m.name}</div>
                    <div className="text-[14px] font-bold" style={{ color: t.textPrimary }}>{m.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline */}
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-[80px] top-0 bottom-0 w-px" style={{ backgroundColor: t.border }} />

              {TIMELINE_EVENTS.map((event, i) => {
                const isToday = i === todayIdx;
                const isPast = i < todayIdx;
                const typeColor = TYPE_COLORS[event.type];

                return (
                  <div key={i} className="relative flex gap-6 mb-1">
                    {/* Date column */}
                    <div className="w-[64px] flex-shrink-0 text-right pt-4">
                      <div className="text-[12px] font-medium" style={{ color: isToday ? t.accent : isPast ? t.textMuted : t.textSecondary }}>{event.date}</div>
                      <div className="text-[10px]" style={{ color: t.textMuted }}>{event.time}</div>
                    </div>

                    {/* Dot on timeline */}
                    <div className="flex-shrink-0 w-[32px] flex justify-center pt-4 relative z-10">
                      {event.status === 'done' ? (
                        <CheckCircle2 size={16} style={{ color: '#22c55e' }} />
                      ) : isToday ? (
                        <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center" style={{ borderColor: t.accent }}>
                          <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: t.accent }} />
                        </div>
                      ) : (
                        <Circle size={16} style={{ color: t.textMuted }} />
                      )}
                    </div>

                    {/* Content card */}
                    <div className="flex-1 pb-4">
                      <div className={`rounded-lg p-4 border transition-colors cursor-pointer ${isToday ? 'ring-1' : ''}`}
                        style={{
                          backgroundColor: t.cardBg,
                          borderColor: isToday ? t.accent : t.border,
                          ...(isToday ? { ringColor: `${t.accent}40` } : {}),
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = t.hover}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = t.cardBg}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded" style={{ backgroundColor: `${typeColor}20`, color: typeColor }}>
                            {event.type}
                          </span>
                          {event.meta && (
                            <span className="text-[10px] ml-auto" style={{ color: t.textMuted }}>{event.meta}</span>
                          )}
                        </div>
                        <div className="text-[13px] font-medium mb-1" style={{ color: isPast && !isToday ? t.textSecondary : t.textPrimary }}>
                          {event.title}
                        </div>
                        <div className="text-[11px]" style={{ color: t.textMuted }}>{event.description}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardV3Timeline;
