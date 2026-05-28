import React, { useState } from 'react';
import { ChevronDown, Clock, Calendar } from 'lucide-react';
import { LinearLayout, LoadingSkeleton, FooterHint } from './LinearLayout';
import { useMeetings, useTeams, formatDateTime } from './usePrototypeData';

const TYPE_COLORS: Record<string, string> = {
  standup: 'bg-primary/20 text-blue-400',
  '1on1': 'bg-purple-500/20 text-purple-400',
  team_sync: 'bg-emerald-500/20 text-emerald-400',
  board_review: 'bg-amber-500/20 text-amber-400',
  planning: 'bg-cyan-500/20 text-cyan-400',
  retrospective: 'bg-pink-500/20 text-pink-400',
  l10: 'bg-indigo-500/20 text-indigo-400',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  completed: 'Completed',
  cancelled: 'Canceled',
  scheduled: 'Scheduled',
};

const LinearMeetings: React.FC = () => {
  const { meetings, loading: meetingsLoading } = useMeetings();
  const { teams, loading: teamsLoading } = useTeams();
  const [teamFilter, setTeamFilter] = useState('All Teams');
  const [teamDropdownOpen, setTeamDropdownOpen] = useState(false);
  const [tab, setTab] = useState<'all' | 'active' | 'completed'>('all');

  const loading = meetingsLoading || teamsLoading;
  const teamNames = ['All Teams', ...teams.map(t => t.name)];

  const filteredMeetings = meetings.filter(m => {
    if (teamFilter !== 'All Teams' && m.team_name !== teamFilter) return false;
    if (tab === 'active' && m.status !== 'active') return false;
    if (tab === 'completed' && m.status !== 'completed') return false;
    return true;
  });

  const activeMeetings = meetings.filter(m => m.status === 'active');
  const completedMeetings = meetings.filter(m => m.status === 'completed');

  const getDuration = (start: string, end: string | null) => {
    if (!end) return 'In progress';
    const ms = new Date(end).getTime() - new Date(start).getTime();
    const mins = Math.round(ms / 60000);
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  return (
    <LinearLayout activeLabel="Meetings" searchPlaceholder="Search meetings...">
      {({ t, theme }) => {
        if (loading) return <LoadingSkeleton t={t} rows={8} />;

        return (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-[22px] font-semibold tracking-[-0.03em] mb-1" style={{ color: t.textPrimary }}>Meetings</h1>
                <p className="text-[13px]" style={{ color: t.textMuted }}>
                  {activeMeetings.length} active · {completedMeetings.length} completed · {meetings.length} total
                </p>
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
            <div className="grid grid-cols-3 gap-px mb-6 rounded-[6px] overflow-hidden border" style={{ borderColor: t.border }}>
              <div className="px-4 py-3" style={{ backgroundColor: t.cardBg }}>
                <div className="text-[11px] uppercase tracking-[0.06em] font-medium mb-1" style={{ color: t.textMuted }}>Active Now</div>
                <span className="text-[24px] font-semibold tracking-[-0.04em] text-emerald-400">{activeMeetings.length}</span>
              </div>
              <div className="px-4 py-3" style={{ backgroundColor: t.cardBg }}>
                <div className="text-[11px] uppercase tracking-[0.06em] font-medium mb-1" style={{ color: t.textMuted }}>Completed</div>
                <span className="text-[24px] font-semibold tracking-[-0.04em]" style={{ color: t.accent }}>{completedMeetings.length}</span>
              </div>
              <div className="px-4 py-3" style={{ backgroundColor: t.cardBg }}>
                <div className="text-[11px] uppercase tracking-[0.06em] font-medium mb-1" style={{ color: t.textMuted }}>Total</div>
                <span className="text-[24px] font-semibold tracking-[-0.04em]" style={{ color: t.textPrimary }}>{meetings.length}</span>
              </div>
            </div>

            {/* ── Tab filter ── */}
            <div className="flex items-center gap-1 mb-4">
              {[{ label: 'All', value: 'all' as const }, { label: 'Active', value: 'active' as const }, { label: 'Completed', value: 'completed' as const }].map(tabItem => {
                const isActive = tab === tabItem.value;
                return (
                  <button key={tabItem.value} onClick={() => setTab(tabItem.value)} className="px-3 py-1.5 rounded-[5px] text-[12px] font-medium transition-colors" style={{ backgroundColor: isActive ? t.active : 'transparent', color: isActive ? t.textPrimary : t.textMuted }} onMouseEnter={e => { if (!isActive) e.currentTarget.style.backgroundColor = t.hover; }} onMouseLeave={e => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}>
                    {tabItem.label}
                  </button>
                );
              })}
            </div>

            {/* ── Meetings list ── */}
            <div className="rounded-[6px] border overflow-hidden" style={{ borderColor: t.border }}>
              <div className="grid grid-cols-[1fr_120px_100px_100px_90px] gap-2 px-4 py-2 text-[11px] uppercase tracking-[0.06em] font-medium border-b" style={{ backgroundColor: t.cardBg, borderColor: t.border, color: t.textMuted }}>
                <span>Meeting</span>
                <span>Team</span>
                <span>Type</span>
                <span>Duration</span>
                <span>Status</span>
              </div>

              {filteredMeetings.length === 0 && (
                <div className="px-4 py-8 text-center text-[13px]" style={{ color: t.textMuted }}>No meetings found.</div>
              )}

              {filteredMeetings.map((meeting, i) => (
                <div
                  key={meeting.id}
                  className={`grid grid-cols-[1fr_120px_100px_100px_90px] gap-2 px-4 py-3 items-center transition-colors cursor-pointer ${i < filteredMeetings.length - 1 ? 'border-b' : ''}`}
                  style={{ borderColor: t.border }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = t.hover)}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div className="min-w-0">
                    <div className="text-[13px] truncate" style={{ color: t.textPrimary }}>
                      {meeting.meeting_title || meeting.meeting_type || 'Untitled Meeting'}
                    </div>
                    <div className="text-[11px] mt-0.5 flex items-center gap-1" style={{ color: t.textMuted }}>
                      <Calendar size={10} />
                      {formatDateTime(meeting.started_at)}
                      {meeting.started_by_name && <> · {meeting.started_by_name}</>}
                    </div>
                  </div>
                  <span className="text-[12px] truncate" style={{ color: t.textMuted }}>{meeting.team_name || '—'}</span>
                  <span className={`px-1.5 py-0.5 rounded-[2px] text-[10px] text-center ${TYPE_COLORS[meeting.meeting_type || ''] || 'bg-gray-500/20 text-muted-foreground'}`}>
                    {(meeting.meeting_type || 'unknown').replace(/_/g, ' ')}
                  </span>
                  <span className="text-[12px] flex items-center gap-1" style={{ color: t.textMuted }}>
                    <Clock size={10} />
                    {getDuration(meeting.started_at, meeting.ended_at)}
                  </span>
                  <span className={`text-[11px] ${meeting.status === 'active' ? 'text-emerald-400' : meeting.status === 'completed' ? 'text-blue-400' : 'text-muted-foreground'}`}>
                    {meeting.status === 'active' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse" />}
                    {STATUS_LABELS[meeting.status] || meeting.status}
                  </span>
                </div>
              ))}
            </div>

            <FooterHint t={t} />
          </>
        );
      }}
    </LinearLayout>
  );
};

export default LinearMeetings;
