import React, { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { CompLayout, CompLoadingSkeleton } from './CompLayout';
import { useTasks, useTeams, formatDate } from './usePrototypeData';

const TYPE_TABS = ['All', 'Personal', 'Team'] as const;

const CompTasks: React.FC = () => {
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
    <CompLayout activeLabel="Tasks" searchPlaceholder="Search tasks...">
      {({ t }) => {
        if (loading) return <CompLoadingSkeleton t={t} rows={10} />;

        return (
          <>
            {/* ── Page heading + controls ── */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-[24px] font-semibold tracking-[-0.02em] mb-1" style={{ color: t.textPrimary }}>
                  Tasks
                </h1>
                <p className="text-[14px]" style={{ color: t.textMuted }}>{filteredTasks.length} tasks</p>
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

            {/* ── Type filter tabs ── */}
            <div className="flex items-center gap-1 mb-5 p-1 rounded-[8px] w-fit" style={{ backgroundColor: t.surfaceSecondary }}>
              {TYPE_TABS.map(tab => {
                const isActive = typeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setTypeTab(tab)}
                    className="px-4 py-1.5 rounded-[6px] text-[14px] font-medium transition-colors"
                    style={{
                      backgroundColor: isActive ? t.cardBg : 'transparent',
                      color: isActive ? t.textPrimary : t.textMuted,
                      boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                    }}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>

            {/* ── Task list ── */}
            <div className="rounded-[12px] border overflow-hidden" style={{ borderColor: t.border, backgroundColor: t.cardBg }}>
              <div
                className="grid grid-cols-[28px_1fr_120px_80px_90px] gap-3 px-5 py-3 text-[12px] uppercase tracking-[0.05em] font-medium border-b"
                style={{ backgroundColor: t.surfaceSecondary, borderColor: t.divider, color: t.textMuted }}
              >
                <span />
                <span>Task</span>
                <span>Team</span>
                <span>Due</span>
                <span>Type</span>
              </div>

              {filteredTasks.length === 0 && (
                <div className="px-5 py-10 text-center text-[14px]" style={{ color: t.textMuted }}>No tasks found.</div>
              )}

              {filteredTasks.map((task, i) => {
                const isDone = task.status === 'done' || task.status === 'completed';
                return (
                  <div
                    key={task.id}
                    className={`grid grid-cols-[28px_1fr_120px_80px_90px] gap-3 px-5 py-3 items-center transition-colors cursor-pointer ${i < filteredTasks.length - 1 ? 'border-b' : ''}`}
                    style={{ borderColor: t.divider }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = t.hover)}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <div
                      className="w-[18px] h-[18px] rounded-[4px] border-2 flex items-center justify-center flex-shrink-0"
                      style={
                        isDone
                          ? { borderColor: t.success, backgroundColor: t.success }
                          : { borderColor: t.border }
                      }
                    >
                      {isDone && <Check size={11} className="text-white" />}
                    </div>
                    <span
                      className={`truncate text-[14px] ${isDone ? 'line-through' : ''}`}
                      style={{ color: isDone ? t.textMuted : t.textPrimary }}
                    >
                      {task.title}
                    </span>
                    <span className="text-[13px] truncate" style={{ color: t.textMuted }}>{task.team_name || '—'}</span>
                    <span className="text-[13px]" style={{ color: t.textMuted }}>{formatDate(task.due_date)}</span>
                    <span
                      className="px-2.5 py-1 rounded-[9999px] text-[11px] font-medium text-center"
                      style={{ backgroundColor: t.accentBg, color: t.accentDark }}
                    >
                      {task.task_type}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        );
      }}
    </CompLayout>
  );
};

export default CompTasks;
