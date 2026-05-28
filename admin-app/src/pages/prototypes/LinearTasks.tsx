import React, { useState } from 'react';
import { ChevronDown, Check, Plus, Filter } from 'lucide-react';
import { LinearLayout, LoadingSkeleton, FooterHint } from './LinearLayout';
import { useTasks, useTeams, formatDate } from './usePrototypeData';

const TYPE_TABS = ['All', 'Personal', 'Team'] as const;

const LinearTasks: React.FC = () => {
  const { tasks, loading: tasksLoading } = useTasks();
  const { teams, loading: teamsLoading } = useTeams();
  const [teamFilter, setTeamFilter] = useState('All Teams');
  const [teamDropdownOpen, setTeamDropdownOpen] = useState(false);
  const [typeTab, setTypeTab] = useState<'All' | 'Personal' | 'Team'>('All');

  const loading = tasksLoading || teamsLoading;
  const teamNames = ['All Teams', ...teams.map(t => t.name)];

  const filteredTasks = tasks.filter(tk => {
    if (teamFilter !== 'All Teams' && tk.team_name !== teamFilter) return false;
    if (typeTab === 'Personal' && tk.task_type !== 'personal') return false;
    if (typeTab === 'Team' && tk.task_type !== 'team') return false;
    return true;
  });

  return (
    <LinearLayout
      activeLabel="Tasks"
      searchPlaceholder="Search tasks..."
      headerActions={
        <>
          <button className="flex items-center gap-1.5 text-[12px] px-2 py-1 rounded-[4px]" style={{ color: 'var(--text-secondary)' }}>
            <Plus size={14} />
            <span>Add Task</span>
          </button>
          <button className="flex items-center gap-1.5 text-[12px] px-2 py-1 rounded-[4px]" style={{ color: 'var(--text-secondary)' }}>
            <Filter size={14} />
            <span>Filter</span>
          </button>
        </>
      }
    >
      {({ t, theme }) => {
        if (loading) return <LoadingSkeleton t={t} rows={10} />;

        return (
          <>
            {/* ── Page heading + controls ── */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-[22px] font-semibold tracking-[-0.03em] mb-1" style={{ color: t.textPrimary }}>Tasks</h1>
                <p className="text-[13px]" style={{ color: t.textMuted }}>{filteredTasks.length} tasks</p>
              </div>
              <div className="relative">
                <button
                  onClick={() => setTeamDropdownOpen(!teamDropdownOpen)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[5px] border bg-transparent text-[12px] transition-colors"
                  style={{ borderColor: t.border, color: t.textSecondary }}
                >
                  {teamFilter}
                  <ChevronDown size={12} />
                </button>
                {teamDropdownOpen && (
                  <div className="absolute right-0 top-full mt-1 w-[180px] rounded-[6px] border py-1 z-10" style={{ borderColor: t.border, backgroundColor: t.cardBg }}>
                    {teamNames.map(team => (
                      <button
                        key={team}
                        onClick={() => { setTeamFilter(team); setTeamDropdownOpen(false); }}
                        className="w-full text-left px-3 py-1.5 text-[12px] transition-colors"
                        style={{ color: teamFilter === team ? t.textPrimary : t.textSecondary }}
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

            {/* ── Type filter tabs ── */}
            <div className="flex items-center gap-1 mb-4">
              {TYPE_TABS.map(tab => {
                const isActive = typeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setTypeTab(tab)}
                    className="px-3 py-1.5 rounded-[5px] text-[12px] font-medium transition-colors"
                    style={{
                      backgroundColor: isActive ? t.active : 'transparent',
                      color: isActive ? t.textPrimary : t.textMuted,
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.backgroundColor = t.hover; }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>

            {/* ── Task list ── */}
            <div className="rounded-[6px] border overflow-hidden" style={{ borderColor: t.border }}>
              <div className="grid grid-cols-[24px_1fr_110px_70px_80px] gap-2 px-4 py-2 text-[11px] uppercase tracking-[0.06em] font-medium border-b" style={{ backgroundColor: t.cardBg, borderColor: t.border, color: t.textMuted }}>
                <span />
                <span>Task</span>
                <span>Team</span>
                <span>Due</span>
                <span>Type</span>
              </div>

              {filteredTasks.length === 0 && (
                <div className="px-4 py-8 text-center text-[13px]" style={{ color: t.textMuted }}>No tasks found.</div>
              )}

              {filteredTasks.map((task, i) => {
                const isDone = task.status === 'done' || task.status === 'completed';
                return (
                  <div
                    key={task.id}
                    className={`grid grid-cols-[24px_1fr_110px_70px_80px] gap-2 px-4 py-2.5 items-center transition-colors cursor-pointer ${i < filteredTasks.length - 1 ? 'border-b' : ''}`}
                    style={{ borderColor: t.border }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = t.hover)}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <div
                      className={`w-4 h-4 rounded-[4px] border flex items-center justify-center flex-shrink-0 ${isDone ? 'bg-emerald-500/30 border-emerald-500/50' : ''}`}
                      style={!isDone ? { borderColor: t.border } : undefined}
                    >
                      {isDone && <Check size={10} className="text-emerald-400" />}
                    </div>
                    <span className={`truncate ${isDone ? 'line-through' : ''}`} style={{ color: isDone ? t.textMuted : t.textPrimary }}>
                      {task.title}
                    </span>
                    <span className="text-[12px] truncate" style={{ color: t.textMuted }}>{task.team_name || '—'}</span>
                    <span className="text-[12px]" style={{ color: t.textMuted }}>{formatDate(task.due_date)}</span>
                    <span
                      className="px-1.5 py-0.5 rounded-[2px] text-[10px] text-center"
                      style={{
                        backgroundColor: theme === 'dark' ? 'rgba(92,132,254,0.15)' : 'rgba(94,106,210,0.12)',
                        color: theme === 'dark' ? '#5c84fe' : '#5e6ad2',
                      }}
                    >
                      {task.task_type}
                    </span>
                  </div>
                );
              })}
            </div>

            <FooterHint t={t} />
          </>
        );
      }}
    </LinearLayout>
  );
};

export default LinearTasks;
