import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { LinearLayout, LoadingSkeleton, FooterHint } from './LinearLayout';
import { useIssues, useTeams, formatDate } from './usePrototypeData';

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-yellow-500',
  resolved: 'bg-emerald-500',
  closed: 'bg-gray-500',
};

const TYPE_LABEL: Record<string, string> = {
  short_term: 'Short Term',
  long_term: 'Long Term',
};

const LinearIssues: React.FC = () => {
  const { issues, loading: issuesLoading } = useIssues();
  const { teams, loading: teamsLoading } = useTeams();
  const [teamFilter, setTeamFilter] = useState('All Teams');
  const [teamDropdownOpen, setTeamDropdownOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'all' | 'short_term' | 'long_term'>('all');
  const [showSolved, setShowSolved] = useState(false);

  const loading = issuesLoading || teamsLoading;
  const teamNames = ['All Teams', ...teams.map(t => t.name)];

  const filteredIssues = issues.filter(issue => {
    if (teamFilter !== 'All Teams' && issue.team_name !== teamFilter) return false;
    if (typeFilter !== 'all' && issue.issue_type !== typeFilter) return false;
    if (!showSolved && (issue.status === 'resolved' || issue.status === 'closed')) return false;
    return true;
  });

  const openCount = issues.filter(i => i.status === 'open').length;
  const resolvedCount = issues.filter(i => i.status === 'resolved' || i.status === 'closed').length;
  const shortTermCount = issues.filter(i => i.issue_type === 'short_term' && i.status === 'open').length;
  const longTermCount = issues.filter(i => i.issue_type === 'long_term' && i.status === 'open').length;

  return (
    <LinearLayout activeLabel="Issues" searchPlaceholder="Search issues...">
      {({ t, theme }) => {
        if (loading) return <LoadingSkeleton t={t} rows={8} />;

        return (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-[22px] font-semibold tracking-[-0.03em] mb-1" style={{ color: t.textPrimary }}>Issues</h1>
                <p className="text-[13px]" style={{ color: t.textMuted }}>
                  {openCount} open · {resolvedCount} resolved
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-[12px] cursor-pointer" style={{ color: t.textSecondary }}>
                  <input type="checkbox" checked={showSolved} onChange={e => setShowSolved(e.target.checked)} className="accent-[#5c84fe]" />
                  Show solved
                </label>
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
            </div>

            {/* ── Summary cards ── */}
            <div className="grid grid-cols-4 gap-px mb-6 rounded-[6px] overflow-hidden border" style={{ borderColor: t.border }}>
              <div className="px-4 py-3" style={{ backgroundColor: t.cardBg }}>
                <div className="text-[11px] uppercase tracking-[0.06em] font-medium mb-1" style={{ color: t.textMuted }}>Open</div>
                <span className="text-[24px] font-semibold tracking-[-0.04em] text-yellow-400">{openCount}</span>
              </div>
              <div className="px-4 py-3" style={{ backgroundColor: t.cardBg }}>
                <div className="text-[11px] uppercase tracking-[0.06em] font-medium mb-1" style={{ color: t.textMuted }}>Short Term</div>
                <span className="text-[24px] font-semibold tracking-[-0.04em]" style={{ color: t.accent }}>{shortTermCount}</span>
              </div>
              <div className="px-4 py-3" style={{ backgroundColor: t.cardBg }}>
                <div className="text-[11px] uppercase tracking-[0.06em] font-medium mb-1" style={{ color: t.textMuted }}>Long Term</div>
                <span className="text-[24px] font-semibold tracking-[-0.04em]" style={{ color: t.textPrimary }}>{longTermCount}</span>
              </div>
              <div className="px-4 py-3" style={{ backgroundColor: t.cardBg }}>
                <div className="text-[11px] uppercase tracking-[0.06em] font-medium mb-1" style={{ color: t.textMuted }}>Resolved</div>
                <span className="text-[24px] font-semibold tracking-[-0.04em] text-emerald-400">{resolvedCount}</span>
              </div>
            </div>

            {/* ── Type filter tabs ── */}
            <div className="flex items-center gap-1 mb-4">
              {[{ label: 'All', value: 'all' as const }, { label: 'Short Term', value: 'short_term' as const }, { label: 'Long Term', value: 'long_term' as const }].map(tab => {
                const isActive = typeFilter === tab.value;
                return (
                  <button key={tab.value} onClick={() => setTypeFilter(tab.value)} className="px-3 py-1.5 rounded-[5px] text-[12px] font-medium transition-colors" style={{ backgroundColor: isActive ? t.active : 'transparent', color: isActive ? t.textPrimary : t.textMuted }} onMouseEnter={e => { if (!isActive) e.currentTarget.style.backgroundColor = t.hover; }} onMouseLeave={e => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}>
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* ── Issues list ── */}
            <div className="rounded-[6px] border overflow-hidden" style={{ borderColor: t.border }}>
              <div className="grid grid-cols-[8px_1fr_120px_100px_90px] gap-2 px-4 py-2 text-[11px] uppercase tracking-[0.06em] font-medium border-b" style={{ backgroundColor: t.cardBg, borderColor: t.border, color: t.textMuted }}>
                <span />
                <span>Issue</span>
                <span>Team</span>
                <span>Type</span>
                <span>Created</span>
              </div>

              {filteredIssues.length === 0 && (
                <div className="px-4 py-8 text-center text-[13px]" style={{ color: t.textMuted }}>No issues found.</div>
              )}

              {filteredIssues.map((issue, i) => {
                const isResolved = issue.status === 'resolved' || issue.status === 'closed';
                return (
                  <div
                    key={issue.id}
                    className={`grid grid-cols-[8px_1fr_120px_100px_90px] gap-2 px-4 py-3 items-center transition-colors cursor-pointer ${i < filteredIssues.length - 1 ? 'border-b' : ''}`}
                    style={{ borderColor: t.border }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = t.hover)}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_COLORS[issue.status || 'open'] || 'bg-gray-400'}`} />
                    <div className="min-w-0">
                      <div className={`text-[13px] truncate ${isResolved ? 'line-through' : ''}`} style={{ color: isResolved ? t.textMuted : t.textPrimary }}>
                        {issue.title}
                      </div>
                      {issue.description && (
                        <div className="text-[11px] truncate mt-0.5" style={{ color: t.textMuted }}>{issue.description}</div>
                      )}
                    </div>
                    <span className="text-[12px] truncate" style={{ color: t.textMuted }}>{issue.team_name || '—'}</span>
                    <span className="px-1.5 py-0.5 rounded-[2px] text-[10px] text-center" style={{
                      backgroundColor: theme === 'dark' ? 'rgba(92,132,254,0.15)' : 'rgba(94,106,210,0.12)',
                      color: theme === 'dark' ? '#5c84fe' : '#5e6ad2',
                    }}>
                      {TYPE_LABEL[issue.issue_type || ''] || issue.issue_type || '—'}
                    </span>
                    <span className="text-[12px]" style={{ color: t.textMuted }}>{formatDate(issue.created_at)}</span>
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

export default LinearIssues;
