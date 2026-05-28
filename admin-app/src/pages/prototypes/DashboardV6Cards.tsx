import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, LayoutDashboard, CheckSquare, Target, BarChart3, AlertCircle,
  Video, Users, Network, HeartPulse, Compass, Sparkles, GraduationCap,
  Command, Sun, Moon, Plus, MoreHorizontal, TrendingUp, TrendingDown, Minus,
} from 'lucide-react';
import { themes, Theme } from './linearTheme';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', shortcut: 'G D', route: '/prototype/dashboard-v6' },
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
  { title: 'Update Q1 pricing strategy', status: 'todo' as const, due: 'Mar 22', team: 'Sales', emoji: '💰' },
  { title: 'Prepare board presentation', status: 'todo' as const, due: 'Mar 25', team: 'Operations', emoji: '📊' },
  { title: 'Review hiring pipeline', status: 'todo' as const, due: 'Mar 21', team: 'Engineering', emoji: '👥' },
  { title: 'Launch customer onboarding v2', status: 'todo' as const, due: 'Mar 28', team: 'Customer Success', emoji: '🚀' },
  { title: 'Complete compliance audit', status: 'done' as const, due: 'Mar 18', team: 'Operations', emoji: '✅' },
];

const MY_GOALS = [
  { title: 'Increase MRR to $500K', progress: 57, status: 'on_track' as const, emoji: '📈' },
  { title: 'Reduce churn below 3%', progress: 72, status: 'off_track' as const, emoji: '🔄' },
  { title: 'Launch enterprise tier', progress: 35, status: 'on_track' as const, emoji: '🏢' },
  { title: 'Hire 5 senior engineers', progress: 40, status: 'off_track' as const, emoji: '🧑‍💻' },
  { title: 'Achieve SOC2 compliance', progress: 88, status: 'complete' as const, emoji: '🛡️' },
];

const MY_METRICS = [
  { name: 'Revenue', value: '$423K', target: '$500K', trend: 'up' as const, delta: '+12%', emoji: '💵' },
  { name: 'NPS Score', value: '72', target: '75', trend: 'up' as const, delta: '+4', emoji: '😊' },
  { name: 'Churn Rate', value: '3.2%', target: '<3%', trend: 'flat' as const, delta: '0%', emoji: '📉' },
  { name: 'Monthly Active Users', value: '12,847', target: '15,000', trend: 'up' as const, delta: '+8%', emoji: '👤' },
  { name: 'Support Resolution', value: '94%', target: '95%', trend: 'up' as const, delta: '+2%', emoji: '🎯' },
];

const DashboardV6Cards: React.FC = () => {
  const navigate = useNavigate();
  const [searchFocused, setSearchFocused] = useState(false);
  const [theme, setTheme] = useState<Theme>('dark');
  const t = themes[theme];

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

        <div className="flex-1 overflow-y-auto" style={{ backgroundColor: theme === 'dark' ? '#0a0a0c' : '#f5f5f7' }}>
          <div className="max-w-[960px] mx-auto px-8 py-8">
            <div className="mb-8">
              <h1 className="text-[24px] font-semibold tracking-[-0.03em] mb-1" style={{ color: t.textPrimary }}>Good afternoon, Sarah ✨</h1>
              <p className="text-[14px]" style={{ color: t.textMuted }}>Here&apos;s what&apos;s happening across your workspace</p>
            </div>

            {/* Metric cards - Notion style with whitespace */}
            <div className="grid grid-cols-3 gap-5 mb-8">
              {MY_METRICS.slice(0, 3).map(m => (
                <div key={m.name} className="rounded-2xl p-5 transition-all cursor-pointer hover:translate-y-[-2px]"
                  style={{ backgroundColor: t.cardBg, boxShadow: theme === 'dark' ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.06)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[20px]">{m.emoji}</span>
                    <MoreHorizontal size={14} style={{ color: t.textMuted }} />
                  </div>
                  <div className="text-[11px] uppercase tracking-wider mb-1" style={{ color: t.textMuted }}>{m.name}</div>
                  <div className="text-[32px] font-bold tracking-[-0.03em] mb-1" style={{ color: t.textPrimary }}>{m.value}</div>
                  <div className="flex items-center gap-2">
                    {m.trend === 'up' ? <TrendingUp size={13} className="text-emerald-400" /> : m.trend === 'flat' ? <Minus size={13} style={{ color: t.textMuted }} /> : <TrendingDown size={13} className="text-red-400" />}
                    <span className="text-[12px]" style={{ color: m.trend === 'up' ? '#34d399' : t.textMuted }}>{m.delta}</span>
                    <span className="text-[11px]" style={{ color: t.textMuted }}>· target {m.target}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-5 mb-8">
              {MY_METRICS.slice(3).map(m => (
                <div key={m.name} className="rounded-2xl p-5 transition-all cursor-pointer hover:translate-y-[-2px]"
                  style={{ backgroundColor: t.cardBg, boxShadow: theme === 'dark' ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.06)' }}>
                  <div className="flex items-center gap-3">
                    <span className="text-[20px]">{m.emoji}</span>
                    <div className="flex-1">
                      <div className="text-[11px] uppercase tracking-wider" style={{ color: t.textMuted }}>{m.name}</div>
                      <div className="text-[24px] font-bold tracking-[-0.02em]" style={{ color: t.textPrimary }}>{m.value}</div>
                    </div>
                    <div className="text-right">
                      <span className="text-[12px] font-medium" style={{ color: '#34d399' }}>{m.delta}</span>
                      <div className="text-[10px]" style={{ color: t.textMuted }}>target {m.target}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Tasks section */}
            <div className="rounded-2xl p-6 mb-5" style={{ backgroundColor: t.cardBg, boxShadow: theme === 'dark' ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[15px] font-semibold" style={{ color: t.textPrimary }}>📋 My Tasks</h2>
                <span className="text-[12px] px-2.5 py-1 rounded-full" style={{ backgroundColor: t.hover, color: t.textMuted }}>{MY_TASKS.filter(t => t.status === 'todo').length} open</span>
              </div>
              <div className="space-y-2">
                {MY_TASKS.map(task => (
                  <div key={task.title} className="flex items-center gap-3 p-3 rounded-xl transition-colors cursor-pointer"
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = t.hover} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <span className="text-[16px]">{task.emoji}</span>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${task.status === 'done' ? 'bg-emerald-500 border-emerald-500' : ''}`}
                      style={task.status !== 'done' ? { borderColor: t.textMuted } : undefined}>
                      {task.status === 'done' && <CheckSquare size={10} className="text-white" />}
                    </div>
                    <div className="flex-1">
                      <div className={`text-[13px] ${task.status === 'done' ? 'line-through' : ''}`} style={{ color: task.status === 'done' ? t.textMuted : t.textPrimary }}>{task.title}</div>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ backgroundColor: t.hover, color: t.textMuted }}>{task.team}</span>
                    <span className="text-[11px] font-mono" style={{ color: t.textMuted }}>{task.due}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Goals section */}
            <div className="rounded-2xl p-6" style={{ backgroundColor: t.cardBg, boxShadow: theme === 'dark' ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[15px] font-semibold" style={{ color: t.textPrimary }}>🎯 Goals</h2>
                <span className="text-[12px]" style={{ color: t.textMuted }}>Q1 2026</span>
              </div>
              <div className="space-y-4">
                {MY_GOALS.map(goal => (
                  <div key={goal.title} className="flex items-center gap-4 p-3 rounded-xl transition-colors cursor-pointer"
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = t.hover} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <span className="text-[18px]">{goal.emoji}</span>
                    <div className="flex-1">
                      <div className="text-[13px] mb-1.5" style={{ color: t.textPrimary }}>{goal.title}</div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: t.border }}>
                          <div className="h-full rounded-full transition-all" style={{
                            width: `${goal.progress}%`,
                            backgroundColor: goal.status === 'off_track' ? '#ef4444' : goal.status === 'complete' ? '#3b82f6' : t.accent,
                          }} />
                        </div>
                        <span className="text-[12px] font-semibold w-10 text-right" style={{ color: t.textPrimary }}>{goal.progress}%</span>
                      </div>
                    </div>
                    <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${
                      goal.status === 'off_track' ? 'bg-destructive/10 text-red-400' :
                      goal.status === 'complete' ? 'bg-primary/10 text-blue-400' :
                      'bg-emerald-500/10 text-emerald-400'
                    }`}>{goal.status.replace('_', ' ')}</span>
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

export default DashboardV6Cards;
