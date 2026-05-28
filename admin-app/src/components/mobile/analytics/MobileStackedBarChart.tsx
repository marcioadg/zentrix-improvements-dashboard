/**
 * MobileStackedBarChart — pure-SVG stacked-bar chart. Each datum has an array
 * of values (one per series); bars are stacked top-to-bottom in series order.
 * The topmost stack gets rounded top corners (rx=3) so the bars look "filled".
 *
 * Used standalone for stacked metrics (e.g. "Goals: Completed / On Track / Off
 * Track"), or wrapped by MobileBarChart for single-series bar charts.
 */
import React from 'react';

export interface MobileStackedBarPoint {
  /** X-axis label, e.g. "Jan" or "W12". */
  x: string;
  /** Series values, in the same order as `seriesColors`. */
  values: number[];
}

interface MobileStackedBarChartProps {
  data: MobileStackedBarPoint[];
  /** Color-per-series, in stack order (index 0 = bottom of the bar). */
  seriesColors: string[];
  height?: number;
  onBarTap?: (x: string, index: number) => void;
}

export const MobileStackedBarChart: React.FC<MobileStackedBarChartProps> = ({
  data,
  seriesColors,
  height = 150,
  onBarTap,
}) => {
  const W = 320;
  const H = height;
  const padT = 16;
  const padR = 14;
  const padB = 22;
  const padL = 30;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const totals = data.map((d) => d.values.reduce((a, b) => a + b, 0));
  const max = Math.max(...totals, 1);
  const slot = data.length > 0 ? innerW / data.length : 0;
  const barW = Math.min(28, slot * 0.65);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: '100%', height }}
      aria-label="Stacked bar chart"
      role="img"
    >
      {/* Horizontal grid */}
      {[0, 0.5, 1].map((t, i) => {
        const y = padT + innerH * t;
        return (
          <line
            key={i}
            x1={padL}
            x2={W - padR}
            y1={y}
            y2={y}
            stroke="hsl(var(--border) / 0.5)"
            strokeDasharray="2 3"
          />
        );
      })}

      {/* Bars */}
      {data.map((d, i) => {
        const x = padL + i * slot + slot / 2 - barW / 2;
        let yCursor = padT + innerH;
        const lastSeriesIndex = d.values.length - 1;
        return (
          <g
            key={i}
            onClick={() => onBarTap?.(d.x, i)}
            style={{ cursor: onBarTap ? 'pointer' : 'default' }}
          >
            {d.values.map((v, j) => {
              const h = (v / max) * innerH;
              const y = yCursor - h;
              yCursor = y;
              // Round the top corners of the topmost (last-rendered) stack only.
              const isTop = j === lastSeriesIndex;
              return (
                <rect
                  key={j}
                  x={x}
                  y={y}
                  width={barW}
                  height={Math.max(0, h)}
                  fill={seriesColors[j] || 'hsl(var(--muted))'}
                  rx={isTop ? 3 : 0}
                />
              );
            })}
            <text
              x={padL + i * slot + slot / 2}
              y={H - 6}
              textAnchor="middle"
              fontSize={10}
              fill="hsl(var(--muted-foreground))"
              fontFamily="Inter, sans-serif"
            >
              {d.x}
            </text>
          </g>
        );
      })}

      {/* Y axis: max + 0 labels */}
      <text
        x={padL - 6}
        y={padT + 4}
        textAnchor="end"
        fontSize={9.5}
        fill="hsl(var(--muted-foreground))"
        fontFamily="ui-monospace, SFMono-Regular, monospace"
        className="tabular-nums"
      >
        {max}
      </text>
      <text
        x={padL - 6}
        y={padT + innerH + 3}
        textAnchor="end"
        fontSize={9.5}
        fill="hsl(var(--muted-foreground))"
        fontFamily="ui-monospace, SFMono-Regular, monospace"
        className="tabular-nums"
      >
        0
      </text>
    </svg>
  );
};

export default MobileStackedBarChart;
