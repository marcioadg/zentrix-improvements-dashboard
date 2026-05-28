/**
 * MobileWrapUpSection — v2 mirror of the desktop WrapUpSection.
 *
 * SAFETY: the end-meeting flow is the most consequential action in the app, so
 * this reuses the desktop's EXACT hook composition (useLiveMeetingRatings,
 * useWrapUpState, useWrapUpActions → handleEndMeeting, etc.) unchanged — only
 * the JSX is mobile. End-meeting/finalize/archive logic is identical to
 * desktop.
 *
 * The rating grid drives the CURRENT user's rating (each participant rates on
 * their own device; ratings sync via useRatingBroadcast), matching the
 * prototype's single 1–10 grid. Scriber-wide rating editing + per-member
 * absence toggles remain desktop-only for now.
 */
import React, { useCallback, useState } from 'react';
import { ArrowRight, Mail } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useNewMeetingTimer } from '@/contexts/NewMeetingTimerContext';
import { useAllActiveMeetings } from '@/hooks/useAllActiveMeetings';
import { useLiveMeetingRatings } from '@/hooks/useLiveMeetingRatings';
import { useMeetingArchiveOperations } from '@/hooks/useMeetingArchiveOperations';
import { useMeetingNewTeamTasks } from '@/hooks/meeting/useMeetingNewTeamTasks';
import { useWrapUpState, useCurrentUser } from '@/hooks/meeting/useWrapUpState';
import { useWrapUpData } from '@/hooks/meeting/useWrapUpData';
import { useWrapUpActions } from '@/hooks/meeting/useWrapUpActions';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { useRealtimeAbsences } from '@/hooks/meeting/useRealtimeAbsences';
import { useRatingBroadcast } from '@/hooks/meeting/useRatingBroadcast';
import { useCanEndMeeting } from '@/hooks/useCanEndMeeting';
import { cn } from '@/lib/utils';
import {
  MobileSectionShell,
  SectionEyebrow,
  SectionTitleAccent,
} from './MobileSectionPrimitives';

interface MobileWrapUpSectionProps {
  teamId: string;
  meetingType?: string;
  eyebrow?: React.ReactNode;
}

export const MobileWrapUpSection: React.FC<MobileWrapUpSectionProps> = ({ teamId, eyebrow }) => {
  const { members } = useTeamMembers(teamId);
  const { meetingId, timerState, endMeeting, scriberId, currentUserId: timerUserId } =
    useNewMeetingTimer();
  const { currentCompany } = useMultiCompany();
  const { finalizeMeeting } = useAllActiveMeetings();
  const { saveRating, getRating, getRatingsSummary, updateRatingLocalState } = useLiveMeetingRatings(
    meetingId,
    members,
  );
  const { archiveCompletedTasks, cleanupLiveRatings } = useMeetingArchiveOperations();

  const handleRemoteRatingChange = useCallback(
    (userId: string, rating: number) => {
      updateRatingLocalState(userId, rating);
    },
    [updateRatingLocalState],
  );
  const { publishRatingChange } = useRatingBroadcast({
    meetingId,
    onRatingChanged: handleRemoteRatingChange,
  });

  const meetingCompanyId = currentCompany?.id || null;
  const { canEnd: canEndMeeting } = useCanEndMeeting(scriberId);

  const { tasks: newTasks, refetch } = useMeetingNewTeamTasks(
    teamId,
    timerState.meetingStartTime,
    meetingId,
  );

  const currentUserId = useCurrentUser();
  const {
    absentMembers,
    hasAutoRefreshed,
    setIsRefreshing,
    setHasAutoRefreshed,
    setAbsentMembers,
  } = useWrapUpState(members, currentUserId, getRating);

  useWrapUpData(meetingId, refetch, hasAutoRefreshed, setHasAutoRefreshed, setIsRefreshing);

  useRealtimeAbsences(meetingId, (ids: string[]) => setAbsentMembers(new Set(ids)));

  const ratingsSummary = getRatingsSummary();

  const { handleEndMeeting, isEnding } = useWrapUpActions(
    members,
    absentMembers,
    ratingsSummary,
    meetingId,
    teamId,
    meetingCompanyId,
    finalizeMeeting,
    endMeeting,
    archiveCompletedTasks,
    cleanupLiveRatings,
  );

  const myRating = currentUserId ? getRating(currentUserId) : undefined;

  const handleRate = (n: number) => {
    if (!currentUserId) return;
    saveRating(currentUserId, n);
    publishRatingChange(currentUserId, n);
  };

  // Mirrors desktop WrapUpActions / WrapUpConfirmDialog: show a confirm step
  // with a "Send recap email" checkbox before finalizing. handleEndMeeting
  // already takes the boolean from useWrapUpActions — the data path is
  // identical to desktop; only the dialog is mobile-styled. Without this
  // step the button was calling handleEndMeeting() with no argument, so
  // shouldSendRecapEmail was undefined and the recap was never sent.
  const [showConfirm, setShowConfirm] = useState(false);
  const [sendRecap, setSendRecap] = useState(true);

  const requestEndMeeting = () => {
    if (!canEndMeeting || isEnding) return;
    setShowConfirm(true);
  };

  const confirmEndMeeting = () => {
    setShowConfirm(false);
    handleEndMeeting(sendRecap);
  };

  const toDosCreated = Array.isArray(newTasks) ? newTasks.length : 0;

  return (
    <MobileSectionShell
      eyebrow={eyebrow}
      title={<>Wrap <SectionTitleAccent>Up.</SectionTitleAccent></>}
      sub="Rate, recap, end."
    >
      {/* rating */}
      <div className="bg-card border border-border rounded-xl p-3.5 mb-3">
        <SectionEyebrow className="mb-2.5">Rate this meeting</SectionEyebrow>
        <div className="grid grid-cols-5 gap-1.5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => {
            const active = myRating === n;
            return (
              <button
                key={n}
                type="button"
                onClick={() => handleRate(n)}
                className={cn(
                  'h-9 rounded-lg text-[13px] font-semibold tabular-nums border transition-colors active:scale-95',
                  active
                    ? 'text-white border-transparent'
                    : 'bg-card text-foreground/70 border-border',
                )}
                style={
                  active
                    ? { backgroundImage: 'linear-gradient(135deg, #1e2235, #4a4e6f)' }
                    : undefined
                }
              >
                {n}
              </button>
            );
          })}
        </div>
      </div>

      {/* summary */}
      <SectionEyebrow className="mb-2">This meeting we created</SectionEyebrow>
      <div className="bg-card border border-border rounded-xl px-3 py-3 text-center mb-3.5">
        <div className="text-[24px] font-semibold text-foreground leading-none tabular-nums tracking-[-0.02em]">
          {toDosCreated}
        </div>
        <div className="text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground mt-1.5">
          to-dos
        </div>
      </div>

      {/* end meeting */}
      <button
        type="button"
        onClick={requestEndMeeting}
        disabled={!canEndMeeting || isEnding}
        className={cn(
          'w-full h-[50px] rounded-xl text-white text-[14px] font-semibold inline-flex items-center justify-center gap-2 transition-transform active:scale-[0.99]',
          (!canEndMeeting || isEnding) && 'opacity-50 cursor-default',
        )}
        style={{
          backgroundImage: 'linear-gradient(90deg, #1e2235, #4a4e6f, #8b8ec5)',
          boxShadow: '0 10px 30px -8px rgba(30,34,53,0.4)',
        }}
      >
        {isEnding ? 'Ending…' : 'End meeting'}
        {!isEnding && <ArrowRight className="h-3.5 w-3.5" />}
      </button>
      {!canEndMeeting && (
        <p className="text-[11px] text-muted-foreground text-center mt-2">
          Only the scriber can end the meeting.
        </p>
      )}

      {/* Mobile mirror of desktop's WrapUpConfirmDialog. */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-[110] bg-black/50 flex items-center justify-center px-5"
          onClick={() => !isEnding && setShowConfirm(false)}
        >
          <div
            className="w-full max-w-[340px] bg-card rounded-2xl p-5 shadow-[0_24px_60px_rgba(0,0,0,0.3)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-[15px] font-bold text-foreground tracking-[-0.01em]">
              Close Meeting
            </div>
            <p className="text-[12.5px] text-muted-foreground mt-2 leading-[1.5]">
              Are you sure you want to close this meeting? This will save all ratings and finalize
              the meeting results.
            </p>

            <label
              htmlFor="mobile-send-recap"
              className="flex items-center gap-3 mt-4 pt-3 border-t border-border cursor-pointer"
            >
              <Checkbox
                id="mobile-send-recap"
                checked={sendRecap}
                onCheckedChange={(c) => setSendRecap(c === true)}
              />
              <span className="inline-flex items-center gap-2 text-[12.5px] font-medium text-foreground">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                Send recap email to team members
              </span>
            </label>

            <div className="flex gap-2 mt-4">
              <button
                type="button"
                disabled={isEnding}
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 rounded-[10px] bg-muted text-foreground text-[12.5px] font-semibold disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isEnding}
                onClick={confirmEndMeeting}
                className="flex-1 py-2.5 rounded-[10px] text-white text-[12.5px] font-semibold disabled:opacity-60"
                style={{ backgroundImage: 'linear-gradient(90deg, #1e2235, #4a4e6f, #8b8ec5)' }}
              >
                {isEnding ? 'Closing…' : 'Close Meeting'}
              </button>
            </div>
          </div>
        </div>
      )}
    </MobileSectionShell>
  );
};

export default MobileWrapUpSection;
