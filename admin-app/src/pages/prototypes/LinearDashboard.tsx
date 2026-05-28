import React, { useState } from 'react';
import { ChevronDown, Circle } from 'lucide-react';
import { LinearLayout, LoadingSkeleton, FooterHint } from './LinearLayout';
import { useDashboardData, formatDate } from './usePrototypeData';

const STATUS_DOT: Record<string, string> = {
  todo: 'bg-gray-400',
  done: 'bg-emerald-500',
  completed: 'bg-emerald-500',
  on_track: 'bg-emerald-500',
  off_track: 'bg-destructive',
  complete: 'bg-primary',
  canceled: 'bg-gray-400',
};

const LinearDashboard: React.FC = () => {
  const { goals, tasks, metrics, completedGoalsPct, completedTasksPct, loading } = useDashboardData();
  const [selectedTeam, setSelectedTeam] = useState('All Teams');
  const [teamDropdownOpen, setTeamDropdownOpen] = useState(false);

  // Derive unique team names
  const teamNames = ['All Teams', ...new Set([...goals, ...tasks].map(i => ('team_name' in i ? i.team_name : '') || '').filter(Boolean))];

  // Q1 progress
  const q1Start = new Date(2026, 0, 1);
  const q1End = new Date(2026, 2, 31);
  const now = new Date();
  const q1Progress = Math.min(100, Math.round(((now.getTime() - q1Start.getTime()) / (q1End.getTime() - q1Start.getTime())) * 100));

  return (
    <LinearLayout activeLabel="Dashboard" searchPlaceholder="Search or jump to...">
      {({ t, theme }) => {
        if (loading) return <LoadingSkeleton t={t} rows={8} />;

        return (
          <>
            {/* ── Welcome + Team selector ── */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-[22px] font-semibold tracking-[-0.03em] mb-1" style={{ color: t.textPrimary }}>
                  Dashboard
                </h1>
                <p className="text-[13px]" style={{ color: t.textMuted }}>
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-[5px] border" style={{ borderColor: t.border, backgroundColor: t.cardBg }}>
                  <span className="text-[11px] font-medium" style={{ color: t.textMuted }}>Q1 Progress</span>
                  <div className="w-[60px] h-1 rounded-full overflow-hidden" style={{ backgroundColor: t.border }}>
                    <div className="h-full rounded-full" style={{ backgroundColor: t.accent, width: `${q1Progress}%` }} />
                  </div>
                  <span className="text-[11px] font-mono" style={{ color: t.textSecondary }}>{q1Progress}%</span>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setTeamDropdownOpen(!teamDropdownOpen)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[5px] border bg-transparent text-[12px] transition-colors"
                    style={{ borderColor: t.border, color: t.textSecondary }}
                  >
                    {selectedTeam}
                    <ChevronDown size={12} />
                  </button>
                  {teamDropdownOpen && (
                    <div className="absolute right-0 top-full mt-1 w-[180px] rounded-[6px] border py-1 z-10" style={{ borderColor: t.border, backgroundColor: t.cardBg }}>
                      {teamNames.map(team => (
                        <button
                          key={team}
                          onClick={() => { setSelectedTeam(team); setTeamDropdownOpen(false); }}
                          className="w-full text-left px-3 py-1.5 text-[12px] transition-colors"
                          style={{ color: selectedTeam === team ? t.textPrimary : t.textSecondary }}
                          onMouseEnter={e => (e.currentTarget.style.backgroundColor = t.hover)}
                          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          {team}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── KPIs ── */}
            <div className="grid grid-cols-2 gap-px mb-8 rounded-[6px] overflow-hidden border" style={{ borderColor: t.border }}>
              <div className="px-5 py-4" style={{ backgroundColor: t.cardBg }}>
                <div className="text-[11px] uppercase tracking-[0.06em] font-medium mb-0.5" style={{ color: t.textMuted }}>Completed Goals</div>
                <div className="text-[10px] mb-2" style={{ color: t.textMuted }}>This Quarter</div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[28px] font-semibold tracking-[-0.04em]" style={{ color: t.textPrimary }}>{completedGoalsPct}%</span>
                  <span className="text-[12px]" style={{ color: t.textMuted }}>
                    {goals.filter(g => g.status === 'complete').length} of {goals.length} goals
                  </span>
                </div>
              </div>
              <div className="px-5 py-4" style={{ backgroundColor: t.cardBg }}>
                <div className="text-[11px] uppercase tracking-[0.06em] font-medium mb-0.5" style={{ color: t.textMuted }}>Tasks Completed</div>
                <div className="text-[10px] mb-2" style={{ color: t.textMuted }}>Last 7 Days</div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[28px] font-semibold tracking-[-0.04em]" style={{ color: t.textPrimary }}>{completedTasksPct}%</span>
                  <span className="text-[12px]" style={{ color: t.textMuted }}>
                    {tasks.filter(tk => tk.status === 'done' || tk.status === 'completed').length} of {tasks.length} tasks
                  </span>
                </div>
              </div>
            </div>

            {/* ── 3-column grid ── */}
            <div className="grid grid-cols-3 gap-4">
              {/* ── Tasks ── */}
              <div className="rounded-[6px] border overflow-hidden" style={{ borderColor: t.border }}>
                <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ backgroundColor: t.cardBg, borderColor: t.border }}>
                  <span className="text-[12px] font-medium" style={{ color: t.textSecondary }}>Recent Tasks</span>
                  <span className="text-[11px] font-mono" style={{ color: t.textMuted }}>{tasks.length}</span>
                </div>
                {tasks.length === 0 && (
                  <div className="px-4 py-6 text-center text-[12px]" style={{ color: t.textMuted }}>No recent tasks</div>
                )}
                {tasks.map((task, i) => {
                  const isDone = task.status === 'done' || task.status === 'completed';
                  return (
                    <div
                      key={task.id}
                      className={`flex items-start gap-2.5 px-4 py-2.5 transition-colors cursor-pointer ${i < tasks.length - 1 ? 'border-b' : ''}`}
                      style={i < tasks.length - 1 ? { borderColor: t.border } : undefined}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = t.hover)}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${STATUS_DOT[task.status] || 'bg-gray-400'}`} />
                      <div className="flex-1 min-w-0">
                        <div className={`text-[12px] truncate ${isDone ? 'line-through' : ''}`} style={{ color: isDone ? t.textMuted : t.textPrimary }}>
                          {task.title}
                        </div>
                        <div className="text-[10px] mt-0.5" style={{ color: t.textMuted }}>
                          {task.team_name || task.task_type} · {formatDate(task.due_date)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── Goals ── */}
              <div className="rounded-[6px] border overflow-hidden" style={{ borderColor: t.border }}>
                <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ backgroundColor: t.cardBg, borderColor: t.border }}>
                  <span className="text-[12px] font-medium" style={{ color: t.textSecondary }}>Goals</span>
                  <span className="text-[11px] font-mono" style={{ color: t.textMuted }}>{goals.length}</span>
                </div>
                {goals.length === 0 && (
                  <div className="px-4 py-6 text-center text-[12px]" style={{ color: t.textMuted }}>No goals found</div>
                )}
                {goals.map((goal, i) => (
                  <div
                    key={goal.id}
                    className={`px-4 py-2.5 transition-colors cursor-pointer ${i < goals.length - 1 ? 'border-b' : ''}`}
                    style={i < goals.length - 1 ? { borderColor: t.border } : undefined}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = t.hover)}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[goal.status] || 'bg-gray-400'}`} />
                      <span className="text-[12px] truncate flex-1" style={{ color: t.textPrimary }}>{goal.title}</span>
                    </div>
                    <div className="flex items-center gap-2 pl-4">
                      <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ backgroundColor: t.border }}>
                        <div
                          className={`h-full rounded-full ${
                            goal.status === 'off_track' ? 'bg-destructive/60' :
                            goal.status === 'complete' ? 'bg-primary/60' :
                            'bg-[#5c84fe]'
                          }`}
                          style={{ width: `${goal.progress}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono w-7 text-right" style={{ color: t.textMuted }}>{goal.progress}%</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Metrics ── */}
              <div className="rounded-[6px] border overflow-hidden" style={{ borderColor: t.border }}>
                <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ backgroundColor: t.cardBg, borderColor: t.border }}>
                  <span className="text-[12px] font-medium" style={{ color: t.textSecondary }}>Metrics</span>
                  <span className="text-[11px] font-mono" style={{ color: t.textMuted }}>{metrics.length}</span>
                </div>
                {metrics.length === 0 && (
                  <div className="px-4 py-6 text-center text-[12px]" style={{ color: t.textMuted }}>No metrics found</div>
                )}
                {metrics.map((metric, i) => {
                  const latestWeek = Object.keys(metric.weeklyValues).sort().pop();
                  const latestValue = latestWeek ? metric.weeklyValues[latestWeek] : null;
                  const prevWeeks = Object.keys(metric.weeklyValues).sort();
                  const prevWeek = prevWeeks.length >= 2 ? prevWeeks[prevWeeks.length - 2] : null;
                  const prevValue = prevWeek ? metric.weeklyValues[prevWeek] : null;
                  const trend = latestValue !== null && prevValue !== null
                    ? (latestValue > prevValue ? 'up' : latestValue < prevValue ? 'down' : 'flat')
                    : 'flat';

                  return (
                    <div
                      key={metric.id}
                      className={`flex items-center gap-3 px-4 py-2.5 transition-colors cursor-pointer ${i < metrics.length - 1 ? 'border-b' : ''}`}
                      style={i < metrics.length - 1 ? { borderColor: t.border } : undefined}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = t.hover)}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] truncate" style={{ color: t.textPrimary }}>{metric.metric_name}</div>
                        <div className="text-[10px] mt-0.5" style={{ color: t.textMuted }}>
                          Target: {metric.target_value !== null ? `${metric.target_value} ${metric.unit}` : '—'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[14px] font-semibold" style={{ color: t.textPrimary }}>
                          {latestValue !== null ? `${latestValue}` : '—'}
                        </div>
                        <div className="flex items-center gap-0.5 justify-end">
                          <Circle size={5} className={trend === 'up' ? 'text-emerald-400/60 fill-emerald-400/60' : trend === 'down' ? 'text-red-400/60 fill-red-400/60' : 'text-[#5e5e5f] fill-[#5e5e5f]'} />
                          <span className={`text-[10px] ${trend === 'up' ? 'text-emerald-400/60' : trend === 'down' ? 'text-red-400/60' : 'text-[#5e5e5f]'}`}>
                            {trend === 'up' ? 'trending up' : trend === 'down' ? 'trending down' : 'flat'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <FooterHint t={t} />
          </>
        );
      }}
    </LinearLayout>
  );
};

export default LinearDashboard;
