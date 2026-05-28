/**
 * MobileKPICard — KPI card with mono value, tone-tinted delta pill, sparkline,
 * and "vs <period>" caption. Tap → drill-down (parent passes onTap).
 *
 * Layout (top → bottom):
 *  - row 1: uppercase label (left, 10.5px / 700 weight)  · tone delta pill (right)
 *  - row 2: big mono value (30px / 700 / -0.8 letter-spacing) + optional suffix
 *  - row 3: sparkline (height 30dp)
 *  - row 4: "vs <prevPeriod>" caption (10.5px muted)
 */
import React from 'react';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MobileSparkline, MobileSparklineTone } from './MobileSparkline';

export type MobileKPITone = MobileSparklineTone;

export interface MobileKPI {
  /** Stable identifier used by the parent (e.g. for drill-down routing). */
  id: string;
  /** Uppercase label shown at the top, e.g. "Goals achieved". */
  label: string;
  /** Big numeric value. Pass already-formatted (e.g. "8.4" rather than 8.4). */
  value: string;
  /** Optional suffix appended after value (e.g. "/ 10"). */
  suffix?: string;
  /** Numeric delta vs previous period. Positive / negative / zero supported. */
  delta: number;
  /** Caption under the sparkline, e.g. "vs last week". */
  deltaLabel?: string;
  /** Time-series values that drive the sparkline. */
  sparkValues: number[];
  /** Tone — drives the sparkline + delta pill colors. */
  tone: MobileKPITone;
}

interface MobileKPICardProps {
  kpi: MobileKPI;
  onTap?: (kpi: MobileKPI) => void;
}

const TONE_TO_BG: Record<MobileKPITone, string> = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
};

export const MobileKPICard: React.FC<MobileKPICardProps> = ({ kpi, onTap }) => {
  const positive = kpi.delta > 0;
  const neutral = kpi.delta === 0;

  // For warning-tone KPIs (e.g. Tasks completed), both up and down deltas are
  // warning-colored — the metric itself is in a watch state regardless of sign.
  // Otherwise: positive = success/primary tint, negative = destructive tint.
  let deltaToneClass: string;
  if (neutral) {
    deltaToneClass = 'bg-muted/60 text-muted-foreground';
  } else if (kpi.tone === 'warning') {
    deltaToneClass = 'bg-warning/10 text-warning';
  } else if (positive) {
    deltaToneClass = 'bg-success/10 text-success';
  } else {
    deltaToneClass = 'bg-destructive/10 text-destructive';
  }

  const DeltaIcon = neutral ? Minus : positive ? ArrowUp : ArrowDown;

  return (
    <button
      type="button"
      onClick={() => onTap?.(kpi)}
      className={cn(
        'w-full text-left',
        'bg-card border border-border/40 rounded-[14px] p-3.5',
        'flex flex-col gap-2',
        'transition-transform duration-150 active:scale-[0.98]',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground line-clamp-1">
          {kpi.label}
        </span>
        <span
          className={cn(
            'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold tabular-nums shrink-0',
            deltaToneClass,
          )}
        >
          <DeltaIcon className="h-2.5 w-2.5" />
          {positive && '+'}
          {kpi.delta}
        </span>
      </div>

      <div className="flex items-baseline gap-1">
        <span
          className="text-[28px] font-bold leading-none tabular-nums text-foreground"
          style={{ letterSpacing: '-0.8px' }}
        >
          {kpi.value}
        </span>
        {kpi.suffix && (
          <span className="text-xs text-muted-foreground font-medium">
            {kpi.suffix}
          </span>
        )}
      </div>

      <MobileSparkline values={kpi.sparkValues} tone={kpi.tone} height={28} />

      {kpi.deltaLabel && (
        <span className="text-[10.5px] text-muted-foreground">
          {kpi.deltaLabel}
        </span>
      )}
    </button>
  );
};

export default MobileKPICard;
