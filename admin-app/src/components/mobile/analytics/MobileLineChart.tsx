/**
 * MobileLineChart — pure-SVG smooth-curve line chart with axis labels and
 * optional area fill. Used standalone and as the basis for MobileAreaChart.
 *
 * Renders:
 *  - 3 horizontal grid lines (top / mid / bottom, dashed)
 *  - Smooth Bezier curve through the points
 *  - Optional area fill (12% opacity) under the curve
 *  - Hit-zone rects + dots at each data point
 *  - X labels at the bottom, y labels (min/mid/max) on the left
 *
 * All chart math comes from the design prototype (analytics-shell.jsx).
 */
import React from 'react';

export type MobileLineChartTone = 'primary' | 'success' | 'warning' | 'destructive';

export interface MobileLineChartPoint {
  /** X-axis label, e.g. "Jan" or "Wk 12". */
  x: string;
  /** Single numeric value for this point. */
  value: number;
}

interface MobileLineChartProps {
  data: MobileLineChartPoint[];
  /** Pass [min, max] to fix the y-axis. Otherwise computed from data. */
  domain?: [number, number];
  tone?: MobileLineChartTone;
  height?: number;
  /** Render the area fill under the line. Defaults to true. */
  area?: boolean;
  onPointTap?: (x: string, value: number, index: number) => void;
}

const TONE_TO_STROKE: Record<MobileLineChartTone, string> = {
  primary: 'hsl(var(--primary))',
  success: 'var(--success)',
  warning: 'var(--warning)',
  destructive: 'var(--destructive)',
};

function buildSmoothPath(pts: [number, number][]): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0][0]},${pts[0][1]}`;
  let d = `M ${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[i + 1];
    const cx = (x1 + x2) / 2;
    d += ` C ${cx},${y1} ${cx},${y2} ${x2},${y2}`;
  }
  return d;
}

export const MobileLineChart: React.FC<MobileLineChartProps> = ({
  data,
  domain,
  tone = 'primary',
  height = 150,
  area = true,
  onPointTap,
}) => {
  // Internal coord space — scaled to actual container width via preserveAspectRatio="xMidYMid meet"
  const W = 320;
  const H = height;
  const padT = 16;
  const padR = 14;
  const padB = 22;
  const padL = 36;

  const values = data.map((d) => d.value);
  const min = domain ? domain[0] : Math.min(...values, 0);
  const max = domain ? domain[1] : Math.max(...values, 1);
  const range = max - min || 1;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const stepX = data.length > 1 ? innerW / (data.length - 1) : 0;
  const pts: [number, number][] = values.map((v, i) => [
    padL + i * stepX,
    padT + innerH - ((v - min) / range) * innerH,
  ]);
  const path = buildSmoothPath(pts);
  const stroke = TONE_TO_STROKE[tone];
  const last = pts[pts.length - 1];
  const first = pts[0];

  // Number formatter — drop trailing zero on whole numbers, otherwise 1 decimal
  const fmt = (v: number) => (Number.isInteger(v) ? `${v}` : v.toFixed(1));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: '100%', height }}
      aria-label="Line chart"
      role="img"
    >
      {/* Horizontal grid lines */}
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

      {/* Area fill (optional) */}
      {area && data.length > 0 && (
        <path
          d={`${path} L ${last[0]},${padT + innerH} L ${first[0]},${padT + innerH} Z`}
          fill={stroke}
          opacity={0.12}
        />
      )}

      {/* Line */}
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Dots + hit zones */}
      {pts.map((p, i) => (
        <g
          key={i}
          onClick={() => onPointTap?.(data[i].x, data[i].value, i)}
          style={{ cursor: onPointTap ? 'pointer' : 'default' }}
        >
          <circle
            cx={p[0]}
            cy={p[1]}
            r={3}
            fill="hsl(var(--card))"
            stroke={stroke}
            strokeWidth={2}
          />
          {stepX > 0 && (
            <rect
              x={p[0] - stepX / 2}
              y={padT}
              width={stepX}
              height={innerH}
              fill="transparent"
            />
          )}
        </g>
      ))}

      {/* X-axis labels */}
      {data.map((d, i) => (
        <text
          key={i}
          x={padL + i * stepX}
          y={H - 6}
          textAnchor="middle"
          fontSize={10}
          fill="hsl(var(--muted-foreground))"
          fontFamily="Inter, sans-serif"
        >
          {d.x}
        </text>
      ))}

      {/* Y-axis labels (max / mid / min) */}
      {[max, (max + min) / 2, min].map((v, i) => (
        <text
          key={i}
          x={padL - 6}
          y={padT + innerH * (i / 2) + 3}
          textAnchor="end"
          fontSize={9.5}
          fill="hsl(var(--muted-foreground))"
          fontFamily="ui-monospace, SFMono-Regular, monospace"
          className="tabular-nums"
        >
          {fmt(v)}
        </text>
      ))}
    </svg>
  );
};

export default MobileLineChart;
