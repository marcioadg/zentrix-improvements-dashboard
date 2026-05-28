/**
 * MobileMeetingStartScreen — shown when the user lands on
 * /m/meeting/:teamId/:meetingType and no meeting is currently active
 * for that team + type.
 *
 * Calls into useNewMeetingTimer().startMeeting (the same handle the
 * desktop start flow uses). Errors surface via toast on the parent page.
 */
import React from 'react';
import { Play, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MobileMeetingStartScreenProps {
  teamName: string;
  meetingTitle: string;
  plannedTotalMinutes: number;
  agendaSectionCount: number;
  starting?: boolean;
  onStart: () => void;
  onBack?: () => void;
}

export const MobileMeetingStartScreen: React.FC<MobileMeetingStartScreenProps> = ({
  teamName,
  meetingTitle,
  plannedTotalMinutes,
  agendaSectionCount,
  starting = false,
  onStart,
  onBack,
}) => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="px-4 pt-[max(env(safe-area-inset-top,16px),16px)] pb-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="text-[12px] text-muted-foreground active:opacity-70 mb-3"
          >
            ← Back
          </button>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
          <Play className="h-7 w-7 fill-current" />
        </div>
        <h1 className="text-[22px] font-bold text-foreground" style={{ letterSpacing: '-0.3px' }}>
          {teamName}
        </h1>
        <p className="text-[13px] text-muted-foreground mt-1">{meetingTitle}</p>
        <p className="text-[11.5px] text-muted-foreground/70 mt-3 tabular-nums">
          {agendaSectionCount} section{agendaSectionCount === 1 ? '' : 's'} · {plannedTotalMinutes} min planned
        </p>

        <Button
          type="button"
          onClick={onStart}
          disabled={starting}
          className={cn(
            'mt-8 h-12 px-8 text-[14px] font-semibold gap-2 rounded-full',
          )}
        >
          {starting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Starting…
            </>
          ) : (
            <>
              <Play className="h-4 w-4" /> Start meeting
            </>
          )}
        </Button>

        <p className="text-[11px] text-muted-foreground mt-3 max-w-xs leading-relaxed">
          Anyone on the team can start. Once a meeting is live, joining from
          another device joins the same room.
        </p>
      </div>
    </div>
  );
};

export default MobileMeetingStartScreen;
