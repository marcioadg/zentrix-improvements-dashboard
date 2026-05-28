/**
 * MobileReviewPriorQuarterSection — v2 mirror of the desktop
 * QuarterlyReviewPriorQuarterSection.
 *
 * Read-only review of the team's rocks: a status summary + outcomes list
 * (off-track first). Wires the same data hook (useTeamGoals). The desktop
 * scriber bulk actions (archive completed / create issues for off-track) are
 * deferred — they remain available on desktop.
 */
import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { useTeamGoals } from '@/hooks/useTeamGoals';
import { cn } from '@/lib/utils';
import { MobileSectionShell, SectionTitleAccent } from './MobileSectionPrimitives';

type GoalStatus = 'on_track' | 'off_track' | 'complete' | 'canceled';

const STATUS_META: Record<GoalStatus, { label: string; chip: string; bar: string; order: number }> = {
  off_track: { label: 'off track', chip: 'bg-destructive/10 text-destructive', bar: 'bg-destructive', order: 0 },
  on_track: { label: 'on track', chip: 'bg-success/10 text-success', bar: 'bg-success', order: 1 },
  complete: { label: 'complete', chip: 'bg-primary/10 text-primary', bar: 'bg-primary', order: 2 },
  canceled: { label: 'canceled', chip: 'bg-muted text-muted-foreground', bar: 'bg-muted-foreground/50', order: 3 },
};

interface MobileReviewPriorQuarterSectionProps {
  teamId: string;
  eyebrow?: React.ReactNode;
}

export const MobileReviewPriorQuarterSection: React.FC<MobileReviewPriorQuarterSectionProps> = ({
  teamId,
  eyebrow,
}) => {
  const { goals, loading } = useTeamGoals(teamId);

  const counts = useMemo(() => {
    const c = { on_track: 0, off_track: 0, complete: 0, canceled: 0 };
    goals.forEach((g) => {
      const s = (g.status as GoalStatus) ?? 'on_track';
      if (s in c) c[s] += 1;
    });
    return c;
  }, [goals]);

  const sorted = useMemo(
    () =>
      [...goals].sort((a, b) => {
        const ao = STATUS_META[(a.status as GoalStatus) ?? 'on_track']?.order ?? 1;
        const bo = STATUS_META[(b.status as GoalStatus) ?? 'on_track']?.order ?? 1;
        return ao - bo;
      }),
    [goals],
  );

  const stats = [
    { v: counts.complete, l: 'complete' },
    { v: counts.on_track, l: 'on track' },
    { v: counts.off_track, l: 'off track' },
  ];

  return (
    <MobileSectionShell
      eyebrow={eyebrow}
      title={<>Prior <SectionTitleAccent>Quarter.</SectionTitleAccent></>}
      sub="Review last quarter's rock outcomes."
    >
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

      {loading && goals.length === 0 ? (
        <div className="text-center py-8 text-[12.5px] text-muted-foreground">Loading rocks…</div>
      ) : goals.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-xl py-6 text-center text-[12.5px] text-muted-foreground">
          No rocks to review.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map((goal) => {
            const status = (goal.status as GoalStatus) ?? 'on_track';
            const meta = STATUS_META[status] ?? STATUS_META.on_track;
            const progress =
              status === 'complete' ? 100 : Math.max(0, Math.min(100, goal.progress ?? 0));
            return (
              <div key={goal.id} className="bg-card border border-border rounded-xl p-3">
                <div className="text-[13px] font-semibold text-foreground tracking-[-0.005em] mb-2">
                  {goal.title}
                </div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className={cn(
                      'text-[9.5px] font-semibold uppercase tracking-[0.06em] px-1.5 py-0.5 rounded',
                      meta.chip,
                    )}
                  >
                    {meta.label}
                  </span>
                  {goal.target_date && (
                    <span className="text-[10.5px] text-muted-foreground">
                      due {format(new Date(goal.target_date), 'MMM d')}
                    </span>
                  )}
                  <div className="flex-1" />
                  <span className="text-[12px] font-semibold text-foreground tabular-nums">
                    {progress}%
                  </span>
                </div>
                <div className="h-1 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn('h-full rounded-full', meta.bar)}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </MobileSectionShell>
  );
};

export default MobileReviewPriorQuarterSection;
