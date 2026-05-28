import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, LayoutDashboard, CheckSquare, Target, BarChart3, AlertCircle,
  Video, Users, Network, HeartPulse, Compass, Sparkles, GraduationCap,
  Command, Sun, Moon, Plus, TrendingUp, ArrowRight,
} from 'lucide-react';
import { themes, Theme } from './linearTheme';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', shortcut: 'G D', route: '/prototype/dashboard-v4' },
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
  { name: 'Revenue', value: '$423K', target: '$500K', trend: 'up' as const, delta: '+12%', subtitle: 'Monthly Recurring Revenue' },
  { name: 'NPS Score', value: '72', target: '75', trend: 'up' as const, delta: '+4 pts', subtitle: 'Net Promoter Score' },
  { name: 'Churn Rate', value: '3.2%', target: '<3%', trend: 'flat' as const, delta: '0%', subtitle: 'Monthly Customer Churn' },
  { name: 'MAU', value: '12,847', target: '15,000', trend: 'up' as const, delta: '+8%', subtitle: 'Monthly Active Users' },
  { name: 'Resolution Rate', value: '94%', target: '95%', trend: 'up' as const, delta: '+2%', subtitle: 'Support Ticket Resolution' },
];

const DashboardV4Magazine: React.FC = () => {
  const navigate = useNavigate();
  const [searchFocused, setSearchFocused] = useState(false);
  const [theme, setTheme] = useState<Theme>('dark');
  const t = themes[theme];

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
          <div className="max-w-[960px] mx-auto px-6 py-8">
            {/* Magazine header */}
            <div className="text-center mb-10">
              <div className="text-[10px] uppercase tracking-[0.2em] font-medium mb-3" style={{ color: t.accent }}>ZENTRIX OS · WEEKLY DIGEST</div>
              <h1 className="text-[36px] font-bold tracking-[-0.04em] mb-2" style={{ color: t.textPrimary }}>The State of Zentrix</h1>
              <p className="text-[14px]" style={{ color: t.textMuted }}>Week of March 16–20, 2026 · Curated by Sarah Kim</p>
              <div className="w-16 h-px mx-auto mt-6" style={{ backgroundColor: t.accent }} />
            </div>

            {/* Featured metric - hero block */}
            <div className="rounded-2xl p-8 mb-8 border relative overflow-hidden" style={{ backgroundColor: t.cardBg, borderColor: t.border }}>
              <div className="absolute inset-0 opacity-5" style={{ background: `linear-gradient(135deg, ${t.accent}, transparent 60%)` }} />
              <div className="relative">
                <div className="text-[11px] uppercase tracking-[0.15em] font-medium mb-2" style={{ color: t.accent }}>FEATURED METRIC</div>
                <div className="text-[56px] font-bold tracking-[-0.05em] leading-none mb-3" style={{ color: t.textPrimary }}>$423K</div>
                <div className="text-[18px] font-medium mb-1" style={{ color: t.textSecondary }}>Monthly Recurring Revenue</div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-emerald-400 font-medium"><TrendingUp size={16} /> +12% vs last month</span>
                  <span style={{ color: t.border }}>·</span>
                  <span style={{ color: t.textMuted }}>Target: $500K by Jun 30</span>
                </div>
              </div>
            </div>

            {/* Two-column staggered layout */}
            <div className="grid grid-cols-5 gap-6 mb-8">
              {/* Left column - wider */}
              <div className="col-span-3 space-y-6">
                {/* Tasks section */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="text-[11px] uppercase tracking-[0.15em] font-bold" style={{ color: t.textSecondary }}>THIS WEEK&apos;S TASKS</div>
                    <div className="flex-1 h-px" style={{ backgroundColor: t.border }} />
                  </div>
                  {MY_TASKS.map(task => (
                    <div key={task.title} className="flex items-center gap-3 py-3 border-b cursor-pointer transition-colors" style={{ borderColor: t.border }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = t.hover} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <div className={`w-2.5 h-2.5 rounded-full ${task.status === 'done' ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                      <div className="flex-1">
                        <div className={`text-[13px] font-medium ${task.status === 'done' ? 'line-through' : ''}`} style={{ color: task.status === 'done' ? t.textMuted : t.textPrimary }}>{task.title}</div>
                      </div>
                      <span className="text-[11px] italic" style={{ color: t.textMuted }}>{task.team}</span>
                      <ArrowRight size={12} style={{ color: t.textMuted }} />
                    </div>
                  ))}
                </div>

                {/* Pull quote style metric */}
                <div className="pl-6 py-4 border-l-2" style={{ borderColor: t.accent }}>
                  <div className="text-[20px] font-medium italic mb-2" style={{ color: t.textPrimary }}>&ldquo;NPS Score climbed to 72 — just 3 points from our quarterly target.&rdquo;</div>
                  <div className="text-[12px]" style={{ color: t.textMuted }}>Customer Satisfaction · March 2026</div>
                </div>
              </div>

              {/* Right column - narrower */}
              <div className="col-span-2 space-y-6">
                {/* Metrics sidebar */}
                <div>
                  <div className="text-[11px] uppercase tracking-[0.15em] font-bold mb-4" style={{ color: t.textSecondary }}>KEY NUMBERS</div>
                  {MY_METRICS.slice(1).map(m => (
                    <div key={m.name} className="py-3 border-b" style={{ borderColor: t.border }}>
                      <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: t.textMuted }}>{m.subtitle}</div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-[24px] font-bold" style={{ color: t.textPrimary }}>{m.value}</span>
                        <span className="text-[11px]" style={{ color: m.trend === 'up' ? t.success : t.textMuted }}>{m.delta}</span>
                      </div>
                      <div className="text-[10px] mt-0.5" style={{ color: t.textMuted }}>Target: {m.target}</div>
                    </div>
                  ))}
                </div>

                {/* Goals sidebar */}
                <div>
                  <div className="text-[11px] uppercase tracking-[0.15em] font-bold mb-4" style={{ color: t.textSecondary }}>GOAL TRACKER</div>
                  {MY_GOALS.map(goal => (
                    <div key={goal.title} className="mb-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[12px]" style={{ color: t.textPrimary }}>{goal.title}</span>
                        <span className="text-[11px] font-mono font-bold" style={{ color: goal.status === 'off_track' ? t.error : goal.status === 'complete' ? t.info : t.accent }}>{goal.progress}%</span>
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

            {/* Footer */}
            <div className="text-center py-6 border-t" style={{ borderColor: t.border }}>
              <div className="text-[10px] uppercase tracking-[0.15em]" style={{ color: t.textMuted }}>End of Weekly Digest · Zentrix OS</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardV4Magazine;
