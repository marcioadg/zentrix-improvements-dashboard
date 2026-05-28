import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, LayoutDashboard, CheckSquare, Target, BarChart3, AlertCircle,
  Video, Users, Network, HeartPulse, Compass, Sparkles, GraduationCap,
  Command, Sun, Moon, Plus, Circle, TrendingUp, TrendingDown, Minus,
} from 'lucide-react';
import { themes, Theme } from './linearTheme';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', shortcut: 'G D', route: '/prototype/dashboard-v7' },
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

const MY_TASKS = [
  { title: 'Update Q1 pricing strategy', status: 'todo' as const, due: 'Mar 22', team: 'Sales' },
  { title: 'Prepare board presentation', status: 'todo' as const, due: 'Mar 25', team: 'Operations' },
  { title: 'Review hiring pipeline', status: 'todo' as const, due: 'Mar 21', team: 'Engineering' },
  { title: 'Launch customer onboarding v2', status: 'todo' as const, due: 'Mar 28', team: 'Customer Success' },
  { title: 'Complete compliance audit', status: 'done' as const, due: 'Mar 18', team: 'Operations' },
];

const MY_GOALS = [
  { title: 'Increase MRR to $500K', progress: 57, status: 'on_track' as const, target: 'Jun 30', current: '$423K', goalTarget: '$500K' },
  { title: 'Reduce churn below 3%', progress: 72, status: 'off_track' as const, target: 'Mar 31', current: '3.2%', goalTarget: '<3%' },
  { title: 'Launch enterprise tier', progress: 35, status: 'on_track' as const, target: 'Apr 30', current: '35%', goalTarget: '100%' },
  { title: 'Hire 5 senior engineers', progress: 40, status: 'off_track' as const, target: 'Mar 31', current: '2/5', goalTarget: '5/5' },
  { title: 'Achieve SOC2 compliance', progress: 88, status: 'complete' as const, target: 'Mar 31', current: '88%', goalTarget: '100%' },
];

const MY_METRICS = [
  { name: 'Revenue', value: '$423K', target: '$500K', trend: 'up' as const, delta: '+12%' },
  { name: 'NPS Score', value: '72', target: '75', trend: 'up' as const, delta: '+4' },
  { name: 'Churn Rate', value: '3.2%', target: '<3%', trend: 'flat' as const, delta: '0%' },
  { name: 'MAU', value: '12,847', target: '15,000', trend: 'up' as const, delta: '+8%' },
  { name: 'Resolution Rate', value: '94%', target: '95%', trend: 'up' as const, delta: '+2%' },
];

const DashboardV7Split: React.FC = () => {
  const navigate = useNavigate();
  const [searchFocused, setSearchFocused] = useState(false);
  const [theme, setTheme] = useState<Theme>('dark');
  const t = themes[theme];

  const overallGoalProgress = Math.round(MY_GOALS.reduce((a, g) => a + g.progress, 0) / MY_GOALS.length);

  return (
    <div className="fixed inset-0 z-[9999] flex font-['Inter',system-ui,sans-serif] text-[13px] leading-[1.5] antialiased" style={{ backgroundColor: t.pageBg, color: t.textPrimary }}>
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
            <input type="text" placeholder="Search or jump to..." className="bg-transparent border-none outline-none text-[13px] placeholder:opacity-50 w-full" style={{ color: t.textPrimary }}
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

        <div className="flex-1 flex overflow-hidden">
          {/* LEFT PANEL - Goals & Progress */}
          <div className="w-1/2 border-r overflow-y-auto p-6" style={{ borderColor: t.border }}>
            <div className="mb-6">
              <div className="text-[11px] uppercase tracking-[0.1em] font-medium mb-1" style={{ color: t.accent }}>GOALS & PROGRESS</div>
              <h2 className="text-[20px] font-semibold tracking-[-0.02em]" style={{ color: t.textPrimary }}>Q1 2026 Objectives</h2>
              <p className="text-[12px] mt-1" style={{ color: t.textMuted }}>Friday, March 20 · 87% of quarter elapsed</p>
            </div>

            {/* Overall progress ring */}
            <div className="flex items-center gap-6 mb-8 p-5 rounded-xl border" style={{ backgroundColor: t.cardBg, borderColor: t.border }}>
              <div className="relative w-[100px] h-[100px]">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none" stroke={t.border} strokeWidth="2.5" />
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none" stroke={t.accent} strokeWidth="2.5"
                    strokeDasharray={`${overallGoalProgress}, 100`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[22px] font-bold" style={{ color: t.textPrimary }}>{overallGoalProgress}%</span>
                  <span className="text-[9px]" style={{ color: t.textMuted }}>overall</span>
                </div>
              </div>
              <div className="flex-1">
                <div className="text-[13px] font-medium mb-2" style={{ color: t.textPrimary }}>Goal Completion</div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-[11px]">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span style={{ color: t.textSecondary }}>On Track</span>
                    <span className="font-mono ml-auto" style={{ color: t.textPrimary }}>{MY_GOALS.filter(g => g.status === 'on_track').length}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <div className="w-2 h-2 rounded-full bg-destructive" />
                    <span style={{ color: t.textSecondary }}>Off Track</span>
                    <span className="font-mono ml-auto" style={{ color: t.textPrimary }}>{MY_GOALS.filter(g => g.status === 'off_track').length}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span style={{ color: t.textSecondary }}>Complete</span>
                    <span className="font-mono ml-auto" style={{ color: t.textPrimary }}>{MY_GOALS.filter(g => g.status === 'complete').length}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Individual goals */}
            <div className="space-y-3">
              {MY_GOALS.map(goal => (
                <div key={goal.title} className="rounded-xl p-4 border cursor-pointer transition-colors"
                  style={{ backgroundColor: t.cardBg, borderColor: t.border }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = t.accent}
                  onMouseLeave={e => e.currentTarget.style.borderColor = t.border}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`w-2 h-2 rounded-full ${goal.status === 'off_track' ? 'bg-destructive' : goal.status === 'complete' ? 'bg-primary' : 'bg-emerald-500'}`} />
                    <span className="text-[13px] font-medium flex-1" style={{ color: t.textPrimary }}>{goal.title}</span>
                    <span className="text-[10px] font-mono" style={{ color: t.textMuted }}>Due {goal.target}</span>
                  </div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: t.border }}>
                      <div className="h-full rounded-full transition-all" style={{
                        width: `${goal.progress}%`,
                        backgroundColor: goal.status === 'off_track' ? t.error : goal.status === 'complete' ? t.info : t.accent,
                      }} />
                    </div>
                    <span className="text-[13px] font-bold w-10 text-right" style={{ color: t.textPrimary }}>{goal.progress}%</span>
                  </div>
                  <div className="flex items-center gap-4 text-[11px]">
                    <span style={{ color: t.textMuted }}>Current: <span style={{ color: t.textSecondary }}>{goal.current}</span></span>
                    <span style={{ color: t.textMuted }}>Target: <span style={{ color: t.textSecondary }}>{goal.goalTarget}</span></span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT PANEL - Tasks & Metrics */}
          <div className="w-1/2 overflow-y-auto p-6">
            <div className="mb-6">
              <div className="text-[11px] uppercase tracking-[0.1em] font-medium mb-1" style={{ color: t.accent }}>TASKS & METRICS</div>
              <h2 className="text-[20px] font-semibold tracking-[-0.02em]" style={{ color: t.textPrimary }}>Operational Status</h2>
              <p className="text-[12px] mt-1" style={{ color: t.textMuted }}>{MY_TASKS.filter(t => t.status === 'todo').length} tasks pending · {MY_METRICS.length} metrics tracked</p>
            </div>

            {/* Metrics grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {MY_METRICS.map(m => (
                <div key={m.name} className="rounded-xl p-4 border" style={{ backgroundColor: t.cardBg, borderColor: t.border }}>
                  <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: t.textMuted }}>{m.name}</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[22px] font-bold" style={{ color: t.textPrimary }}>{m.value}</span>
                    <span className="text-[11px]" style={{ color: m.trend === 'up' ? t.success : m.trend === 'flat' ? t.textMuted : t.error }}>
                      {m.trend === 'up' ? '↑' : m.trend === 'flat' ? '→' : '↓'} {m.delta}
                    </span>
                  </div>
                  <div className="text-[10px] mt-0.5" style={{ color: t.textMuted }}>Target: {m.target}</div>
                </div>
              ))}
            </div>

            {/* Tasks list */}
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: t.border }}>
              <div className="flex items-center justify-between px-4 py-3 border-b" style={{ backgroundColor: t.cardBg, borderColor: t.border }}>
                <span className="text-[13px] font-semibold" style={{ color: t.textPrimary }}>Active Tasks</span>
                <button className="text-[11px] px-2 py-0.5 rounded-md" style={{ color: t.accent, backgroundColor: `${t.accent}15` }}>+ Add</button>
              </div>
              {MY_TASKS.map((task, i) => (
                <div key={task.title} className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0 transition-colors cursor-pointer"
                  style={{ borderColor: t.border }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = t.hover}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <div className={`w-[18px] h-[18px] rounded-md border-2 flex items-center justify-center flex-shrink-0 ${task.status === 'done' ? 'bg-emerald-500 border-emerald-500' : ''}`}
                    style={task.status !== 'done' ? { borderColor: t.textMuted } : undefined}>
                    {task.status === 'done' && <CheckSquare size={11} className="text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-[12px] ${task.status === 'done' ? 'line-through' : ''}`} style={{ color: task.status === 'done' ? t.textMuted : t.textPrimary }}>{task.title}</div>
                    <div className="text-[10px]" style={{ color: t.textMuted }}>{task.team} · Due {task.due}</div>
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

export default DashboardV7Split;
