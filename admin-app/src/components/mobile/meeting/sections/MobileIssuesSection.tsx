/**
 * MobileIssuesSection — v2 mirror of the desktop Issues / IDS section.
 *
 * Wires the SAME services the desktop uses so behaviour + realtime match:
 *   - useSimpleIssues  → issue list + updateIssue / archiveIssue (carries its
 *                        own realtime, so solve/move/archive sync cross-device)
 *   - useVoting        → per-row cast/remove with the 5-votes-per-user cap
 *   - useVotingContext → the "x/5 votes used" counter (realtime-synced)
 *
 * Interactions: vote stack (sorted by votes desc), swipe-right → "Solve
 * without a task?" → mark resolved, swipe-left → move short/long term, 3-dot
 * sheet (move term / archive), short/long tabs.
 *
 * Deferred (documented follow-ups, not yet wired): Order-mode drag-to-reorder
 * and create-task-from-issue. Issue + task creation remain on the meeting FAB.
 */
import React, { useMemo, useRef, useState } from 'react';
import { ArrowUp, Check, MoreVertical } from 'lucide-react';
import { useSimpleIssues, Issue } from '@/hooks/useSimpleIssues';
import { useVoting } from '@/hooks/voting/useVoting';
import { useVotingContext } from '@/contexts/VotingContext';
import { useProfilesByIds } from '@/hooks/useProfilesByIds';
import { cn } from '@/lib/utils';
import { MobileSectionShell, MobileAvatar } from './MobileSectionPrimitives';

type IssueType = 'short_term' | 'long_term';

interface MobileIssuesSectionProps {
  teamId: string;
  meetingTeamId?: string | null;
  eyebrow?: React.ReactNode;
  onCreateTaskFromIssue?: (data: {
    title: string;
    description: string;
    sourceIssueId?: string;
    ownerId?: string;
  }) => void;
}

export const MobileIssuesSection: React.FC<MobileIssuesSectionProps> = ({
  teamId,
  meetingTeamId,
  eyebrow,
  onCreateTaskFromIssue,
}) => {
  const effectiveTeamId = meetingTeamId !== undefined ? meetingTeamId : teamId;
  const { issues, loading, updateIssue, archiveIssue } = useSimpleIssues(effectiveTeamId || undefined);

  const [tab, setTab] = useState<IssueType>('short_term');
  const [solvedThisSession, setSolvedThisSession] = useState(0);
  const [solveTarget, setSolveTarget] = useState<Issue | null>(null);
  const [menuTarget, setMenuTarget] = useState<Issue | null>(null);

  const openIssues = useMemo(
    () => issues.filter((i) => !i.archived && i.status !== 'resolved'),
    [issues],
  );
  const shortList = useMemo(
    () =>
      openIssues
        .filter((i) => i.issue_type === 'short_term')
        .sort((a, b) => (b.vote_count ?? 0) - (a.vote_count ?? 0)),
    [openIssues],
  );
  const longList = useMemo(
    () =>
      openIssues
        .filter((i) => i.issue_type === 'long_term')
        .sort((a, b) => (b.vote_count ?? 0) - (a.vote_count ?? 0)),
    [openIssues],
  );
  const list = tab === 'short_term' ? shortList : longList;

  const ownerIds = useMemo(() => openIssues.map((i) => i.owner_id || i.created_by), [openIssues]);
  const { getProfile } = useProfilesByIds(ownerIds);

  const { votesUsed, voteLimit } = useVotingContext();
  const atCap = votesUsed >= voteLimit;

  const handleSolve = async (issue: Issue) => {
    setSolveTarget(null);
    try {
      await updateIssue(issue.id, { status: 'resolved' });
      setSolvedThisSession((n) => n + 1);
    } catch {
      /* useSimpleIssues surfaces its own errors */
    }
  };

  const handleMoveTerm = async (issue: Issue) => {
    const next: IssueType = issue.issue_type === 'short_term' ? 'long_term' : 'short_term';
    await updateIssue(issue.id, { issue_type: next });
  };

  const handleArchive = async (issue: Issue) => {
    setMenuTarget(null);
    await archiveIssue(issue.id);
  };

  const handleCreateTask = (issue: Issue) => {
    setMenuTarget(null);
    setSolveTarget(null);
    onCreateTaskFromIssue?.({
      title: issue.title,
      description: issue.description || '',
      sourceIssueId: issue.id,
      ownerId: issue.owner_id || issue.created_by,
    });
  };

  const stats = [
    { v: String(solvedThisSession), l: 'solved' },
    { v: String(shortList.length), l: 'short' },
    { v: String(longList.length), l: 'long' },
  ];

  return (
    <MobileSectionShell eyebrow={eyebrow} title="IDS." sub="Identify · Discuss · Solve">
      {/* votes-used counter */}
      <div className="flex items-center justify-end mb-3">
        <span className="text-[10.5px] text-muted-foreground tabular-nums">
          <span className={cn('font-bold', atCap ? 'text-warning' : 'text-foreground')}>
            {votesUsed}/{voteLimit}
          </span>{' '}
          votes used
        </span>
      </div>

      {/* stats strip */}
      <div className="grid grid-cols-3 gap-2 mb-3.5">
        {stats.map((s) => (
          <div key={s.l} className="bg-card border border-border rounded-xl px-3 py-2.5">
            <div className="text-[18px] font-semibold text-foreground leading-none tabular-nums tracking-[-0.02em]">
              {s.v}
            </div>
            <div className="text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground mt-1.5">
              {s.l}
            </div>
          </div>
        ))}
      </div>

      {/* short / long tabs */}
      <div className="flex items-center gap-1.5 mb-2.5">
        {([
          { id: 'short_term' as const, label: 'Short', n: shortList.length },
          { id: 'long_term' as const, label: 'Long', n: longList.length },
        ]).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors',
              tab === t.id
                ? 'bg-primary/10 text-primary border-primary/30'
                : 'text-muted-foreground border-transparent',
            )}
          >
            {t.label} ({t.n})
          </button>
        ))}
      </div>

      {/* rows */}
      {loading && openIssues.length === 0 ? (
        <div className="text-center py-8 text-[12.5px] text-muted-foreground">Loading issues…</div>
      ) : list.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-xl py-5 text-center text-[12.5px] text-muted-foreground">
          No {tab === 'short_term' ? 'short-term' : 'long-term'} issues right now.
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {list.map((issue) => {
            const profile = getProfile(issue.owner_id || issue.created_by);
            return (
              <MobileIssueRow
                key={issue.id}
                issue={issue}
                teamId={effectiveTeamId || ''}
                ownerName={profile?.full_name || profile?.email || 'Unassigned'}
                atCap={atCap}
                swipeLeftLabel={tab === 'short_term' ? '→ Long' : '→ Short'}
                onSwipeSolve={() => setSolveTarget(issue)}
                onSwipeMove={() => handleMoveTerm(issue)}
                onOpenMenu={() => setMenuTarget(issue)}
              />
            );
          })}
        </div>
      )}

      {/* 3-dot action sheet */}
      {menuTarget && (
        <div
          className="fixed inset-0 z-[60] bg-black/45 flex items-end"
          onClick={() => setMenuTarget(null)}
        >
          <div
            className="w-full bg-card rounded-t-[18px] pb-3 shadow-[0_-16px_40px_rgba(0,0,0,0.18)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-2.5 pb-1.5">
              <div className="w-8 h-1 rounded-full bg-muted-foreground/30" />
            </div>
            <div className="px-[18px] pb-3 border-b border-border">
              <div className="text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground">
                Issue actions
              </div>
              <div className="text-[13px] font-semibold text-foreground mt-0.5 leading-snug">
                {menuTarget.title}
              </div>
            </div>
            <div className="px-2.5 py-2">
              {onCreateTaskFromIssue && (
                <button
                  type="button"
                  onClick={() => menuTarget && handleCreateTask(menuTarget)}
                  className="block w-full text-left px-2.5 py-3 rounded-lg text-[13.5px] font-semibold text-primary active:bg-primary/10"
                >
                  Create task
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  const t = menuTarget;
                  setMenuTarget(null);
                  if (t) handleMoveTerm(t);
                }}
                className="block w-full text-left px-2.5 py-3 rounded-lg text-[13.5px] font-medium text-foreground active:bg-muted"
              >
                {menuTarget.issue_type === 'short_term' ? 'Move to long-term' : 'Move to short-term'}
              </button>
              <button
                type="button"
                onClick={() => menuTarget && handleArchive(menuTarget)}
                className="block w-full text-left px-2.5 py-3 rounded-lg text-[13.5px] font-medium text-destructive active:bg-destructive/10"
              >
                Archive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* solve modal */}
      {solveTarget && (
        <div
          className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center px-[18px]"
          onClick={() => setSolveTarget(null)}
        >
          <div
            className="w-full max-w-[320px] bg-card rounded-2xl p-5 shadow-[0_24px_60px_rgba(0,0,0,0.3)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-[15px] font-bold text-foreground tracking-[-0.01em]">
              Solve without a task?
            </div>
            <div className="text-[12.5px] text-muted-foreground mt-1.5 leading-[1.5]">
              No task has been created for &ldquo;{solveTarget.title}&rdquo;. Mark it solved?
            </div>
            <div className="flex flex-col gap-1.5 mt-3.5">
              <button
                type="button"
                onClick={() => solveTarget && handleSolve(solveTarget)}
                className="w-full py-2.5 rounded-[10px] bg-foreground text-background text-[12.5px] font-semibold active:scale-[0.98] transition-transform"
              >
                Yes, solve it
              </button>
              {onCreateTaskFromIssue && (
                <button
                  type="button"
                  onClick={() => solveTarget && handleCreateTask(solveTarget)}
                  className="w-full py-2.5 rounded-[10px] bg-muted text-foreground text-[12.5px] font-semibold active:scale-[0.98] transition-transform"
                >
                  Create task
                </button>
              )}
              <button
                type="button"
                onClick={() => setSolveTarget(null)}
                className="w-full py-2.5 rounded-[10px] text-muted-foreground text-[12.5px] font-semibold active:bg-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </MobileSectionShell>
  );
};

interface MobileIssueRowProps {
  issue: Issue;
  teamId: string;
  ownerName: string;
  atCap: boolean;
  swipeLeftLabel: string;
  onSwipeSolve: () => void;
  onSwipeMove: () => void;
  onOpenMenu: () => void;
}

const SWIPE_THRESHOLD = 60;

const MobileIssueRow: React.FC<MobileIssueRowProps> = ({
  issue,
  teamId,
  ownerName,
  atCap,
  swipeLeftLabel,
  onSwipeSolve,
  onSwipeMove,
  onOpenMenu,
}) => {
  const { voteCount, userVotes, castVote, removeVote } = useVoting(
    issue.id,
    teamId,
    undefined,
    issue.vote_count,
  );
  const myVotes = userVotes.upvotes ?? 0;

  const [dx, setDx] = useState(0);
  const startX = useRef<number | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('[data-no-swipe]')) return;
    startX.current = e.clientX;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (startX.current == null) return;
    setDx(Math.max(-160, Math.min(160, e.clientX - startX.current)));
  };
  const onPointerUp = () => {
    if (startX.current == null) return;
    if (dx > SWIPE_THRESHOLD) onSwipeSolve();
    else if (dx < -SWIPE_THRESHOLD) onSwipeMove();
    setDx(0);
    startX.current = null;
  };

  const intensity = Math.min(1, Math.abs(dx) / SWIPE_THRESHOLD);
  const showSolve = dx > 0;

  return (
    <div className="relative rounded-xl overflow-hidden">
      {/* swipe reveal */}
      <div
        className={cn(
          'absolute inset-0 rounded-xl flex items-center px-4',
          showSolve ? 'bg-success/15 justify-start' : 'bg-primary/10 justify-end',
        )}
        style={{ opacity: intensity }}
        aria-hidden="true"
      >
        {showSolve ? (
          <span className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-success">
            <Check className="h-3 w-3" strokeWidth={2.8} /> Solve
          </span>
        ) : (
          <span className="text-[11.5px] font-bold text-primary">{swipeLeftLabel}</span>
        )}
      </div>

      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative bg-card border border-border rounded-xl p-2.5 flex items-center gap-2.5 select-none"
        style={{
          transform: `translateX(${dx}px)`,
          transition: dx === 0 ? 'transform .2s cubic-bezier(.34,1.56,.64,1)' : 'none',
          touchAction: 'pan-y',
        }}
      >
        <MobileAvatar name={ownerName} colorKey={issue.owner_id || issue.created_by} size={26} />

        <div className="flex-1 min-w-0">
          <div className="text-[12.5px] font-medium text-foreground leading-[1.35]">
            {issue.title}
          </div>
          <div className="text-[10.5px] text-muted-foreground mt-0.5 truncate">{ownerName}</div>
        </div>

        {/* vote stack */}
        <div
          data-no-swipe
          onPointerDown={(e) => e.stopPropagation()}
          className="flex flex-col items-center bg-muted/50 border border-border rounded-lg px-0.5 shrink-0"
        >
          <button
            type="button"
            aria-label="Vote"
            disabled={atCap}
            onClick={() => castVote(1)}
            className="w-[26px] h-5 flex items-center justify-center disabled:opacity-40"
          >
            <ArrowUp
              className={cn('h-3 w-3', myVotes > 0 ? 'text-primary' : 'text-foreground/70')}
              strokeWidth={2.6}
            />
          </button>
          <span
            className={cn(
              'text-[11px] font-bold leading-none tabular-nums',
              myVotes > 0 ? 'text-primary' : 'text-foreground',
            )}
          >
            {voteCount}
          </span>
          <button
            type="button"
            aria-label="Remove vote"
            disabled={myVotes <= 0}
            onClick={() => removeVote(1)}
            className="w-[26px] h-5 flex items-center justify-center disabled:opacity-30"
          >
            <ArrowUp className="h-3 w-3 text-foreground/70 rotate-180" strokeWidth={2.6} />
          </button>
        </div>

        {/* 3-dot menu */}
        <button
          type="button"
          data-no-swipe
          aria-label="Issue actions"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onOpenMenu}
          className="w-6 h-6 flex items-center justify-center shrink-0 text-muted-foreground"
        >
          <MoreVertical className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

export default MobileIssuesSection;
