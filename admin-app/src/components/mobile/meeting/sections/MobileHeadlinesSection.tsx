/**
 * MobileHeadlinesSection — v2 mirror of the desktop HeadlinesSection.
 *
 * Read-only feed (creation happens via the meeting FAB). Wires the same data
 * as desktop: useHeadlines (filtered to the active meeting, else last 24h),
 * useProfiles for author name/avatar. Preserves the desktop behaviour of
 * pre-triggering issue auto-creation for the scriber so the Issues section is
 * ready on arrival.
 *
 * Adaptation: the prototype's customer/employee "kind" chips + segmented
 * filter have no backing field in the headlines table, so they're omitted —
 * the v2 card style is applied to the real (title + content + author) shape.
 */
import React, { useEffect, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useHeadlines } from '@/hooks/useHeadlines';
import { useNewMeetingTimer } from '@/contexts/NewMeetingTimerContext';
import { useProfiles } from '@/hooks/useProfiles';
import { MobileSectionShell, MobileAvatar } from './MobileSectionPrimitives';

interface MobileHeadlinesSectionProps {
  teamId: string | null;
  meetingTeamId?: string | null;
  eyebrow?: React.ReactNode;
}

export const MobileHeadlinesSection: React.FC<MobileHeadlinesSectionProps> = ({
  teamId,
  meetingTeamId,
  eyebrow,
}) => {
  const { meetingId, currentRole, triggerAutoCreateIssues } = useNewMeetingTimer();
  const effectiveTeamId = meetingTeamId !== undefined ? meetingTeamId : teamId;

  useEffect(() => {
    if (currentRole === 'scriber' && effectiveTeamId) {
      triggerAutoCreateIssues(effectiveTeamId);
    }
  }, [currentRole, effectiveTeamId, triggerAutoCreateIssues]);

  const { profiles } = useProfiles();
  const { headlines, loading } = useHeadlines(effectiveTeamId, meetingId || undefined);

  const filtered = useMemo(() => {
    return headlines.filter((h) => {
      if (meetingId) return h.meeting_id === meetingId;
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return new Date(h.created_at) > dayAgo;
    });
  }, [headlines, meetingId]);

  const profileFor = (id: string) => profiles.find((p) => p.id === id);

  return (
    <MobileSectionShell
      eyebrow={eyebrow}
      title="Headlines."
      sub="Short share. Discussion belongs in IDS."
    >
      {loading && filtered.length === 0 ? (
        <div className="text-center py-8 text-[12.5px] text-muted-foreground">
          Loading headlines…
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-xl py-6 text-center text-[12.5px] text-muted-foreground">
          {meetingId ? 'No headlines added to this meeting yet.' : 'No recent headlines.'}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((h) => {
            const p = profileFor(h.created_by);
            return (
              <div key={h.id} className="bg-card border border-border rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <MobileAvatar
                    name={p?.full_name}
                    email={p?.email}
                    colorKey={h.created_by}
                    size={20}
                  />
                  <span className="text-[11.5px] font-semibold text-foreground truncate">
                    {p?.full_name || p?.email || 'Someone'}
                  </span>
                  <span className="text-[11px] text-muted-foreground/50">·</span>
                  <span className="text-[10.5px] text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(h.created_at), { addSuffix: true })}
                  </span>
                </div>
                <div className="text-[13px] font-semibold text-foreground leading-snug">
                  {h.title}
                </div>
                {h.content && (
                  <div className="text-[12.5px] leading-[1.5] text-muted-foreground mt-1">
                    {h.content}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </MobileSectionShell>
  );
};

export default MobileHeadlinesSection;
