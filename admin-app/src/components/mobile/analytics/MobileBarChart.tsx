/**
 * MobileBarChart — single-series bar chart. Thin wrapper around
 * MobileStackedBarChart with a single value per datum.
 */
import React from 'react';
import {
  MobileStackedBarChart,
  MobileStackedBarPoint,
} from './MobileStackedBarChart';

export interface MobileBarPoint {
  x: string;
  value: number;
}

export type MobileBarTone = 'primary' | 'success' | 'warning' | 'destructive';

interface MobileBarChartProps {
  data: MobileBarPoint[];
  tone?: MobileBarTone;
  height?: number;
  onBarTap?: (x: string, index: number) => void;
}

const TONE_TO_FILL: Record<MobileBarTone, string> = {
  primary: 'hsl(var(--primary))',
  success: 'var(--success)',
  warning: 'var(--warning)',
  destructive: 'var(--destructive)',
};

export const MobileBarChart: React.FC<MobileBarChartProps> = ({
  data,
  tone = 'primary',
  height,
  onBarTap,
}) => {
  const stacked: MobileStackedBarPoint[] = data.map((d) => ({
    x: d.x,
    values: [d.value],
  }));
  return (
    <MobileStackedBarChart
      data={stacked}
      seriesColors={[TONE_TO_FILL[tone]]}
      height={height}
      onBarTap={onBarTap}
    />
  );
};

export default MobileBarChart;
