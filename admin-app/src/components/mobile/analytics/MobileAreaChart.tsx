/**
 * MobileAreaChart — alias for MobileLineChart with area fill always on.
 * Provided as a separate component for clearer intent at call sites.
 */
import React from 'react';
import { MobileLineChart, MobileLineChartPoint, MobileLineChartTone } from './MobileLineChart';

interface MobileAreaChartProps {
  data: MobileLineChartPoint[];
  tone?: MobileLineChartTone;
  height?: number;
  domain?: [number, number];
  onPointTap?: (x: string, value: number, index: number) => void;
}

export const MobileAreaChart: React.FC<MobileAreaChartProps> = (props) => (
  <MobileLineChart {...props} area />
);

export default MobileAreaChart;
