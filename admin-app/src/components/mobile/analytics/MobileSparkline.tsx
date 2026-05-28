/**
 * MobileSparkline — pure-SVG smooth-curve sparkline for KPI cards.
 *
 * Renders a 100-unit-wide line over a normalized vertical range, with optional
 * area fill (12% opacity) and a dot at the most-recent point. All sizing is
 * controlled by the `height` prop; width is 100% of the parent (responsive).
 *
 * The curve uses a simple monotonic Bezier (each pair of points is connected
 * by a cubic curve whose control points sit at the midpoint x of the two
 * points and the y of each endpoint). This produces a smooth-but-stable curve
 * with no overshoot — the same approach used in the design prototype.
 */
import React from 'react';

export type MobileSparklineTone = 'primary' | 'success' | 'warning' | 'destructive';

interface MobileSparklineProps {
  /** Series of numeric values, plotted left → right. Minimum 2 points. */
  values: number[];
  /** Color tone for the line + dot. Maps to design tokens. */
  tone?: MobileSparklineTone;
  /** Height of the SVG in CSS pixels. Defaults to 30. */
  height?: number;
  /** Whether to render the area fill under the line. Defaults to true. */
  fill?: boolean;
}

const TONE_TO_STROKE: Record<MobileSparklineTone, string> = {
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

export const MobileSparkline: React.FC<MobileSparklineProps> = ({
  values,
  tone = 'primary',
  height = 30,
  fill = true,
}) => {
  // Internal viewBox dimensions. Width is fixed at 100 so the curve scales
  // smoothly to whatever pixel width the parent gives us via preserveAspectRatio="none".
  const W = 100;
  const H = height;
  const padX = 2;
  const padY = 4;

  const safeValues = values.length > 0 ? values : [0, 0];
  const min = Math.min(...safeValues);
  const max = Math.max(...safeValues);
  const range = max - min || 1;
  const stepX = (W - padX * 2) / Math.max(1, safeValues.length - 1);

  const pts: [number, number][] = safeValues.map((v, i) => [
    padX + i * stepX,
    padY + (H - padY * 2) * (1 - (v - min) / range),
  ]);
  const path = buildSmoothPath(pts);
  const stroke = TONE_TO_STROKE[tone];
  const last = pts[pts.length - 1];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ width: '100%', height, overflow: 'visible' }}
      aria-hidden="true"
    >
      {fill && (
        <path
          d={`${path} L ${W - padX},${H - padY} L ${padX},${H - padY} Z`}
          fill={stroke}
          opacity={0.1}
        />
      )}
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {last && (
        <circle cx={last[0]} cy={last[1]} r={2.2} fill={stroke} />
      )}
    </svg>
  );
};

export default MobileSparkline;
