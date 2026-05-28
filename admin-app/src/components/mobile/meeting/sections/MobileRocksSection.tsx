/**
 * MobileRocksSection — v2 mirror of the desktop TeamGoalReviewSection (Rocks).
 *
 * Read-only review: goals grouped by owner (current user first, then
 * alphabetical), each with a status chip + progress bar. Wires the same data
 * hook the desktop uses (useTeamGoals); owner names via useProfilesByIds.
 *
 * Adaptation: team goals have no 'at_risk' status (only on_track / off_track /
 * complete / canceled — see useTeamGoals), so the prototype's amber "at risk"
 * chip maps to the real status set.
 */
import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { useTeamGoals } from '@/hooks/useTeamGoals';
import { useProfilesByIds } from '@/hooks/useProfilesByIds';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  MobileSectionShell,
  MobileAvatar,
  SectionTitleAccent,
} from './MobileSectionPrimitives';

type GoalStatus = 'on_track' | 'off_track' | 'complete' | 'canceled';

const STATUS_META: Record<GoalStatus, { label: string; chip: string; bar: string }> = {
  on_track: { label: 'on track', chip: 'bg-success/10 text-success', bar: 'bg-success' },
  off_track: { label: 'off track', chip: 'bg-destructive/10 text-destructive', bar: 'bg-destructive' },
  complete: { label: 'complete', chip: 'bg-primary/10 text-primary', bar: 'bg-primary' },
  canceled: { label: 'canceled', chip: 'bg-muted text-muted-foreground', bar: 'bg-muted-foreground/50' },
};

interface MobileRocksSectionProps {
  teamId: string;
  eyebrow?: React.ReactNode;
}

export const MobileRocksSection: React.FC<MobileRocksSectionProps> = ({ teamId, eyebrow }) => {
  const { goals, loading } = useTeamGoals(teamId);
  const { user } = useAuth();
  const currentUserId = user?.id;

  const ownerIds = useMemo(() => goals.map((g) => g.owner_id), [goals]);
  const { getProfile } = useProfilesByIds(ownerIds);

  const groups = useMemo(() => {
    const byOwner = new Map<string, typeof goals>();
    goals.forEach((g) => {
      const list = byOwner.get(g.owner_id) ?? [];
      list.push(g);
      byOwner.set(g.owner_id, list);
    });
    return Array.from(byOwner.entries())
      .map(([ownerId, ownerGoals]) => {
        const profile = getProfile(ownerId);
        return {
          ownerId,
          name: profile?.full_name || profile?.email || 'Unknown',
          email: profile?.email,
          isYou: ownerId === currentUserId,
          goals: [...ownerGoals].sort((a, b) => a.display_order - b.display_order),
        };
      })
      .sort((a, b) => {
        if (a.isYou) return -1;
        if (b.isYou) return 1;
        return a.name.localeCompare(b.name);
      });
  }, [goals, getProfile, currentUserId]);

  return (
    <MobileSectionShell
      eyebrow={eyebrow}
      title={<>Rock <SectionTitleAccent>Review.</SectionTitleAccent></>}
      sub={
        goals.length === 0
          ? 'Review quarterly rocks and progress.'
          : `${goals.length} rock${goals.length === 1 ? '' : 's'} · ${groups.length} owner${groups.length === 1 ? '' : 's'}`
      }
    >
      {loading && goals.length === 0 ? (
        <div className="text-center py-8 text-[12.5px] text-muted-foreground">Loading rocks…</div>
      ) : goals.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-xl py-6 text-center text-[12.5px] text-muted-foreground">
          No rocks for this team yet.
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          {groups.map((g) => (
            <div key={g.ownerId}>
              <div className="flex items-center gap-2 mb-2">
                <MobileAvatar name={g.name} email={g.email} colorKey={g.ownerId} size={24} />
                <span className="text-[12.5px] font-semibold text-foreground">{g.name}</span>
                {g.isYou && <span className="text-[10.5px] text-muted-foreground/60">you</span>}
                <div className="flex-1" />
                <span className="text-[10.5px] text-muted-foreground tabular-nums">
                  {g.goals.length} rock{g.goals.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {g.goals.map((goal) => {
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
                          className={cn('h-full rounded-full transition-[width]', meta.bar)}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </MobileSectionShell>
  );
};

export default MobileRocksSection;
