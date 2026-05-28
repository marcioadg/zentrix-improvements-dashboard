/**
 * MobileMeetingHeader — sticky status header for the meeting room.
 *
 * Two lines:
 *   line 1: team name · meeting type label  (left) | timer / planned-total
 *           + pause toggle + kebab (right)
 *   line 2: pulsing dot + Live/Paused pill + " · N attendees"
 *
 * No bottom nav inside the meeting room (full-screen mode per handoff).
 *
 * Pause toggle calls into useNewMeetingTimer().pauseTimer / resumeTimer.
 * Disabled when !canControlTimer (mirrors desktop: scriber-only).
 */
import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Crown, MoreHorizontal, Pause, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileMeetingHeaderProps {
  teamName: string;
  meetingTitle: string;
  /** Total elapsed milliseconds (from timer calculations). */
  elapsedMs: number;
  /** Total planned minutes for the whole meeting. */
  plannedTotalMinutes: number;
  isPaused: boolean;
  /** Total active attendees in the meeting (from presence). */
  attendeeCount?: number;
  /** Whether the local user can control timer (pause/resume). */
  canControlTimer: boolean;
  onTogglePause: () => void;
  onBack?: () => void;
  /** Optional kebab callback — opens an action sheet (e.g. End meeting). */
  onOpenMore?: () => void;
  /**
   * Show a "Become Scriber" chip on the live/paused line. Mirrors desktop
   * TakeOverScribeButton: only render when the meeting is running, the
   * local user is a participant, and no one is currently scriber.
   */
  showBecomeScriber?: boolean;
  /** Called when the chip is tapped — should invoke takeOverAsScriber(). */
  onBecomeScriber?: () => void | Promise<void>;
}

const fmtHMS = (ms: number): string => {
  if (ms <= 0) return '00:00';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export const MobileMeetingHeader: React.FC<MobileMeetingHeaderProps> = ({
  teamName,
  meetingTitle,
  elapsedMs,
  plannedTotalMinutes,
  isPaused,
  attendeeCount,
  canControlTimer,
  onTogglePause,
  onBack,
  onOpenMore,
  showBecomeScriber = false,
  onBecomeScriber,
}) => {
  const headerRef = useRef<HTMLElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  useEffect(() => {
    if (!headerRef.current) return;
    const update = () => {
      if (headerRef.current) setHeaderHeight(headerRef.current.offsetHeight);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [teamName, meetingTitle, isPaused, attendeeCount]);

  return (
    <>
      <div
        style={{ height: headerHeight || 'calc(env(safe-area-inset-top) + 76px)' }}
        aria-hidden="true"
      />
      <header
        ref={headerRef}
        className="bg-background backdrop-blur-md px-4 pb-2.5 transition-shadow duration-200 fixed top-0 left-0 right-0 z-20 border-b border-border/40"
        style={{ paddingTop: 'max(env(safe-area-inset-top, 12px), 12px)' }}
      >
        <div className="flex items-center justify-between gap-2">
          {/* Left: back + title */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {onBack && (
              <button
                type="button"
                aria-label="Back"
                onClick={onBack}
                className="w-8 h-8 rounded-[10px] flex items-center justify-center bg-card text-foreground border border-border active:scale-95 transition-transform shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[13px] font-bold text-foreground truncate" style={{ letterSpacing: '-0.1px' }}>
                  {teamName}
                </span>
                <span className="text-[13px] text-muted-foreground/70">·</span>
                <span className="text-[13px] text-muted-foreground font-medium truncate">
                  {meetingTitle}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span
                  className={cn(
                    'w-1.5 h-1.5 rounded-full',
                    isPaused ? 'bg-warning' : 'bg-success animate-pulse',
                  )}
                  aria-hidden="true"
                />
                <span
                  className={cn(
                    'text-[10.5px] font-bold uppercase tracking-wider tabular-nums',
                    isPaused ? 'text-warning' : 'text-success',
                  )}
                >
                  {isPaused ? 'Paused' : 'Live'}
                </span>
                {typeof attendeeCount === 'number' && attendeeCount > 0 && (
                  <>
                    <span className="text-[11px] text-muted-foreground/60">·</span>
                    <span className="text-[10.5px] text-muted-foreground tabular-nums">
                      {attendeeCount} attendee{attendeeCount === 1 ? '' : 's'}
                    </span>
                  </>
                )}
                {showBecomeScriber && onBecomeScriber && (
                  <>
                    <span className="text-[11px] text-muted-foreground/60">·</span>
                    <button
                      type="button"
                      onClick={() => {
                        void onBecomeScriber();
                      }}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/30 text-[10px] font-bold uppercase tracking-wider active:scale-95 transition-transform"
                      aria-label="Become scriber"
                    >
                      <Crown className="h-3 w-3" />
                      Become scriber
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right: timer pill (elapsed + pause) + kebab */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex items-center gap-2 pl-2.5 pr-1.5 py-1 rounded-[10px] bg-card border border-border">
              <div className="flex items-baseline gap-1 leading-none">
                <span
                  className="text-[14px] font-semibold text-foreground tabular-nums"
                  style={{ letterSpacing: '-0.3px' }}
                >
                  {fmtHMS(elapsedMs)}
                </span>
                <span className="text-[9.5px] text-muted-foreground tabular-nums">
                  / {plannedTotalMinutes}m
                </span>
              </div>
              <span className="w-px h-3.5 bg-border" aria-hidden="true" />
              <button
                type="button"
                aria-label={isPaused ? 'Resume meeting' : 'Pause meeting'}
                onClick={onTogglePause}
                disabled={!canControlTimer}
                className={cn(
                  'w-6 h-6 rounded-[7px] flex items-center justify-center text-foreground transition-transform',
                  canControlTimer && 'active:scale-90',
                  !canControlTimer && 'opacity-40 cursor-default',
                )}
              >
                {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
              </button>
            </div>
            {onOpenMore && (
              <button
                type="button"
                aria-label="More"
                onClick={onOpenMore}
                className="w-8 h-8 rounded-[10px] flex items-center justify-center bg-card text-foreground border border-border active:scale-95 transition-transform"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </header>
    </>
  );
};

export default MobileMeetingHeader;
