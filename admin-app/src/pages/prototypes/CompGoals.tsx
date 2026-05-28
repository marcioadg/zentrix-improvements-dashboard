import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
import { CompLayout, CompLoadingSkeleton } from './CompLayout';
import { useGoals, useTeams, formatDate, Goal } from './usePrototypeData';

type GoalStatus = 'on_track' | 'off_track' | 'complete' | 'canceled';

const getStatusConfig = (t: any): Record<string, { color: string; bg: string; label: string }> => ({
  on_track: { color: t.successDark, bg: t.successLighter, label: 'On Track' },
  off_track: { color: t.errorDark, bg: t.errorLighter, label: 'Off Track' },
  complete: { color: t.accentDark, bg: t.accentLighter, label: 'Complete' },
  completed: { color: t.accentDark, bg: t.accentLighter, label: 'Complete' },
  canceled: { color: t.textMuted, bg: t.border, label: 'Canceled' },
});

const ALL_STATUSES: GoalStatus[] = ['on_track', 'off_track', 'complete', 'canceled'];

const StatusDropdown: React.FC<{ status: string; t: any }> = ({ status, t }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const statusConfig = getStatusConfig(t);
  const cfg = statusConfig[status] || statusConfig.on_track;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(!open); }}
        className="flex items-center gap-2 px-2.5 py-1 rounded-[9999px] text-[12px] font-medium transition-colors"
        style={{ backgroundColor: cfg.bg, color: cfg.color }}
      >
        {cfg.label}
        <ChevronDown size={11} />
      </button>
      {open && (
        <div
          className="absolute left-0 top-full mt-1 w-[140px] rounded-[12px] border py-1.5 z-20"
          style={{ borderColor: t.border, backgroundColor: t.cardBg, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
        >
          {ALL_STATUSES.map(s => {
            const c = statusConfig[s];
            return (
              <div
                key={s}
                className="flex items-center gap-2.5 px-3 py-2 text-[13px] transition-colors cursor-pointer"
                style={{ color: s === status ? t.textPrimary : t.textSecondary }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = t.hover)}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                {c.label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const CompGoals: React.FC = () => {
  const { goals, loading: goalsLoading } = useGoals();
  const { teams, loading: teamsLoading } = useTeams();
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);
  const [teamFilter, setTeamFilter] = useState('All Teams');
  const [teamDropdownOpen, setTeamDropdownOpen] = useState(false);

  const loading = goalsLoading || teamsLoading;
  const teamNames = ['All Teams', ...teams.map(t => t.name)];

  const filteredGoals = teamFilter === 'All Teams' ? goals : goals.filter(g => g.team_name === teamFilter);
  const companyGoals = filteredGoals.filter(g => g.is_company_goal);
  const teamGoals = filteredGoals.filter(g => !g.is_company_goal);

  const onTrack = goals.filter(g => g.status === 'on_track').length;
  const offTrack = goals.filter(g => g.status === 'off_track').length;
  const complete = goals.filter(g => g.status === 'complete' || g.status === 'completed').length;
  const canceled = goals.filter(g => g.status === 'canceled').length;
  const avgProgress = goals.length > 0 ? Math.round(goals.reduce((a, g) => a + (g.progress || 0), 0) / goals.length) : 0;

  return (
    <CompLayout activeLabel="Goals" searchPlaceholder="Search goals...">
      {({ t }) => {
        if (loading) return <CompLoadingSkeleton t={t} rows={8} />;

        const renderGoalRow = (goal: Goal, i: number, list: Goal[]) => {
          const isExpanded = expandedGoal === goal.id;
          const statusConfig = getStatusConfig(t);
          const statusCfg = statusConfig[goal.status] || statusConfig.on_track;
          return (
            <div key={goal.id}>
              <div
                onClick={() => setExpandedGoal(isExpanded ? null : goal.id)}
                className={`grid grid-cols-[20px_1fr_100px_120px_90px_150px] gap-3 px-5 py-3.5 items-center transition-colors cursor-pointer ${i < list.length - 1 || isExpanded ? 'border-b' : ''}`}
                style={{ borderColor: t.divider }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = t.hover)}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <GripVertical size={14} style={{ color: t.textDisabled }} />
                <div className="flex items-center gap-3 min-w-0">
                  {isExpanded
                    ? <ChevronDown size={14} className="flex-shrink-0" style={{ color: t.textMuted }} />
                    : <ChevronRight size={14} className="flex-shrink-0" style={{ color: t.textMuted }} />
                  }
                  <span
                    className={`truncate text-[14px] ${goal.status === 'complete' || goal.status === 'canceled' ? 'line-through' : ''}`}
                    style={{ color: goal.status === 'complete' || goal.status === 'canceled' ? t.textMuted : t.textPrimary }}
                  >
                    {goal.title}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0"
                    style={{ backgroundColor: t.avatarBg, color: t.accentDark }}
                  >
                    {goal.owner_initials}
                  </div>
                  <span className="text-[13px] truncate" style={{ color: t.textMuted }}>{(goal.owner_name || '').split(' ')[0]}</span>
                </div>
                <StatusDropdown status={goal.status} t={t} />
                <span className="text-[13px]" style={{ color: t.textMuted }}>{formatDate(goal.target_date)}</span>
                <div className="flex items-center gap-2.5">
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: t.divider }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${goal.progress}%`,
                        backgroundColor: statusCfg.color,
                      }}
                    />
                  </div>
                  <span className="text-[12px] font-semibold w-9 text-right" style={{ color: t.textSecondary }}>
                    {goal.progress}%
                  </span>
                </div>
              </div>
              {isExpanded && (
                <div
                  className={`px-5 py-5 pl-14 ${i < list.length - 1 ? 'border-b' : ''}`}
                  style={{ backgroundColor: t.surfaceSecondary, borderColor: t.divider }}
                >
                  <p className="text-[14px] mb-4 max-w-[600px] leading-relaxed" style={{ color: t.textSecondary }}>
                    {goal.description || 'No description'}
                  </p>
                  <div className="flex items-center gap-4 text-[12px]" style={{ color: t.textMuted }}>
                    <span>Team: <strong style={{ color: t.textSecondary }}>{goal.team_name}</strong></span>
                    <span style={{ color: t.divider }}>·</span>
                    <span>Owner: <strong style={{ color: t.textSecondary }}>{goal.owner_name}</strong></span>
                    <span style={{ color: t.divider }}>·</span>
                    <span>Target: <strong style={{ color: t.textSecondary }}>{formatDate(goal.target_date)}</strong></span>
                  </div>
                </div>
              )}
            </div>
          );
        };

        const renderGoalSection = (title: string, goalsList: Goal[]) => (
          <div className="mb-8">
            <h2 className="text-[16px] font-semibold mb-3" style={{ color: t.textPrimary }}>{title}</h2>
            <div className="rounded-[12px] border overflow-hidden" style={{ borderColor: t.border, backgroundColor: t.cardBg }}>
              <div
                className="grid grid-cols-[20px_1fr_100px_120px_90px_150px] gap-3 px-5 py-2.5 text-[12px] uppercase tracking-[0.05em] font-medium border-b"
                style={{ backgroundColor: t.surfaceSecondary, borderColor: t.divider, color: t.textMuted }}
              >
                <span />
                <span>Goal</span>
                <span>Owner</span>
                <span>Status</span>
                <span>Target</span>
                <span>Progress</span>
              </div>
              {goalsList.length === 0 ? (
                <div className="px-5 py-8 text-center text-[14px]" style={{ color: t.textMuted }}>No goals in this section</div>
              ) : (
                goalsList.map((goal, i) => renderGoalRow(goal, i, goalsList))
              )}
            </div>
          </div>
        );

        return (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-[24px] font-semibold tracking-[-0.02em] mb-1" style={{ color: t.textPrimary }}>Goals</h1>
                <p className="text-[14px]" style={{ color: t.textMuted }}>{goals.length} goals · {avgProgress}% avg progress</p>
              </div>
              <div className="relative">
                <button
                  onClick={() => setTeamDropdownOpen(!teamDropdownOpen)}
                  className="flex items-center gap-2 px-4 py-2 rounded-[8px] border text-[14px] transition-colors"
                  style={{ borderColor: t.border, color: t.textSecondary, backgroundColor: t.cardBg }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = t.hover)}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = t.cardBg)}
                >
                  {teamFilter}
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
                        onClick={() => { setTeamFilter(team); setTeamDropdownOpen(false); }}
                        className="w-full text-left px-4 py-2 text-[14px] transition-colors"
                        style={{ color: teamFilter === team ? t.accent : t.textSecondary }}
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

            {/* ── Summary cards ── */}
            <div className="grid grid-cols-5 gap-4 mb-8">
              {[
                { label: 'On Track', value: onTrack, color: t.success, bg: t.successLighter },
                { label: 'Off Track', value: offTrack, color: t.error, bg: t.errorLighter },
                { label: 'Complete', value: complete, color: t.accent, bg: t.accentLighter },
                { label: 'Canceled', value: canceled, color: t.textMuted, bg: t.surfaceSecondary },
                { label: 'Avg Progress', value: `${avgProgress}%`, color: t.textPrimary, bg: t.surfaceSecondary },
              ].map(card => (
                <div
                  key={card.label}
                  className="rounded-[12px] border px-4 py-4"
                  style={{ borderColor: t.border, backgroundColor: t.cardBg }}
                >
                  <div className="text-[12px] font-medium uppercase tracking-[0.05em] mb-2" style={{ color: t.textMuted }}>
                    {card.label}
                  </div>
                  <span className="text-[28px] font-semibold tracking-[-0.03em]" style={{ color: card.color }}>
                    {card.value}
                  </span>
                </div>
              ))}
            </div>

            {renderGoalSection('Company Goals', companyGoals)}
            {renderGoalSection('Team Goals', teamGoals)}
          </>
        );
      }}
    </CompLayout>
  );
};

export default CompGoals;
