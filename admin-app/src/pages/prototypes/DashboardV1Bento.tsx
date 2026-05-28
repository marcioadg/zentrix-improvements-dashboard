import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, LayoutDashboard, CheckSquare, Target, BarChart3, AlertCircle,
  Video, Users, Network, HeartPulse, Compass, Sparkles, GraduationCap,
  Command, Sun, Moon, Plus, TrendingUp, TrendingDown, Minus, ArrowUpRight,
} from 'lucide-react';
import { themes, Theme } from './linearTheme';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', shortcut: 'G D', route: '/prototype/dashboard-v1' },
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
  { title: 'Increase MRR to $500K', progress: 57, status: 'on_track' as const },
  { title: 'Reduce churn below 3%', progress: 72, status: 'off_track' as const },
  { title: 'Launch enterprise tier', progress: 35, status: 'on_track' as const },
  { title: 'Hire 5 senior engineers', progress: 40, status: 'off_track' as const },
  { title: 'Achieve SOC2 compliance', progress: 88, status: 'complete' as const },
];

const MY_METRICS = [
  { name: 'Revenue', value: '$423K', target: '$500K', trend: 'up' as const, delta: '+12%' },
  { name: 'NPS Score', value: '72', target: '75', trend: 'up' as const, delta: '+4' },
  { name: 'Churn Rate', value: '3.2%', target: '<3%', trend: 'flat' as const, delta: '0%' },
  { name: 'Monthly Active Users', value: '12,847', target: '15,000', trend: 'up' as const, delta: '+8%' },
  { name: 'Support Tickets', value: '94%', target: '95%', trend: 'up' as const, delta: '+2%' },
];

const DashboardV1Bento: React.FC = () => {
  const navigate = useNavigate();
  const [searchFocused, setSearchFocused] = useState(false);
  const [theme, setTheme] = useState<Theme>('dark');
  const t = themes[theme];

  const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'flat' }) => {
    if (trend === 'up') return <TrendingUp size={14} className="text-emerald-400" />;
    if (trend === 'down') return <TrendingDown size={14} className="text-red-400" />;
    return <Minus size={14} style={{ color: t.textMuted }} />;
  };

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

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: t.pageBg }}>
        <header className="flex items-center h-[52px] px-5 border-b gap-3 flex-shrink-0" style={{ borderColor: t.border }}>
          <div className="flex items-center gap-2 flex-1 max-w-[480px] px-3 py-[6px] rounded-[5px] transition-colors"
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
            className="flex items-center justify-center w-8 h-8 rounded-[4px] transition-colors" style={{ color: t.textSecondary }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = t.hover} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <button className="flex items-center gap-1.5 text-[12px] px-2 py-1 rounded-[4px]" style={{ color: t.textSecondary }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = t.hover; }} onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
            <Plus size={14} /><span>New</span>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[1100px] mx-auto px-6 py-6">
            <div className="mb-6">
              <h1 className="text-[22px] font-semibold tracking-[-0.03em] mb-1" style={{ color: t.textPrimary }}>Bento Dashboard</h1>
              <p className="text-[13px]" style={{ color: t.textMuted }}>Friday, March 20, 2026</p>
            </div>

            {/* Bento Grid */}
            <div className="grid grid-cols-4 grid-rows-[auto] gap-3">
              {/* Hero card - spans 2x2 */}
              <div className="col-span-2 row-span-2 rounded-xl p-6 border relative overflow-hidden" style={{ backgroundColor: t.cardBg, borderColor: t.border }}>
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10" style={{ background: `radial-gradient(circle, ${t.accent}, transparent)` }} />
                <div className="text-[11px] uppercase tracking-[0.06em] font-medium mb-1" style={{ color: t.textMuted }}>Monthly Revenue</div>
                <div className="text-[42px] font-bold tracking-[-0.04em] mb-2" style={{ color: t.textPrimary }}>$423K</div>
                <div className="flex items-center gap-2 mb-6">
                  <span className="flex items-center gap-1 text-emerald-400 text-[13px] font-medium"><TrendingUp size={14} /> +12%</span>
                  <span className="text-[12px]" style={{ color: t.textMuted }}>vs last month</span>
                </div>
                {/* Mini bar chart */}
                <div className="flex items-end gap-1.5 h-[80px]">
                  {[35, 52, 48, 65, 58, 72, 68, 85, 78, 92, 88, 95].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t-sm transition-all" style={{ height: `${h}%`, backgroundColor: i === 11 ? t.accent : `${t.accent}30` }} />
                  ))}
                </div>
                <div className="flex justify-between mt-2 text-[10px]" style={{ color: t.textMuted }}>
                  <span>Apr</span><span>Mar</span>
                </div>
              </div>

              {/* Metric cards - 2 small */}
              {MY_METRICS.slice(1, 3).map(metric => (
                <div key={metric.name} className="rounded-xl p-4 border" style={{ backgroundColor: t.cardBg, borderColor: t.border }}>
                  <div className="text-[11px] uppercase tracking-[0.06em] font-medium mb-2" style={{ color: t.textMuted }}>{metric.name}</div>
                  <div className="text-[28px] font-bold tracking-[-0.03em]" style={{ color: t.textPrimary }}>{metric.value}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <TrendIcon trend={metric.trend} />
                    <span className="text-[11px]" style={{ color: metric.trend === 'up' ? '#34d399' : metric.trend === 'flat' ? t.textMuted : '#f87171' }}>{metric.delta}</span>
                    <span className="text-[11px]" style={{ color: t.textMuted }}>target: {metric.target}</span>
                  </div>
                </div>
              ))}

              {/* More metrics */}
              {MY_METRICS.slice(3).map(metric => (
                <div key={metric.name} className="rounded-xl p-4 border" style={{ backgroundColor: t.cardBg, borderColor: t.border }}>
                  <div className="text-[11px] uppercase tracking-[0.06em] font-medium mb-2" style={{ color: t.textMuted }}>{metric.name}</div>
                  <div className="text-[28px] font-bold tracking-[-0.03em]" style={{ color: t.textPrimary }}>{metric.value}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <TrendIcon trend={metric.trend} />
                    <span className="text-[11px]" style={{ color: '#34d399' }}>{metric.delta}</span>
                  </div>
                </div>
              ))}

              {/* Tasks - spans 2 cols */}
              <div className="col-span-2 rounded-xl border overflow-hidden" style={{ backgroundColor: t.cardBg, borderColor: t.border }}>
                <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: t.border }}>
                  <span className="text-[13px] font-semibold" style={{ color: t.textPrimary }}>Active Tasks</span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full" style={{ color: t.textMuted, backgroundColor: t.hover }}>{MY_TASKS.filter(t => t.status === 'todo').length}</span>
                </div>
                {MY_TASKS.map((task, i) => (
                  <div key={task.title} className="flex items-center gap-3 px-5 py-2.5 border-b last:border-b-0 transition-colors cursor-pointer" style={{ borderColor: t.border }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = t.hover} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${task.status === 'done' ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                    <span className={`flex-1 text-[12px] ${task.status === 'done' ? 'line-through' : ''}`} style={{ color: task.status === 'done' ? t.textMuted : t.textPrimary }}>{task.title}</span>
                    <span className="text-[10px]" style={{ color: t.textMuted }}>{task.team}</span>
                    <span className="text-[10px] font-mono" style={{ color: t.textMuted }}>{task.due}</span>
                  </div>
                ))}
              </div>

              {/* Goals - spans 2 cols */}
              <div className="col-span-2 rounded-xl border overflow-hidden" style={{ backgroundColor: t.cardBg, borderColor: t.border }}>
                <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: t.border }}>
                  <span className="text-[13px] font-semibold" style={{ color: t.textPrimary }}>Goals Progress</span>
                  <span className="text-[11px]" style={{ color: t.textMuted }}>{MY_GOALS.filter(g => g.progress >= 80).length}/{MY_GOALS.length} near completion</span>
                </div>
                {MY_GOALS.map(goal => (
                  <div key={goal.title} className="px-5 py-3 border-b last:border-b-0 transition-colors cursor-pointer" style={{ borderColor: t.border }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = t.hover} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[12px]" style={{ color: t.textPrimary }}>{goal.title}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${goal.status === 'off_track' ? 'bg-destructive/10 text-red-400' : goal.status === 'complete' ? 'bg-primary/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                          {goal.status.replace('_', ' ')}
                        </span>
                        <span className="text-[11px] font-mono" style={{ color: t.textMuted }}>{goal.progress}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: t.border }}>
                      <div className="h-full rounded-full transition-all" style={{
                        width: `${goal.progress}%`,
                        backgroundColor: goal.status === 'off_track' ? '#ef4444' : goal.status === 'complete' ? '#3b82f6' : t.accent,
                      }} />
                    </div>
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

export default DashboardV1Bento;
