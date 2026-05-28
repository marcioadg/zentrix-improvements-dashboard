import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, LayoutDashboard, CheckSquare, Target, BarChart3, AlertCircle,
  Video, Users, Network, HeartPulse, Compass, Sparkles, GraduationCap,
  Command, Sun, Moon, Plus,
} from 'lucide-react';
import { themes, Theme } from './linearTheme';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', shortcut: 'G D', route: '/prototype/dashboard-v5' },
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
  { title: 'Update Q1 pricing strategy', status: 'todo' as const, due: 'Mar 22', team: 'SALES', priority: 'P1' },
  { title: 'Prepare board presentation', status: 'todo' as const, due: 'Mar 25', team: 'OPS', priority: 'P1' },
  { title: 'Review hiring pipeline', status: 'todo' as const, due: 'Mar 21', team: 'ENG', priority: 'P2' },
  { title: 'Launch customer onboarding v2', status: 'todo' as const, due: 'Mar 28', team: 'CS', priority: 'P2' },
  { title: 'Complete compliance audit', status: 'done' as const, due: 'Mar 18', team: 'OPS', priority: 'P3' },
];

const MY_GOALS = [
  { title: 'Increase MRR to $500K', progress: 57, status: 'on_track' as const, target: 'Jun 30' },
  { title: 'Reduce churn below 3%', progress: 72, status: 'off_track' as const, target: 'Mar 31' },
  { title: 'Launch enterprise tier', progress: 35, status: 'on_track' as const, target: 'Apr 30' },
  { title: 'Hire 5 senior engineers', progress: 40, status: 'off_track' as const, target: 'Mar 31' },
  { title: 'Achieve SOC2 compliance', progress: 88, status: 'complete' as const, target: 'Mar 31' },
];

const MY_METRICS = [
  { name: 'REV', value: '$423K', target: '$500K', trend: 'up' as const, pct: '84.6%', spark: [35, 42, 38, 52, 48, 55, 62, 58, 68, 72, 78, 85] },
  { name: 'NPS', value: '72', target: '75', trend: 'up' as const, pct: '96.0%', spark: [58, 62, 60, 65, 63, 68, 70, 69, 71, 72, 72, 72] },
  { name: 'CHURN', value: '3.2%', target: '<3%', trend: 'flat' as const, pct: '93.8%', spark: [5.2, 4.8, 4.5, 4.2, 3.9, 3.8, 3.6, 3.5, 3.4, 3.3, 3.2, 3.2] },
  { name: 'MAU', value: '12.8K', target: '15K', trend: 'up' as const, pct: '85.6%', spark: [8.2, 8.8, 9.3, 9.8, 10.2, 10.8, 11.1, 11.5, 11.9, 12.2, 12.5, 12.8] },
  { name: 'TICKETS', value: '94%', target: '95%', trend: 'up' as const, pct: '98.9%', spark: [88, 89, 90, 91, 91, 92, 92, 93, 93, 93, 94, 94] },
  { name: 'CAC', value: '$142', target: '$120', trend: 'down' as const, pct: '84.5%', spark: [180, 175, 168, 162, 158, 155, 152, 148, 146, 144, 143, 142] },
  { name: 'LTV', value: '$4.2K', target: '$5K', trend: 'up' as const, pct: '84.0%', spark: [3.1, 3.2, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 4.0, 4.0, 4.1, 4.2] },
  { name: 'BURN', value: '$280K', target: '$300K', trend: 'flat' as const, pct: '93.3%', spark: [310, 305, 300, 298, 295, 292, 290, 288, 285, 283, 281, 280] },
];

const TEAM_STATUS = [
  { name: 'Engineering', headcount: 24, velocity: '92%', blockers: 2 },
  { name: 'Sales', headcount: 12, velocity: '87%', blockers: 1 },
  { name: 'Marketing', headcount: 8, velocity: '95%', blockers: 0 },
  { name: 'Customer Success', headcount: 6, velocity: '91%', blockers: 1 },
  { name: 'Operations', headcount: 5, velocity: '88%', blockers: 0 },
];

const DashboardV5Compact: React.FC = () => {
  const navigate = useNavigate();
  const [searchFocused, setSearchFocused] = useState(false);
  const [theme, setTheme] = useState<Theme>('dark');
  const t = themes[theme];

  const MiniSparkline = ({ data, color }: { data: number[]; color: string }) => {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const w = 48;
    const h = 14;
    const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ');
    return (
      <svg width={w} height={h} className="inline-block">
        <polyline points={points} fill="none" stroke={color} strokeWidth="1.2" />
      </svg>
    );
  };

  return (
    <div className="fixed inset-0 z-[9999] flex font-['JetBrains_Mono','Fira_Code',monospace] text-[11px] leading-[1.4] antialiased" style={{ backgroundColor: t.pageBg, color: t.textPrimary }}>
      {/* Compact sidebar */}
      <aside className="w-[180px] flex-shrink-0 flex flex-col border-r" style={{ borderColor: t.border, backgroundColor: t.sidebarBg }}>
        <div className="flex items-center gap-1.5 px-3 h-[40px] border-b" style={{ borderColor: t.border }}>
          <div className="w-4 h-4 rounded-[3px] flex items-center justify-center text-[8px] font-bold text-white" style={{ backgroundColor: t.accent }}>Z</div>
          <span className="text-[11px] font-bold" style={{ color: t.textPrimary }}>ZENTRIX</span>
        </div>
        <nav className="flex-1 py-1 px-1 space-y-px overflow-y-auto">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = item.label === 'Dashboard';
            return (
              <button key={item.label} onClick={() => navigate(item.route)}
                className="w-full flex items-center gap-2 px-2 py-[2px] rounded text-[10px] font-medium"
                style={isActive ? { backgroundColor: t.active, color: t.textPrimary } : { color: t.textSecondary }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.backgroundColor = t.hover; } }}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.backgroundColor = 'transparent'; } }}
              >
                <Icon size={12} strokeWidth={1.5} style={isActive ? { color: t.accent } : { color: t.textMuted }} />
                <span className="flex-1 text-left truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="px-2 py-2 border-t" style={{ borderColor: t.border }}>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px]" style={{ backgroundColor: t.avatarBg, color: t.accent }}>SK</div>
            <span className="text-[10px]" style={{ color: t.textSecondary }}>Sarah Kim</span>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: t.pageBg }}>
        <header className="flex items-center h-[40px] px-3 border-b gap-2 flex-shrink-0" style={{ borderColor: t.border }}>
          <div className="flex items-center gap-1.5 flex-1 max-w-[360px] px-2 py-[3px] rounded"
            style={{ backgroundColor: searchFocused ? t.searchFocusBg : t.searchBg }}>
            <Search size={11} style={{ color: t.textMuted }} />
            <input type="text" placeholder="Search..." className="bg-transparent border-none outline-none text-[10px] placeholder:opacity-50 w-full" style={{ color: t.textPrimary }}
              onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)} />
            <kbd className="text-[9px] rounded px-1 py-0.5 font-mono border" style={{ color: t.textMuted, backgroundColor: t.kbdBg, borderColor: t.kbdBorder }}>
              <Command size={7} className="inline mr-0.5 -mt-px" />K
            </kbd>
          </div>
          <div className="flex-1" />
          <span className="text-[9px] font-mono" style={{ color: t.textMuted }}>2026-03-20 FRI</span>
          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex items-center justify-center w-6 h-6 rounded" style={{ color: t.textSecondary }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = t.hover} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
            {theme === 'dark' ? <Sun size={12} /> : <Moon size={12} />}
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-2">
          {/* Header bar */}
          <div className="flex items-center gap-2 mb-2 px-1">
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: t.accent }}>TERMINAL</span>
            <div className="flex-1 h-px" style={{ backgroundColor: t.border }} />
            <span className="text-[9px] font-mono" style={{ color: t.textMuted }}>Q1 87% ELAPSED</span>
          </div>

          {/* Metrics table - Bloomberg style */}
          <div className="border rounded mb-2 overflow-hidden" style={{ borderColor: t.border }}>
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: t.cardBg }}>
                  <th className="text-left px-2 py-1 text-[9px] font-bold uppercase tracking-wider border-b" style={{ borderColor: t.border, color: t.textMuted }}>METRIC</th>
                  <th className="text-right px-2 py-1 text-[9px] font-bold uppercase tracking-wider border-b" style={{ borderColor: t.border, color: t.textMuted }}>VALUE</th>
                  <th className="text-right px-2 py-1 text-[9px] font-bold uppercase tracking-wider border-b" style={{ borderColor: t.border, color: t.textMuted }}>TARGET</th>
                  <th className="text-right px-2 py-1 text-[9px] font-bold uppercase tracking-wider border-b" style={{ borderColor: t.border, color: t.textMuted }}>%</th>
                  <th className="text-center px-2 py-1 text-[9px] font-bold uppercase tracking-wider border-b" style={{ borderColor: t.border, color: t.textMuted }}>TREND</th>
                  <th className="text-center px-2 py-1 text-[9px] font-bold uppercase tracking-wider border-b" style={{ borderColor: t.border, color: t.textMuted }}>12W</th>
                </tr>
              </thead>
              <tbody>
                {MY_METRICS.map(m => (
                  <tr key={m.name} className="transition-colors cursor-pointer" onMouseEnter={e => e.currentTarget.style.backgroundColor = t.hover} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <td className="px-2 py-1 border-b font-bold" style={{ borderColor: t.border, color: t.accent }}>{m.name}</td>
                    <td className="px-2 py-1 border-b text-right font-bold" style={{ borderColor: t.border, color: t.textPrimary }}>{m.value}</td>
                    <td className="px-2 py-1 border-b text-right" style={{ borderColor: t.border, color: t.textMuted }}>{m.target}</td>
                    <td className="px-2 py-1 border-b text-right" style={{ borderColor: t.border, color: parseFloat(m.pct) >= 95 ? t.success : parseFloat(m.pct) >= 85 ? t.warning : t.error }}>{m.pct}</td>
                    <td className="px-2 py-1 border-b text-center" style={{ borderColor: t.border, color: m.trend === 'up' ? t.success : m.trend === 'down' ? t.error : t.textMuted }}>
                      {m.trend === 'up' ? '▲' : m.trend === 'down' ? '▼' : '━'}
                    </td>
                    <td className="px-2 py-1 border-b text-center" style={{ borderColor: t.border }}>
                      <MiniSparkline data={m.spark} color={m.trend === 'up' ? t.success : m.trend === 'down' ? t.error : t.textMuted} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Two-column: Tasks + Goals */}
          <div className="grid grid-cols-2 gap-2 mb-2">
            {/* Tasks */}
            <div className="border rounded overflow-hidden" style={{ borderColor: t.border }}>
              <div className="px-2 py-1 border-b flex items-center justify-between" style={{ backgroundColor: t.cardBg, borderColor: t.border }}>
                <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: t.textMuted }}>TASKS [{MY_TASKS.length}]</span>
                <span className="text-[9px]" style={{ color: t.textMuted }}>{MY_TASKS.filter(t => t.status === 'done').length} DONE</span>
              </div>
              {MY_TASKS.map(task => (
                <div key={task.title} className="flex items-center gap-1.5 px-2 py-1 border-b transition-colors cursor-pointer" style={{ borderColor: t.border }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = t.hover} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <span className="text-[9px] font-bold" style={{ color: task.priority === 'P1' ? t.error : task.priority === 'P2' ? t.warning : t.textMuted }}>{task.priority}</span>
                  <span className={`text-[10px] flex-1 truncate ${task.status === 'done' ? 'line-through' : ''}`} style={{ color: task.status === 'done' ? t.textMuted : t.textPrimary }}>{task.title}</span>
                  <span className="text-[8px] px-1 py-0.5 rounded" style={{ backgroundColor: t.hover, color: t.textMuted }}>{task.team}</span>
                  <span className="text-[9px] font-mono" style={{ color: t.textMuted }}>{task.due}</span>
                </div>
              ))}
            </div>

            {/* Goals */}
            <div className="border rounded overflow-hidden" style={{ borderColor: t.border }}>
              <div className="px-2 py-1 border-b flex items-center justify-between" style={{ backgroundColor: t.cardBg, borderColor: t.border }}>
                <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: t.textMuted }}>GOALS [{MY_GOALS.length}]</span>
                <span className="text-[9px]" style={{ color: t.textMuted }}>AVG {Math.round(MY_GOALS.reduce((a, g) => a + g.progress, 0) / MY_GOALS.length)}%</span>
              </div>
              {MY_GOALS.map(goal => (
                <div key={goal.title} className="px-2 py-1 border-b transition-colors cursor-pointer" style={{ borderColor: t.border }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = t.hover} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-bold w-5" style={{ color: goal.status === 'off_track' ? t.error : goal.status === 'complete' ? t.info : t.success }}>
                      {goal.status === 'off_track' ? '!' : goal.status === 'complete' ? '✓' : '●'}
                    </span>
                    <span className="text-[10px] flex-1 truncate" style={{ color: t.textPrimary }}>{goal.title}</span>
                    <span className="text-[9px] font-mono" style={{ color: t.textMuted }}>{goal.target}</span>
                    <span className="text-[10px] font-bold w-8 text-right" style={{ color: goal.progress >= 80 ? t.success : goal.progress >= 50 ? t.warning : t.error }}>{goal.progress}%</span>
                  </div>
                  <div className="ml-[22px] mt-0.5 h-[2px] rounded-full overflow-hidden" style={{ backgroundColor: t.border }}>
                    <div className="h-full rounded-full" style={{ width: `${goal.progress}%`, backgroundColor: goal.status === 'off_track' ? t.error : goal.status === 'complete' ? t.info : t.success }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Team status bar */}
          <div className="border rounded overflow-hidden" style={{ borderColor: t.border }}>
            <div className="px-2 py-1 border-b" style={{ backgroundColor: t.cardBg, borderColor: t.border }}>
              <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: t.textMuted }}>TEAM STATUS</span>
            </div>
            <div className="flex">
              {TEAM_STATUS.map((team, i) => (
                <div key={team.name} className={`flex-1 px-2 py-1.5 ${i < TEAM_STATUS.length - 1 ? 'border-r' : ''}`} style={{ borderColor: t.border }}>
                  <div className="text-[9px] font-bold truncate" style={{ color: t.textSecondary }}>{team.name}</div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[9px]" style={{ color: t.textMuted }}>{team.headcount}p</span>
                    <span className="text-[9px]" style={{ color: t.success }}>{team.velocity}</span>
                    {team.blockers > 0 && <span className="text-[9px]" style={{ color: t.error }}>{team.blockers}!</span>}
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

export default DashboardV5Compact;
