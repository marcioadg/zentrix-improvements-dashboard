import React, { useState } from 'react';
import { ChevronDown, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { CompLayout, CompLoadingSkeleton } from './CompLayout';
import { useDashboardData, formatDate } from './usePrototypeData';
import type { CompThemeTokens } from './compTheme';

const getStatusColor = (t: CompThemeTokens): Record<string, { dot: string; label: string }> => ({
  todo: { dot: t.textMuted, label: 'To Do' },
  done: { dot: t.success, label: 'Done' },
  completed: { dot: t.success, label: 'Done' },
  on_track: { dot: t.success, label: 'On Track' },
  off_track: { dot: t.error, label: 'Off Track' },
  complete: { dot: t.accent, label: 'Complete' },
  canceled: { dot: t.textMuted, label: 'Canceled' },
});

const CompDashboard: React.FC = () => {
  const { goals, tasks, metrics, completedGoalsPct, completedTasksPct, loading } = useDashboardData();
  const [selectedTeam, setSelectedTeam] = useState('All Teams');
  const [teamDropdownOpen, setTeamDropdownOpen] = useState(false);

  const teamNames = ['All Teams', ...new Set([...goals, ...tasks].map(i => ('team_name' in i ? i.team_name : '') || '').filter(Boolean))];

  const q1Start = new Date(2026, 0, 1);
  const q1End = new Date(2026, 2, 31);
  const now = new Date();
  const q1Progress = Math.min(100, Math.round(((now.getTime() - q1Start.getTime()) / (q1End.getTime() - q1Start.getTime())) * 100));

  return (
    <CompLayout activeLabel="Dashboard" searchPlaceholder="Search or jump to...">
      {({ t }) => {
        if (loading) return <CompLoadingSkeleton t={t} rows={8} />;

        return (
          <>
            {/* ── Welcome + Q1 + Team selector ── */}
            <div className="flex items-start justify-between mb-8">
              <div>
                <h1 className="text-[30px] font-semibold tracking-[-0.02em] mb-1" style={{ color: t.textPrimary }}>
                  Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, Marcio
                </h1>
                <p className="text-[14px]" style={{ color: t.textSecondary }}>
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {/* Q1 Progress pill */}
                <div
                  className="flex items-center gap-3 px-4 py-2.5 rounded-[12px] border"
                  style={{ borderColor: t.border, backgroundColor: t.cardBg }}
                >
                  <span className="text-[12px] font-medium" style={{ color: t.textSecondary }}>Q1 Progress</span>
                  <div className="w-[80px] h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: t.divider }}>
                    <div className="h-full rounded-full" style={{ backgroundColor: t.accent, width: `${q1Progress}%` }} />
                  </div>
                  <span className="text-[12px] font-semibold" style={{ color: t.accent }}>{q1Progress}%</span>
                </div>
                {/* Team selector */}
                <div className="relative">
                  <button
                    onClick={() => setTeamDropdownOpen(!teamDropdownOpen)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-[8px] border text-[14px] transition-colors"
                    style={{ borderColor: t.border, color: t.textSecondary, backgroundColor: t.cardBg }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = t.hover)}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = t.cardBg)}
                  >
                    {selectedTeam}
                    <ChevronDown size={14} />
                  </button>
                  {teamDropdownOpen && (
                    <div
                      className="absolute right-0 top-full mt-1 w-[200px] rounded-[12px] border py-1.5 z-10"
                      style={{ borderColor: t.border, backgroundColor: t.cardBg, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                    >
                      {teamNames.map(team => (
                        <button
                          key={team}
                          onClick={() => { setSelectedTeam(team); setTeamDropdownOpen(false); }}
                          className="w-full text-left px-4 py-2 text-[14px] transition-colors"
                          style={{ color: selectedTeam === team ? t.accent : t.textSecondary }}
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
            <div className="grid grid-cols-2 gap-5 mb-8">
              <div className="rounded-[12px] border px-6 py-5" style={{ borderColor: t.border, backgroundColor: t.cardBg }}>
                <div className="text-[12px] font-medium uppercase tracking-[0.05em] mb-1" style={{ color: t.textMuted }}>
                  Completed Goals
                </div>
                <div className="text-[10px] mb-3" style={{ color: t.textMuted }}>This Quarter</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[36px] font-semibold tracking-[-0.03em]" style={{ color: t.textPrimary }}>
                    {completedGoalsPct}%
                  </span>
                  <span className="text-[13px]" style={{ color: t.textSecondary }}>
                    {goals.filter(g => g.status === 'complete').length} of {goals.length} goals
                  </span>
                </div>
                <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ backgroundColor: t.divider }}>
                  <div className="h-full rounded-full" style={{ backgroundColor: t.success, width: `${completedGoalsPct}%` }} />
                </div>
              </div>
              <div className="rounded-[12px] border px-6 py-5" style={{ borderColor: t.border, backgroundColor: t.cardBg }}>
                <div className="text-[12px] font-medium uppercase tracking-[0.05em] mb-1" style={{ color: t.textMuted }}>
                  Tasks Completed
                </div>
                <div className="text-[10px] mb-3" style={{ color: t.textMuted }}>Last 7 Days</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[36px] font-semibold tracking-[-0.03em]" style={{ color: t.textPrimary }}>
                    {completedTasksPct}%
                  </span>
                  <span className="text-[13px]" style={{ color: t.textSecondary }}>
                    {tasks.filter(tk => tk.status === 'done' || tk.status === 'completed').length} of {tasks.length} tasks
                  </span>
                </div>
                <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ backgroundColor: t.divider }}>
                  <div className="h-full rounded-full" style={{ backgroundColor: t.accent, width: `${completedTasksPct}%` }} />
                </div>
              </div>
            </div>

            {/* ── 3-column grid ── */}
            <div className="grid grid-cols-3 gap-5">
              {/* ── Tasks ── */}
              <div className="rounded-[12px] border overflow-hidden" style={{ borderColor: t.border, backgroundColor: t.cardBg }}>
                <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: t.divider }}>
                  <span className="text-[14px] font-semibold" style={{ color: t.textPrimary }}>Recent Tasks</span>
                  <span
                    className="text-[12px] font-medium px-2 py-0.5 rounded-[9999px]"
                    style={{ backgroundColor: t.surfaceSecondary, color: t.textMuted }}
                  >
                    {tasks.length}
                  </span>
                </div>
                {tasks.length === 0 && (
                  <div className="px-5 py-8 text-center text-[14px]" style={{ color: t.textMuted }}>No recent tasks</div>
                )}
                {tasks.map((task, i) => {
                  const isDone = task.status === 'done' || task.status === 'completed';
                  const statusColors = getStatusColor(t);
                  const sc = statusColors[task.status] || statusColors.todo;
                  return (
                    <div
                      key={task.id}
                      className={`flex items-start gap-3 px-5 py-3 transition-colors cursor-pointer ${i < tasks.length - 1 ? 'border-b' : ''}`}
                      style={i < tasks.length - 1 ? { borderColor: t.divider } : undefined}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = t.hover)}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5"
                        style={{ backgroundColor: sc.dot }}
                      />
                      <div className="flex-1 min-w-0">
                        <div
                          className={`text-[13px] truncate ${isDone ? 'line-through' : ''}`}
                          style={{ color: isDone ? t.textMuted : t.textPrimary }}
                        >
                          {task.title}
                        </div>
                        <div className="text-[11px] mt-0.5" style={{ color: t.textMuted }}>
                          {task.team_name || task.task_type} · {formatDate(task.due_date)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── Goals ── */}
              <div className="rounded-[12px] border overflow-hidden" style={{ borderColor: t.border, backgroundColor: t.cardBg }}>
                <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: t.divider }}>
                  <span className="text-[14px] font-semibold" style={{ color: t.textPrimary }}>Goals</span>
                  <span
                    className="text-[12px] font-medium px-2 py-0.5 rounded-[9999px]"
                    style={{ backgroundColor: t.surfaceSecondary, color: t.textMuted }}
                  >
                    {goals.length}
                  </span>
                </div>
                {goals.length === 0 && (
                  <div className="px-5 py-8 text-center text-[14px]" style={{ color: t.textMuted }}>No goals found</div>
                )}
                {goals.map((goal, i) => {
                  const statusColors = getStatusColor(t);
                  const sc = statusColors[goal.status] || statusColors.todo;
                  return (
                    <div
                      key={goal.id}
                      className={`px-5 py-3 transition-colors cursor-pointer ${i < goals.length - 1 ? 'border-b' : ''}`}
                      style={i < goals.length - 1 ? { borderColor: t.divider } : undefined}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = t.hover)}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <div className="flex items-center gap-2.5 mb-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: sc.dot }} />
                        <span className="text-[13px] truncate flex-1" style={{ color: t.textPrimary }}>{goal.title}</span>
                      </div>
                      <div className="flex items-center gap-2 pl-5">
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: t.divider }}>
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${goal.progress}%`,
                              backgroundColor:
                                goal.status === 'off_track' ? t.error :
                                goal.status === 'complete' ? t.accent :
                                t.success,
                            }}
                          />
                        </div>
                        <span className="text-[11px] font-medium w-8 text-right" style={{ color: t.textMuted }}>
                          {goal.progress}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── Metrics ── */}
              <div className="rounded-[12px] border overflow-hidden" style={{ borderColor: t.border, backgroundColor: t.cardBg }}>
                <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: t.divider }}>
                  <span className="text-[14px] font-semibold" style={{ color: t.textPrimary }}>Metrics</span>
                  <span
                    className="text-[12px] font-medium px-2 py-0.5 rounded-[9999px]"
                    style={{ backgroundColor: t.surfaceSecondary, color: t.textMuted }}
                  >
                    {metrics.length}
                  </span>
                </div>
                {metrics.length === 0 && (
                  <div className="px-5 py-8 text-center text-[14px]" style={{ color: t.textMuted }}>No metrics found</div>
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
                  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
                  const trendColor = trend === 'up' ? t.success : trend === 'down' ? t.error : t.textMuted;

                  return (
                    <div
                      key={metric.id}
                      className={`flex items-center gap-3 px-5 py-3 transition-colors cursor-pointer ${i < metrics.length - 1 ? 'border-b' : ''}`}
                      style={i < metrics.length - 1 ? { borderColor: t.divider } : undefined}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = t.hover)}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] truncate" style={{ color: t.textPrimary }}>{metric.metric_name}</div>
                        <div className="text-[11px] mt-0.5" style={{ color: t.textMuted }}>
                          Target: {metric.target_value !== null ? `${metric.target_value} ${metric.unit}` : '—'}
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <span className="text-[16px] font-semibold" style={{ color: t.textPrimary }}>
                          {latestValue !== null ? `${latestValue}` : '—'}
                        </span>
                        <TrendIcon size={14} style={{ color: trendColor }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        );
      }}
    </CompLayout>
  );
};

export default CompDashboard;
