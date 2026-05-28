import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, LayoutDashboard, CheckSquare, Target, BarChart3, AlertCircle,
  Video, Users, Network, HeartPulse, Compass, Sparkles, GraduationCap,
  Command, Sun, Moon, Plus, TrendingUp, TrendingDown, Minus,
} from 'lucide-react';
import { themes, Theme } from './linearTheme';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', shortcut: 'G D', route: '/prototype/dashboard-v8' },
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
  { name: 'Revenue', value: '$423K', target: '$500K', trend: 'up' as const, delta: '+12%', data: [285, 310, 325, 340, 355, 368, 375, 390, 398, 410, 418, 423] },
  { name: 'NPS Score', value: '72', target: '75', trend: 'up' as const, delta: '+4', data: [58, 62, 60, 65, 63, 68, 70, 69, 71, 72, 72, 72] },
  { name: 'Churn Rate', value: '3.2%', target: '<3%', trend: 'flat' as const, delta: '0%', data: [5.2, 4.8, 4.5, 4.2, 3.9, 3.8, 3.6, 3.5, 3.4, 3.3, 3.2, 3.2] },
  { name: 'Monthly Active Users', value: '12,847', target: '15,000', trend: 'up' as const, delta: '+8%', data: [8200, 8800, 9300, 9800, 10200, 10800, 11100, 11500, 11900, 12200, 12500, 12847] },
  { name: 'Support Resolution', value: '94%', target: '95%', trend: 'up' as const, delta: '+2%', data: [88, 89, 90, 91, 91, 92, 92, 93, 93, 93, 94, 94] },
];

const MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

const DashboardV8Metrics: React.FC = () => {
  const navigate = useNavigate();
  const [searchFocused, setSearchFocused] = useState(false);
  const [theme, setTheme] = useState<Theme>('dark');
  const [selectedMetric, setSelectedMetric] = useState(0);
  const t = themes[theme];

  const metric = MY_METRICS[selectedMetric];

  const ChartArea = ({ data, color, height = 200 }: { data: number[]; color: string; height?: number }) => {
    const max = Math.max(...data) * 1.1;
    const min = Math.min(...data) * 0.9;
    const range = max - min || 1;
    const w = 100;
    const h = height;

    const points = data.map((v, i) => ({
      x: (i / (data.length - 1)) * w,
      y: h - ((v - min) / range) * h,
    }));

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaD = `${pathD} L ${w} ${h} L 0 ${h} Z`;

    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }} preserveAspectRatio="none">
        <defs>
          <linearGradient id={`grad-${selectedMetric}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#grad-${selectedMetric})`} />
        <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="2" fill={i === points.length - 1 ? color : 'transparent'} stroke={i === points.length - 1 ? color : 'transparent'} vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
    );
  };

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
          <div className="max-w-[1000px] mx-auto px-6 py-6">
            <div className="mb-6">
              <h1 className="text-[22px] font-semibold tracking-[-0.03em] mb-1" style={{ color: t.textPrimary }}>Metrics Dashboard</h1>
              <p className="text-[13px]" style={{ color: t.textMuted }}>Friday, March 20, 2026 · Data-driven insights</p>
            </div>

            {/* Large chart area */}
            <div className="rounded-xl border p-6 mb-6" style={{ backgroundColor: t.cardBg, borderColor: t.border }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-[11px] uppercase tracking-wider" style={{ color: t.textMuted }}>{metric.name}</div>
                  <div className="flex items-baseline gap-3">
                    <span className="text-[36px] font-bold tracking-[-0.03em]" style={{ color: t.textPrimary }}>{metric.value}</span>
                    <span className="flex items-center gap-1 text-[14px] font-medium" style={{ color: metric.trend === 'up' ? t.success : metric.trend === 'flat' ? t.textMuted : t.error }}>
                      {metric.trend === 'up' ? <TrendingUp size={16} /> : metric.trend === 'flat' ? <Minus size={16} /> : <TrendingDown size={16} />}
                      {metric.delta}
                    </span>
                  </div>
                  <div className="text-[11px]" style={{ color: t.textMuted }}>Target: {metric.target}</div>
                </div>
                {/* Metric tabs */}
                <div className="flex gap-1">
                  {MY_METRICS.map((m, i) => (
                    <button key={m.name} onClick={() => setSelectedMetric(i)}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors"
                      style={i === selectedMetric
                        ? { backgroundColor: t.accent, color: '#fff' }
                        : { color: t.textMuted }
                      }
                      onMouseEnter={e => { if (i !== selectedMetric) e.currentTarget.style.backgroundColor = t.hover; }}
                      onMouseLeave={e => { if (i !== selectedMetric) e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >{m.name}</button>
                  ))}
                </div>
              </div>

              <div className="relative">
                <ChartArea data={metric.data} color={t.accent} height={200} />
                {/* X-axis labels */}
                <div className="flex justify-between mt-2 px-1">
                  {MONTHS.map(m => (
                    <span key={m} className="text-[9px]" style={{ color: t.textMuted }}>{m}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* KPI Cards row */}
            <div className="grid grid-cols-5 gap-3 mb-6">
              {MY_METRICS.map((m, i) => (
                <div key={m.name} className="rounded-xl p-4 border cursor-pointer transition-all"
                  style={{
                    backgroundColor: i === selectedMetric ? `${t.accent}10` : t.cardBg,
                    borderColor: i === selectedMetric ? t.accent : t.border,
                  }}
                  onClick={() => setSelectedMetric(i)}>
                  <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: t.textMuted }}>{m.name}</div>
                  <div className="text-[18px] font-bold" style={{ color: t.textPrimary }}>{m.value}</div>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-[10px]" style={{ color: m.trend === 'up' ? t.success : m.trend === 'flat' ? t.textMuted : t.error }}>
                      {m.trend === 'up' ? '▲' : m.trend === 'flat' ? '━' : '▼'} {m.delta}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom: Tasks + Goals side by side */}
            <div className="grid grid-cols-2 gap-4">
              {/* Tasks */}
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: t.border }}>
                <div className="px-4 py-3 border-b" style={{ backgroundColor: t.cardBg, borderColor: t.border }}>
                  <span className="text-[13px] font-semibold" style={{ color: t.textPrimary }}>Tasks</span>
                </div>
                {MY_TASKS.map(task => (
                  <div key={task.title} className="flex items-center gap-3 px-4 py-2.5 border-b last:border-b-0 transition-colors cursor-pointer" style={{ borderColor: t.border }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = t.hover} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: task.status === 'done' ? t.success : t.textMuted }} />
                    <span className={`flex-1 text-[12px] truncate ${task.status === 'done' ? 'line-through' : ''}`} style={{ color: task.status === 'done' ? t.textMuted : t.textPrimary }}>{task.title}</span>
                    <span className="text-[10px] font-mono" style={{ color: t.textMuted }}>{task.due}</span>
                  </div>
                ))}
              </div>

              {/* Goals */}
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: t.border }}>
                <div className="px-4 py-3 border-b" style={{ backgroundColor: t.cardBg, borderColor: t.border }}>
                  <span className="text-[13px] font-semibold" style={{ color: t.textPrimary }}>Goals</span>
                </div>
                {MY_GOALS.map(goal => (
                  <div key={goal.title} className="px-4 py-2.5 border-b last:border-b-0 transition-colors cursor-pointer" style={{ borderColor: t.border }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = t.hover} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[12px] truncate" style={{ color: t.textPrimary }}>{goal.title}</span>
                      <span className="text-[11px] font-mono ml-2" style={{ color: t.textMuted }}>{goal.progress}%</span>
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
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardV8Metrics;
