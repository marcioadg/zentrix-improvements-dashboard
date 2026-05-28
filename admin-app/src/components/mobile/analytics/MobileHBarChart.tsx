/**
 * MobileHBarChart — horizontal bar chart. Labels on the left, mono value on
 * the right, muted track behind a colored fill bar. Designed for "top
 * contributors" style lists where you want to compare a single metric across
 * named entities.
 */
import React from 'react';

export interface MobileHBarRow {
  /** Stable identifier (e.g. user id), passed to onRowTap. */
  id: string;
  /** Display label, e.g. a person's full name. */
  label: string;
  /** Numeric value. */
  value: number;
}

export type MobileHBarTone = 'primary' | 'success' | 'warning' | 'destructive';

interface MobileHBarChartProps {
  data: MobileHBarRow[];
  tone?: MobileHBarTone;
  /** Format the value to display (e.g. with units). Defaults to String(value). */
  formatValue?: (value: number) => string;
  onRowTap?: (row: MobileHBarRow) => void;
}

const TONE_TO_FILL: Record<MobileHBarTone, string> = {
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
};

export const MobileHBarChart: React.FC<MobileHBarChartProps> = ({
  data,
  tone = 'primary',
  formatValue = (v) => String(v),
  onRowTap,
}) => {
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="flex flex-col gap-2">
      {data.map((row) => {
        const pct = (row.value / max) * 100;
        return (
          <button
            key={row.id}
            type="button"
            onClick={() => onRowTap?.(row)}
            className="w-full text-left grid grid-cols-[1fr_auto] items-center gap-3 py-1 transition-opacity active:opacity-70"
          >
            <div className="min-w-0">
              <div className="text-[12px] text-foreground font-medium truncate mb-1">
                {row.label}
              </div>
              <div className="h-2 bg-muted/70 rounded-full overflow-hidden">
                <div
                  className={`h-full ${TONE_TO_FILL[tone]} rounded-full transition-[width] duration-300`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
            <div className="text-[12px] font-semibold tabular-nums text-foreground shrink-0">
              {formatValue(row.value)}
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default MobileHBarChart;
