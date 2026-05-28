/**
 * MobileMeetingPillStrip — horizontally scrollable agenda pills.
 *
 * Variant B of the meeting handoff. Each pill represents one agenda section.
 * Three visual states, driven entirely by index comparison with the active
 * section:
 *
 *   - active (idx === currentSection)
 *     dark editorial gradient fill, two rows: pulsing green dot + section
 *     name + mini progress bar + actual elapsed + planned duration
 *   - done (idx < currentSection)
 *     card-bg + filled-green check circle + neutral border
 *   - upcoming (idx > currentSection)
 *     transparent + dashed border + dashed circle indicator + muted text
 *
 * Behavior:
 *   - On currentSection change, scrolls the active pill into horizontal
 *     center (smooth).
 *   - Disabled state when !canControlTimer — non-scribers see the pills
 *     but can't change sections.
 *
 * Tap a pill → onSectionChange(index). Parent wires this to
 * useNewMeetingTimer().changeSection(), which broadcasts to other devices
 * via the section-broadcast hook registered on the timer context.
 */
import React, { useEffect, useRef } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PillAgendaItem {
  id: string;
  title: string;
  /** Planned duration in MINUTES (matches AgendaItem.duration shape). */
  duration: number;
}

interface MobileMeetingPillStripProps {
  agendaItems: PillAgendaItem[];
  currentSection: number;
  /** Accumulated ms per section (live-updated for the active section). */
  sectionAccumulatedMs: number[];
  /** Whether the local user can change sections (scriber-only on mobile too). */
  canControlTimer: boolean;
  onSectionChange: (index: number) => void;
}

const fmtElapsed = (ms: number): string => {
  if (ms <= 0) return '0:00';
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export const MobileMeetingPillStrip: React.FC<MobileMeetingPillStripProps> = ({
  agendaItems,
  currentSection,
  sectionAccumulatedMs,
  canControlTimer,
  onSectionChange,
}) => {
  const stripRef = useRef<HTMLDivElement>(null);
  const pillRefs = useRef<Record<number, HTMLButtonElement | null>>({});

  // Center the active pill horizontally on every index change.
  useEffect(() => {
    const strip = stripRef.current;
    const pill = pillRefs.current[currentSection];
    if (!strip || !pill) return;
    const target = pill.offsetLeft - strip.clientWidth / 2 + pill.offsetWidth / 2;
    strip.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
  }, [currentSection]);

  return (
    <div
      ref={stripRef}
      className="overflow-x-auto overflow-y-hidden px-3.5 pb-3 border-b border-border/40 bg-background whitespace-nowrap"
      style={{ scrollbarWidth: 'none' }}
    >
      <div className="inline-flex gap-1.5 items-stretch">
        {agendaItems.map((s, i) => {
          const isActive = i === currentSection;
          const isDone = i < currentSection;
          const isUpcoming = !isActive && !isDone;

          const actualMs = sectionAccumulatedMs[i] ?? 0;
          const plannedMs = s.duration * 60 * 1000;
          const pct = plannedMs > 0 ? Math.min(100, (actualMs / plannedMs) * 100) : 0;
          const over = plannedMs > 0 && actualMs > plannedMs;

          return (
            <button
              key={s.id}
              ref={(el) => {
                pillRefs.current[i] = el;
              }}
              type="button"
              disabled={!canControlTimer}
              onClick={() => canControlTimer && onSectionChange(i)}
              className={cn(
                'shrink-0 inline-flex flex-col gap-1 px-3 py-2 rounded-[12px] border text-left transition-all duration-150',
                isActive && 'text-white border-transparent min-w-[140px]',
                isDone && 'bg-card text-foreground border-border/60',
                isUpcoming && 'bg-transparent text-muted-foreground border-dashed border-border',
                canControlTimer && 'active:scale-[0.97]',
                !canControlTimer && 'cursor-default',
              )}
              style={
                isActive
                  ? {
                      backgroundImage:
                        'linear-gradient(135deg, #1e2235 0%, #2a2e4a 55%, #4a4e6f 100%)',
                      boxShadow:
                        '0 8px 22px -10px rgba(30,34,53,0.45), inset 0 1px 0 rgba(255,255,255,0.08)',
                    }
                  : undefined
              }
              aria-current={isActive ? 'step' : undefined}
            >
              <div className="flex items-center gap-1.5">
                {isActive && (
                  <span className="relative flex h-1.5 w-1.5 shrink-0" aria-hidden="true">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-60 animate-ping" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
                  </span>
                )}
                {isDone && (
                  <span
                    className="w-3.5 h-3.5 rounded-full bg-success inline-flex items-center justify-center shrink-0"
                    aria-hidden="true"
                  >
                    <Check className="h-2 w-2 text-white" strokeWidth={3.4} />
                  </span>
                )}
                {isUpcoming && (
                  <span
                    className="w-3 h-3 rounded-full border-[1.5px] border-dashed border-muted-foreground/40 shrink-0"
                    aria-hidden="true"
                  />
                )}
                <span
                  className={cn(
                    'text-[11.5px] font-semibold tracking-tight truncate max-w-[120px]',
                    isActive && 'text-white',
                  )}
                >
                  {s.title}
                </span>
              </div>

              {isActive && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10.5px] font-bold tabular-nums text-white">
                    {fmtElapsed(actualMs)}
                  </span>
                  <div
                    className="flex-1 h-[3px] rounded-full overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.22)' }}
                  >
                    <div
                      className="h-full rounded-full transition-[width] duration-300"
                      style={{
                        width: `${pct}%`,
                        background: over ? 'hsl(var(--destructive))' : 'white',
                      }}
                    />
                  </div>
                  <span className="text-[10px] font-medium tabular-nums whitespace-nowrap text-white/55">
                    {s.duration}m
                  </span>
                </div>
              )}

              {!isActive && (
                <div className="flex items-center gap-1">
                  {actualMs > 0 ? (
                    <span
                      className={cn(
                        'text-[10.5px] font-semibold tabular-nums',
                        over && 'text-destructive',
                        !over && isDone && 'text-success',
                        !over && isUpcoming && 'text-muted-foreground/70',
                      )}
                    >
                      {fmtElapsed(actualMs)}
                    </span>
                  ) : (
                    <span className="text-[10.5px] text-muted-foreground/70 tabular-nums">
                      {s.duration}m
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MobileMeetingPillStrip;
