import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight, Plus, Filter, GripVertical } from 'lucide-react';
import { LinearLayout, LoadingSkeleton, FooterHint } from './LinearLayout';
import { useGoals, useTeams, formatDate, Goal } from './usePrototypeData';

type GoalStatus = 'on_track' | 'off_track' | 'complete' | 'canceled';

const STATUS_DOT: Record<string, string> = {
  on_track: 'bg-emerald-500',
  off_track: 'bg-destructive',
  complete: 'bg-[#5c84fe]',
  canceled: 'bg-gray-500',
  completed: 'bg-[#5c84fe]',
};

const STATUS_LABEL: Record<string, string> = {
  on_track: 'On Track',
  off_track: 'Off Track',
  complete: 'Complete',
  canceled: 'Canceled',
  completed: 'Complete',
};

const ALL_STATUSES: GoalStatus[] = ['on_track', 'off_track', 'complete', 'canceled'];

const StatusDropdown: React.FC<{
  status: string;
  theme: any;
}> = ({ status, theme: t }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(!open); }}
        className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-[4px] transition-colors"
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = t.hover)}
        onMouseLeave={e => { if (!open) e.currentTarget.style.backgroundColor = 'transparent'; }}
        style={open ? { backgroundColor: t.hover } : {}}
      >
        <span className={`w-2 h-2 rounded-full ${STATUS_DOT[status] || 'bg-gray-400'}`} />
        <span className="text-[11px]" style={{ color: t.textSecondary }}>{STATUS_LABEL[status] || status}</span>
        <ChevronDown size={10} style={{ color: t.textMuted }} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 w-[130px] rounded-[6px] border py-1 z-20" style={{ borderColor: t.border, backgroundColor: t.cardBg, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
          {ALL_STATUSES.map(s => (
            <div
              key={s}
              className="flex items-center gap-2 px-3 py-1.5 text-[12px] transition-colors text-left"
              style={{ color: s === status ? t.textPrimary : t.textSecondary }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = t.hover)}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <span className={`w-2 h-2 rounded-full ${STATUS_DOT[s]}`} />
              {STATUS_LABEL[s]}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const LinearGoals: React.FC = () => {
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
    <LinearLayout activeLabel="Goals" searchPlaceholder="Search goals...">
      {({ t, theme }) => {
        if (loading) return <LoadingSkeleton t={t} rows={8} />;

        const renderGoalRow = (goal: Goal, i: number, list: Goal[]) => {
          const isExpanded = expandedGoal === goal.id;
          return (
            <div key={goal.id}>
              <div
                onClick={() => setExpandedGoal(isExpanded ? null : goal.id)}
                className={`grid grid-cols-[20px_1fr_100px_110px_90px_140px] gap-2 px-4 py-3 items-center transition-colors cursor-pointer group ${i < list.length - 1 || isExpanded ? 'border-b' : ''}`}
                style={{ borderColor: t.border }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = t.hover)}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <GripVertical size={12} style={{ color: t.border }} />
                <div className="flex items-center gap-2.5 min-w-0">
                  {isExpanded ? <ChevronDown size={13} className="flex-shrink-0" style={{ color: t.textMuted }} /> : <ChevronRight size={13} className="flex-shrink-0" style={{ color: t.textMuted }} />}
                  <span className={`truncate ${goal.status === 'complete' || goal.status === 'canceled' ? 'line-through' : ''}`} style={{ color: goal.status === 'complete' || goal.status === 'canceled' ? t.textMuted : t.textPrimary }}>
                    {goal.title}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] flex-shrink-0" style={{ backgroundColor: t.avatarBg, color: t.accent }}>{goal.owner_initials}</div>
                  <span className="text-[12px] truncate" style={{ color: t.textMuted }}>{(goal.owner_name || '').split(' ')[0]}</span>
                </div>
                <StatusDropdown status={goal.status} theme={t} />
                <span className="text-[12px]" style={{ color: t.textMuted }}>{formatDate(goal.target_date)}</span>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: t.border }}>
                    <div
                      className={`h-full rounded-full transition-all ${
                        goal.status === 'off_track' ? 'bg-destructive/60' :
                        goal.status === 'canceled' ? 'bg-gray-500/60' :
                        goal.status === 'complete' ? 'bg-[#5c84fe]' :
                        'bg-emerald-500/60'
                      }`}
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>
                  <span className="text-[11px] w-8 text-right font-mono" style={{ color: t.textMuted }}>{goal.progress}%</span>
                </div>
              </div>
              {isExpanded && (
                <div className={`px-4 py-4 pl-12 ${i < list.length - 1 ? 'border-b' : ''}`} style={{ backgroundColor: t.active, borderColor: t.border }}>
                  <p className="text-[12px] mb-4 max-w-[600px]" style={{ color: t.textSecondary }}>{goal.description || 'No description'}</p>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px]" style={{ color: t.textMuted }}>Team: {goal.team_name}</span>
                    <span style={{ color: t.border }}>·</span>
                    <span className="text-[11px]" style={{ color: t.textMuted }}>Owner: {goal.owner_name}</span>
                    <span style={{ color: t.border }}>·</span>
                    <span className="text-[11px]" style={{ color: t.textMuted }}>Target: {formatDate(goal.target_date)}</span>
                  </div>
                </div>
              )}
            </div>
          );
        };

        const renderGoalSection = (title: string, goalsList: Goal[]) => (
          <div className="mb-6">
            <h2 className="text-[14px] font-semibold tracking-[-0.01em] mb-2" style={{ color: t.textPrimary }}>{title}</h2>
            <div className="rounded-[6px] border overflow-hidden" style={{ borderColor: t.border }}>
              <div className="grid grid-cols-[20px_1fr_100px_110px_90px_140px] gap-2 px-4 py-2 text-[11px] uppercase tracking-[0.06em] font-medium border-b" style={{ backgroundColor: t.cardBg, borderColor: t.border, color: t.textMuted }}>
                <span />
                <span>Goal</span>
                <span>Owner</span>
                <span>Status</span>
                <span>Target</span>
                <span>Progress</span>
              </div>
              {goalsList.length === 0 ? (
                <div className="px-4 py-6 text-center text-[12px]" style={{ color: t.textMuted }}>No goals in this section</div>
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
                <h1 className="text-[22px] font-semibold tracking-[-0.03em] mb-1" style={{ color: t.textPrimary }}>Goals</h1>
                <p className="text-[13px]" style={{ color: t.textMuted }}>{goals.length} goals · {avgProgress}% avg progress</p>
              </div>
              <div className="relative">
                <button onClick={() => setTeamDropdownOpen(!teamDropdownOpen)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-[5px] border bg-transparent text-[12px]" style={{ borderColor: t.border, color: t.textSecondary }}>
                  {teamFilter}
                  <ChevronDown size={12} />
                </button>
                {teamDropdownOpen && (
                  <div className="absolute right-0 top-full mt-1 w-[180px] rounded-[6px] border py-1 z-10" style={{ borderColor: t.border, backgroundColor: t.cardBg }}>
                    {teamNames.map(team => (
                      <button key={team} onClick={() => { setTeamFilter(team); setTeamDropdownOpen(false); }} className="w-full text-left px-3 py-1.5 text-[12px] transition-colors" style={{ color: teamFilter === team ? t.textPrimary : t.textSecondary }} onMouseEnter={e => (e.currentTarget.style.backgroundColor = t.hover)} onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                        {team}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── Summary cards ── */}
            <div className="grid grid-cols-5 gap-px mb-6 rounded-[6px] overflow-hidden border" style={{ borderColor: t.border }}>
              <div className="px-4 py-3" style={{ backgroundColor: t.cardBg }}>
                <div className="text-[11px] uppercase tracking-[0.06em] font-medium mb-1" style={{ color: t.textMuted }}>On Track</div>
                <span className="text-[24px] font-semibold tracking-[-0.04em] text-emerald-400">{onTrack}</span>
              </div>
              <div className="px-4 py-3" style={{ backgroundColor: t.cardBg }}>
                <div className="text-[11px] uppercase tracking-[0.06em] font-medium mb-1" style={{ color: t.textMuted }}>Off Track</div>
                <span className="text-[24px] font-semibold tracking-[-0.04em] text-red-400">{offTrack}</span>
              </div>
              <div className="px-4 py-3" style={{ backgroundColor: t.cardBg }}>
                <div className="text-[11px] uppercase tracking-[0.06em] font-medium mb-1" style={{ color: t.textMuted }}>Complete</div>
                <span className="text-[24px] font-semibold tracking-[-0.04em]" style={{ color: t.accent }}>{complete}</span>
              </div>
              <div className="px-4 py-3" style={{ backgroundColor: t.cardBg }}>
                <div className="text-[11px] uppercase tracking-[0.06em] font-medium mb-1" style={{ color: t.textMuted }}>Canceled</div>
                <span className="text-[24px] font-semibold tracking-[-0.04em] text-muted-foreground">{canceled}</span>
              </div>
              <div className="px-4 py-3" style={{ backgroundColor: t.cardBg }}>
                <div className="text-[11px] uppercase tracking-[0.06em] font-medium mb-1" style={{ color: t.textMuted }}>Avg Progress</div>
                <span className="text-[24px] font-semibold tracking-[-0.04em]" style={{ color: t.textPrimary }}>{avgProgress}%</span>
              </div>
            </div>

            {renderGoalSection('Company Goals', companyGoals)}
            {renderGoalSection('Team Goals', teamGoals)}

            <FooterHint t={t} />
          </>
        );
      }}
    </LinearLayout>
  );
};

export default LinearGoals;
