/**
 * Barrel exports for mobile analytics components.
 *
 * All components in this folder are mobile-only — paired with src/pages/AnalyticsMobile.tsx.
 * They have no shared code path with the desktop analytics components under
 * src/components/analytics/, by design (strict isolation between desktop and
 * mobile UI).
 */
export { MobileAnalyticsHeader } from './MobileAnalyticsHeader';

export { MobileKPICard } from './MobileKPICard';
export type { MobileKPI, MobileKPITone } from './MobileKPICard';

export { MobileSparkline } from './MobileSparkline';
export type { MobileSparklineTone } from './MobileSparkline';

export { MobileLineChart } from './MobileLineChart';
export type { MobileLineChartPoint, MobileLineChartTone } from './MobileLineChart';

export { MobileAreaChart } from './MobileAreaChart';

export { MobileStackedBarChart } from './MobileStackedBarChart';
export type { MobileStackedBarPoint } from './MobileStackedBarChart';

export { MobileBarChart } from './MobileBarChart';
export type { MobileBarPoint, MobileBarTone } from './MobileBarChart';

export { MobileHBarChart } from './MobileHBarChart';
export type { MobileHBarRow, MobileHBarTone } from './MobileHBarChart';

export { MobileChartCard } from './MobileChartCard';

export { MobileAnalyticsFilterSheet, TIMEFRAME_OPTIONS, FREQUENCY_OPTIONS } from './MobileAnalyticsFilterSheet';
export type {
  AnalyticsFilterValues,
  AnalyticsTimeframe,
  AnalyticsFrequency,
  TeamOption,
} from './MobileAnalyticsFilterSheet';

export { MobileDrillDownSheet } from './MobileDrillDownSheet';
