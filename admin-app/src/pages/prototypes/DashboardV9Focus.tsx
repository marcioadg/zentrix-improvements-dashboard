import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, LayoutDashboard, CheckSquare, Target, BarChart3, AlertCircle,
  Video, Users, Network, HeartPulse, Compass, Sparkles, GraduationCap,
  Command, Sun, Moon, Plus, Clock, ArrowRight, ChevronRight, Zap,
} from 'lucide-react';
import { themes, Theme } from './linearTheme';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', shortcut: 'G D', route: '/prototype/dashboard-v9' },
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
  { title: 'Update Q1 pricing strategy', status: 'todo' as const, due: 'Mar 22', team: 'Sales', description: 'Finalize enterprise pricing tiers and prepare competitive analysis for the board.' },
  { title: 'Prepare board presentation', status: 'todo' as const, due: 'Mar 25', team: 'Operations', description: 'Q1 results deck with revenue, hiring, and product milestones.' },
  { title: 'Review hiring pipeline', status: 'todo' as const, due: 'Mar 21', team: 'Engineering', description: 'Evaluate 12 candidates for 3 senior engineering positions.' },
  { title: 'Launch customer onboarding v2', status: 'todo' as const, due: 'Mar 28', team: 'Customer Success', description: 'Deploy new guided onboarding flow for enterprise customers.' },
  { title: 'Complete compliance audit', status: 'done' as const, due: 'Mar 18', team: 'Operations', description: 'SOC2 Type II compliance audit — passed with 88% score.' },
];

const MY_GOALS = [
  { title: 'Increase MRR to $500K', progress: 57, status: 'on_track' as const },
  { title: 'Reduce churn below 3%', progress: 72, status: 'off_track' as const },
  { title: 'Launch enterprise tier', progress: 35, status: 'on_track' as const },
  { title: 'Hire 5 senior engineers', progress: 40, status: 'off_track' as const },
  { title: 'Achieve SOC2 compliance', progress: 88, status: 'complete' as const },
];

const MY_METRICS = [
  { name: 'Revenue', value: '$423K', trend: 'up' as const },
  { name: 'NPS', value: '72', trend: 'up' as const },
  { name: 'Churn', value: '3.2%', trend: 'flat' as const },
  { name: 'MAU', value: '12.8K', trend: 'up' as const },
];

const DashboardV9Focus: React.FC = () => {
  const navigate = useNavigate();
  const [searchFocused, setSearchFocused] = useState(false);
  const [theme, setTheme] = useState<Theme>('dark');
  const [focusedTask, setFocusedTask] = useState(0);
  const t = themes[theme];

  const activeTask = MY_TASKS.filter(t => t.status === 'todo')[focusedTask] || MY_TASKS[0];
  const upcomingTasks = MY_TASKS.filter(t => t.status === 'todo').filter((_, i) => i !== focusedTask);

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

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[900px] mx-auto px-6 py-8">
            {/* Minimal header */}
            <div className="text-center mb-4">
              <p className="text-[12px]" style={{ color: t.textMuted }}>Friday, March 20, 2026</p>
            </div>

            {/* Focus Mode: Active Task - Center Stage */}
            <div className="flex flex-col items-center mb-10">
              <div className="flex items-center gap-2 mb-4">
                <Zap size={14} style={{ color: t.accent }} />
                <span className="text-[11px] uppercase tracking-[0.15em] font-bold" style={{ color: t.accent }}>CURRENT FOCUS</span>
              </div>

              <div className="w-full max-w-[640px] rounded-2xl p-8 border-2 relative" style={{ backgroundColor: t.cardBg, borderColor: t.accent }}>
                <div className="absolute -top-px left-0 right-0 h-1 rounded-t-2xl" style={{ background: `linear-gradient(90deg, ${t.accent}, ${t.info}, ${t.accent})` }} />

                <div className="flex items-center gap-3 mb-4">
                  <span className="text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider" style={{ backgroundColor: `${t.accent}15`, color: t.accent }}>{activeTask.team}</span>
                  <div className="flex-1" />
                  <Clock size={13} style={{ color: t.textMuted }} />
                  <span className="text-[12px] font-mono" style={{ color: t.textMuted }}>Due {activeTask.due}</span>
                </div>

                <h2 className="text-[24px] font-bold tracking-[-0.03em] mb-3" style={{ color: t.textPrimary }}>{activeTask.title}</h2>
                <p className="text-[14px] leading-relaxed mb-6" style={{ color: t.textSecondary }}>{activeTask.description}</p>

                <div className="flex items-center gap-3">
                  <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-medium text-white" style={{ backgroundColor: t.accent }}>
                    <CheckSquare size={14} /> Mark Complete
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-medium border" style={{ borderColor: t.border, color: t.textSecondary }}
                    onClick={() => setFocusedTask((focusedTask + 1) % MY_TASKS.filter(t => t.status === 'todo').length)}>
                    Skip <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Peripherals: 3-column layout around the focus */}
            <div className="grid grid-cols-3 gap-4">
              {/* Up Next */}
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: t.border }}>
                <div className="px-4 py-2.5 border-b" style={{ backgroundColor: t.cardBg, borderColor: t.border }}>
                  <span className="text-[11px] uppercase tracking-wider font-bold" style={{ color: t.textMuted }}>Up Next</span>
                </div>
                {upcomingTasks.map((task, i) => (
                  <div key={task.title} className="flex items-center gap-2 px-4 py-2.5 border-b last:border-b-0 transition-colors cursor-pointer" style={{ borderColor: t.border }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = t.hover} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    onClick={() => {
                      const todoTasks = MY_TASKS.filter(t => t.status === 'todo');
                      const idx = todoTasks.indexOf(task);
                      if (idx >= 0) setFocusedTask(idx);
                    }}>
                    <span className="text-[11px] font-mono w-5" style={{ color: t.textMuted }}>#{i + 2}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] truncate" style={{ color: t.textPrimary }}>{task.title}</div>
                      <div className="text-[10px]" style={{ color: t.textMuted }}>{task.team} · {task.due}</div>
                    </div>
                    <ChevronRight size={12} style={{ color: t.textMuted }} />
                  </div>
                ))}
                {MY_TASKS.filter(t => t.status === 'done').map(task => (
                  <div key={task.title} className="flex items-center gap-2 px-4 py-2.5 border-b last:border-b-0" style={{ borderColor: t.border }}>
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-[12px] line-through truncate" style={{ color: t.textMuted }}>{task.title}</span>
                  </div>
                ))}
              </div>

              {/* Goals */}
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: t.border }}>
                <div className="px-4 py-2.5 border-b" style={{ backgroundColor: t.cardBg, borderColor: t.border }}>
                  <span className="text-[11px] uppercase tracking-wider font-bold" style={{ color: t.textMuted }}>Goals</span>
                </div>
                {MY_GOALS.map(goal => (
                  <div key={goal.title} className="px-4 py-2.5 border-b last:border-b-0" style={{ borderColor: t.border }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[12px] truncate" style={{ color: t.textPrimary }}>{goal.title}</span>
                      <span className="text-[10px] font-mono ml-1" style={{
                        color: goal.status === 'off_track' ? t.error : goal.status === 'complete' ? t.info : t.success
                      }}>{goal.progress}%</span>
                    </div>
                    <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: t.border }}>
                      <div className="h-full rounded-full" style={{
                        width: `${goal.progress}%`,
                        backgroundColor: goal.status === 'off_track' ? t.error : goal.status === 'complete' ? t.info : t.accent,
                      }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Metrics */}
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: t.border }}>
                <div className="px-4 py-2.5 border-b" style={{ backgroundColor: t.cardBg, borderColor: t.border }}>
                  <span className="text-[11px] uppercase tracking-wider font-bold" style={{ color: t.textMuted }}>Quick Metrics</span>
                </div>
                {MY_METRICS.map(m => (
                  <div key={m.name} className="flex items-center justify-between px-4 py-3 border-b last:border-b-0" style={{ borderColor: t.border }}>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider" style={{ color: t.textMuted }}>{m.name}</div>
                      <div className="text-[18px] font-bold" style={{ color: t.textPrimary }}>{m.value}</div>
                    </div>
                    <span className="text-[11px]" style={{ color: m.trend === 'up' ? t.success : t.textMuted }}>
                      {m.trend === 'up' ? '↑ trending up' : m.trend === 'flat' ? '→ flat' : '↓ down'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardV9Focus;
