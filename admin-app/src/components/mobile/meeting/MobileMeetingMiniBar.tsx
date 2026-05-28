/**
 * MobileMeetingMiniBar — small prev/next paginator above the section content.
 *
 * Renders just below the pill strip. Tap the chevrons to advance/rewind one
 * section (gated by canControlTimer). Shows "X / N" centered.
 */
import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileMeetingMiniBarProps {
  currentSection: number;
  totalSections: number;
  canControlTimer: boolean;
  onChangeSection: (index: number) => void;
}

export const MobileMeetingMiniBar: React.FC<MobileMeetingMiniBarProps> = ({
  currentSection,
  totalSections,
  canControlTimer,
  onChangeSection,
}) => {
  const canPrev = canControlTimer && currentSection > 0;
  const canNext = canControlTimer && currentSection < totalSections - 1;

  return (
    <div className="flex items-center justify-between px-4 pt-2.5 pb-1">
      <button
        type="button"
        aria-label="Previous section"
        disabled={!canPrev}
        onClick={() => canPrev && onChangeSection(currentSection - 1)}
        className={cn(
          'w-7 h-7 rounded-[8px] flex items-center justify-center transition-transform border border-border/40',
          canPrev
            ? 'bg-muted/60 text-foreground active:scale-90'
            : 'bg-card text-muted-foreground/40 cursor-default',
        )}
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>

      <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
        {totalSections === 0 ? '0 / 0' : `${currentSection + 1} / ${totalSections}`}
      </span>

      <button
        type="button"
        aria-label="Next section"
        disabled={!canNext}
        onClick={() => canNext && onChangeSection(currentSection + 1)}
        className={cn(
          'w-7 h-7 rounded-[8px] flex items-center justify-center transition-transform border border-border/40',
          canNext
            ? 'bg-muted/60 text-foreground active:scale-90'
            : 'bg-card text-muted-foreground/40 cursor-default',
        )}
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

export default MobileMeetingMiniBar;
