import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, LayoutDashboard, CheckSquare, Target, BarChart3, AlertCircle, Video, Users, Network, HeartPulse, Compass, Sparkles, GraduationCap, ChevronRight, ChevronDown, Plus, Command, Circle, Sun, Moon,
} from 'lucide-react';
import { themes, Theme } from './linearTheme';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', shortcut: 'G D', route: '/prototype/linear-dashboard' },
  { icon: BarChart3, label: 'Metrics', shortcut: 'G M', route: '/prototype/linear-metrics' },
  { icon: CheckSquare, label: 'Tasks', shortcut: 'G T', route: '/prototype/linear-tasks' },
  { icon: Target, label: 'Goals', shortcut: 'G G', route: '/prototype/linear-goals' },
  { icon: AlertCircle, label: 'Issues', shortcut: 'G I', route: null },
  { icon: Video, label: 'Meetings', shortcut: 'G E', route: null },
  { icon: Users, label: 'People', shortcut: 'G P', route: null },
  { icon: Network, label: 'Org Chart', shortcut: 'G O', route: null },
  { icon: HeartPulse, label: 'Org Health', shortcut: 'G H', route: null },
  { icon: Compass, label: 'Strategy', shortcut: 'G S', route: null },
  { icon: Sparkles, label: 'Zentrix AI', shortcut: 'G A', route: null },
  { icon: GraduationCap, label: 'Academy', shortcut: 'G C', route: null },
];

const MY_TASKS = [
  { title: 'Update Q1 pricing strategy', status: 'todo' as const, due: 'Mar 22', team: 'Sales', type: 'personal' },
  { title: 'Prepare board presentation', status: 'todo' as const, due: 'Mar 25', team: 'Operations', type: 'team' },
  { title: 'Review hiring pipeline', status: 'todo' as const, due: 'Mar 21', team: 'Engineering', type: 'personal' },
  { title: 'Launch customer onboarding v2', status: 'todo' as const, due: 'Mar 28', team: 'Customer Success', type: 'team' },
  { title: 'Complete compliance audit', status: 'done' as const, due: 'Mar 18', team: 'Operations', type: 'personal' },
];

const MY_GOALS = [
  { title: 'Increase MRR to $500K', progress: 57, status: 'on_track' as const, target: 'Jun 30' },
  { title: 'Reduce churn below 3%', progress: 72, status: 'off_track' as const, target: 'Mar 31' },
  { title: 'Launch enterprise tier', progress: 35, status: 'on_track' as const, target: 'Apr 30' },
  { title: 'Hire 5 senior engineers', progress: 40, status: 'off_track' as const, target: 'Mar 31' },
  { title: 'Achieve SOC2 compliance', progress: 88, status: 'complete' as const, target: 'Mar 31' },
];

const MY_METRICS = [
  { name: 'Revenue', value: '$423K', target: '$500K', trend: 'up' as const },
  { name: 'NPS Score', value: '72', target: '75', trend: 'up' as const },
  { name: 'Churn Rate', value: '3.2%', target: '<3%', trend: 'flat' as const },
  { name: 'Monthly Active Users', value: '12,847', target: '15,000', trend: 'up' as const },
  { name: 'Support Tickets Resolved', value: '94%', target: '95%', trend: 'up' as const },
];

const STATUS_DOT: Record<string, string> = {
  'todo': 'bg-gray-400',
  'done': 'bg-emerald-500',
  'on_track': 'bg-emerald-500',
  'off_track': 'bg-destructive',
  'complete': 'bg-primary',
  'canceled': 'bg-gray-400',
};

/* Mini sparkline bar data for each headline metric */
const SPARKLINE_DATA: Record<string, number[]> = {
  'Revenue': [40, 55, 48, 62, 58, 70, 85],
  'Monthly Active Users': [50, 45, 60, 55, 70, 65, 80],
  'NPS Score': [60, 65, 58, 72, 68, 75, 72],
  'Churn Rate': [80, 75, 70, 68, 65, 60, 64],
};

const HEADLINE_METRICS = [
  { label: 'Revenue', value: '$423K', sparkKey: 'Revenue' },
  { label: 'MAU', value: '12,847', sparkKey: 'Monthly Active Users' },
  { label: 'NPS', value: '72', sparkKey: 'NPS Score' },
  { label: 'Churn', value: '3.2%', sparkKey: 'Churn Rate' },
];

const DashboardV10Executive: React.FC = () => {
  const navigate = useNavigate();
  const [searchFocused, setSearchFocused] = useState(false);
  const [theme, setTheme] = useState<Theme>('dark');
  const t = themes[theme];

  const offTrackItems = [
    ...MY_GOALS.filter(g => g.status === 'off_track').map(g => ({ title: g.title, type: 'Goal', detail: `${g.progress}% complete, target ${g.target}` })),
    ...MY_TASKS.filter(tk => tk.status === 'todo' && tk.due === 'Mar 21').map(tk => ({ title: tk.title, type: 'Task', detail: `Due ${tk.due} - ${tk.team}` })),
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex font-['Inter',system-ui,sans-serif] text-[13px] leading-[1.5] antialiased" style={{ backgroundColor: t.pageBg, color: t.textPrimary }}>
      {/* SIDEBAR */}
      <aside className="w-[220px] flex-shrink-0 flex flex-col border-r" style={{ borderColor: t.border, backgroundColor: t.sidebarBg }}>
        <div className="flex items-center gap-2 px-4 h-[52px] border-b" style={{ borderColor: t.border }}>
          <div className="w-5 h-5 rounded-[4px] flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: t.accent }}>Z</div>
          <span className="text-[13px] font-semibold tracking-[-0.01em]" style={{ color: t.textPrimary }}>Zentrix OS</span>
        </div>
        <nav className="flex-1 py-2 px-2 space-y-[2px] overflow-y-auto">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = item.label === 'Dashboard';
            return (
              <button key={item.label} onClick={() => item.route ? navigate(item.route) : undefined}
                className="w-full flex items-center gap-2.5 px-2.5 py-[4px] rounded-[4px] text-[13px] font-medium transition-colors duration-75 group"
                style={isActive ? { backgroundColor: t.active, color: t.textPrimary } : { color: t.textSecondary }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.backgroundColor = t.hover; e.currentTarget.style.color = t.textPrimary; } }}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = t.textSecondary; } }}>
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
          <div className="flex items-center gap-2 flex-1 max-w-[480px] px-3 py-[6px] rounded-[5px] transition-colors"
            style={{ backgroundColor: searchFocused ? t.searchFocusBg : t.searchBg, ...(searchFocused ? { boxShadow: `0 0 0 1px ${t.accent}40` } : {}) }}>
            <Search size={14} style={{ color: t.textMuted }} />
            <input type="text" placeholder="Search or jump to..." className="bg-transparent border-none outline-none text-[13px] placeholder:opacity-50 w-full" style={{ color: t.textPrimary }}
              onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)} />
            <kbd className="text-[10px] rounded-[2px] px-1.5 py-0.5 font-mono border" style={{ color: t.textMuted, backgroundColor: t.kbdBg, borderColor: t.kbdBorder }}>
              <Command size={9} className="inline mr-0.5 -mt-px" />K
            </kbd>
          </div>
          <div className="flex-1" />
          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex items-center justify-center w-8 h-8 rounded-[4px] transition-colors"
            style={{ color: t.textSecondary, backgroundColor: 'transparent' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = t.hover}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <button className="flex items-center gap-1.5 text-[12px] transition-colors px-2 py-1 rounded-[4px]" style={{ color: t.textSecondary }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = t.hover; e.currentTarget.style.color = t.textPrimary; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = t.textSecondary; }}>
            <Plus size={14} /><span>New</span>
            <kbd className="text-[10px] ml-1 font-mono" style={{ color: t.textMuted }}>C</kbd>
          </button>
        </header>
        <div className="flex-1 overflow-y-auto">
          {/* EXECUTIVE DASHBOARD CONTENT */}
          <div className="max-w-[960px] mx-auto px-10 py-10">

            {/* Page title */}
            <h1 className="text-[22px] font-semibold tracking-[-0.03em] mb-8" style={{ color: t.textPrimary }}>
              Executive Summary
            </h1>

            {/* Headline numbers with sparklines */}
            <div className="grid grid-cols-4 gap-5 mb-10">
              {HEADLINE_METRICS.map(metric => {
                const bars = SPARKLINE_DATA[metric.sparkKey] || [50, 60, 55, 70, 65, 75, 80];
                return (
                  <div key={metric.label} className="rounded-[8px] border p-5" style={{ backgroundColor: t.cardBg, borderColor: t.border }}>
                    <p className="text-[11px] uppercase tracking-[0.08em] mb-1" style={{ color: t.textMuted }}>{metric.label}</p>
                    <p className="text-[32px] font-bold tracking-[-0.04em] leading-none mb-4" style={{ color: t.textPrimary }}>{metric.value}</p>
                    {/* Sparkline: small vertical bars */}
                    <div className="flex items-end gap-[3px] h-[24px]">
                      {bars.map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-[1px]"
                          style={{
                            height: `${(h / 100) * 24}px`,
                            backgroundColor: i === bars.length - 1 ? t.accent : (theme === 'dark' ? t.active : t.border),
                          }}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Strategic Overview: Goals as large progress bars */}
            <div className="mb-10">
              <h2 className="text-[15px] font-semibold tracking-[-0.01em] mb-5" style={{ color: t.textPrimary }}>Strategic Overview</h2>
              <div className="rounded-[8px] border divide-y" style={{ backgroundColor: t.cardBg, borderColor: t.border, divideColor: t.border } as React.CSSProperties}>
                {MY_GOALS.map(goal => (
                  <div key={goal.title} className="px-6 py-4 flex items-center gap-5" style={{ borderColor: t.border }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 mb-2">
                        <span className="text-[14px] font-medium" style={{ color: t.textPrimary }}>{goal.title}</span>
                        <span className="text-[11px] px-1.5 py-0.5 rounded-[3px]"
                          style={{
                            backgroundColor: goal.status === 'off_track' ? 'rgba(239,68,68,0.15)' : goal.status === 'complete' ? 'rgba(59,130,246,0.15)' : 'rgba(34,197,94,0.15)',
                            color: goal.status === 'off_track' ? t.error : goal.status === 'complete' ? t.info : t.success,
                          }}>
                          {goal.status === 'on_track' ? 'On Track' : goal.status === 'off_track' ? 'Off Track' : 'Complete'}
                        </span>
                      </div>
                      <div className="h-[6px] rounded-full overflow-hidden" style={{ backgroundColor: t.border }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${goal.progress}%`,
                            backgroundColor: goal.status === 'off_track' ? t.error : goal.status === 'complete' ? t.info : t.success,
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex-shrink-0 w-[60px] text-right">
                      <span className="text-[18px] font-bold" style={{ color: t.textPrimary }}>{goal.progress}%</span>
                    </div>
                    <div className="flex-shrink-0 w-[70px] text-right">
                      <span className="text-[12px]" style={{ color: t.textMuted }}>{goal.target}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Items: Tasks table */}
            <div className="mb-10">
              <h2 className="text-[15px] font-semibold tracking-[-0.01em] mb-5" style={{ color: t.textPrimary }}>Action Items</h2>
              <div className="rounded-[8px] border overflow-hidden" style={{ backgroundColor: t.cardBg, borderColor: t.border }}>
                {/* Table header */}
                <div className="grid grid-cols-[1fr_120px_80px_80px] px-6 py-2.5 border-b" style={{ borderColor: t.border }}>
                  <span className="text-[11px] uppercase tracking-[0.06em] font-medium" style={{ color: t.textMuted }}>Task</span>
                  <span className="text-[11px] uppercase tracking-[0.06em] font-medium" style={{ color: t.textMuted }}>Team</span>
                  <span className="text-[11px] uppercase tracking-[0.06em] font-medium" style={{ color: t.textMuted }}>Due</span>
                  <span className="text-[11px] uppercase tracking-[0.06em] font-medium text-right" style={{ color: t.textMuted }}>Status</span>
                </div>
                {/* Table rows */}
                {MY_TASKS.map(task => (
                  <div key={task.title} className="grid grid-cols-[1fr_120px_80px_80px] px-6 py-3 border-b last:border-b-0 items-center"
                    style={{ borderColor: t.border }}>
                    <span className="text-[13px]" style={{ color: t.textPrimary }}>{task.title}</span>
                    <span className="text-[12px]" style={{ color: t.textSecondary }}>{task.team}</span>
                    <span className="text-[12px] font-mono" style={{ color: t.textMuted }}>{task.due}</span>
                    <div className="flex justify-end">
                      <span className="inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-[3px]"
                        style={{
                          backgroundColor: task.status === 'done' ? 'rgba(34,197,94,0.12)' : 'rgba(156,163,175,0.12)',
                          color: task.status === 'done' ? t.success : t.textSecondary,
                        }}>
                        <div className={`w-[5px] h-[5px] rounded-full ${STATUS_DOT[task.status]}`} />
                        {task.status === 'todo' ? 'To Do' : 'Done'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Key Risks: Off-track callout */}
            <div className="mb-10">
              <h2 className="text-[15px] font-semibold tracking-[-0.01em] mb-5" style={{ color: t.textPrimary }}>Key Risks</h2>
              <div className="rounded-[8px] border-2 p-5" style={{ borderColor: 'rgba(239,68,68,0.4)', backgroundColor: theme === 'dark' ? 'rgba(239,68,68,0.06)' : 'rgba(239,68,68,0.04)' }}>
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle size={15} style={{ color: t.error }} />
                  <span className="text-[13px] font-semibold" style={{ color: t.error }}>Items Requiring Attention</span>
                </div>
                <div className="space-y-3">
                  {offTrackItems.map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-[5px] h-[5px] rounded-full bg-destructive mt-[7px] flex-shrink-0" />
                      <div>
                        <p className="text-[13px] font-medium" style={{ color: t.textPrimary }}>{item.title}</p>
                        <p className="text-[12px] mt-0.5" style={{ color: t.textMuted }}>
                          <span className="px-1 py-0.5 rounded-[2px] mr-1.5 text-[10px] uppercase tracking-wider" style={{ backgroundColor: t.border }}>{item.type}</span>
                          {item.detail}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
};
export default DashboardV10Executive;
