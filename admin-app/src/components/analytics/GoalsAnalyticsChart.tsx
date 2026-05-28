import React from 'react';
import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { TimeSeriesDataPoint } from '@/types/analytics';
import { ChartCard } from './ChartCard';

const GOAL_STATUS_KEYS = ["Completed", "On Track", "Off Track", "Canceled"] as const;
const EMPTY_PERIOD_KEY = "__isEmptyPeriod";
const EMPTY_PERIOD_PLACEHOLDER_KEY = "__emptyPeriodMarker";

interface GoalsAnalyticsChartProps {
  data: TimeSeriesDataPoint[];
  onBarClick?: (period: string, dataKey: string) => void;
}

const chartConfig = {
  "Completed": {
    label: "Completed",
    color: "var(--success)",
  },
  "On Track": {
    label: "On Track",
    color: "var(--accent)",
  },
  "Off Track": {
    label: "Off Track",
    color: "var(--error)",
  },
  "Canceled": {
    label: "Canceled",
    color: "hsl(var(--muted-foreground))",
  },
  [EMPTY_PERIOD_PLACEHOLDER_KEY]: {
    label: "No data",
    color: "hsl(var(--muted-foreground) / 0.35)",
  },
} satisfies Record<string, { label: string; color: string }>;

const toSafePercentage = (value: unknown): number => {
  const percentage = Number(value);
  return Number.isFinite(percentage) ? percentage : 0;
};

const normalizeGoalStatusData = (data: TimeSeriesDataPoint[]): TimeSeriesDataPoint[] => {
  return data.map((item) => {
    const normalizedStatuses = {
      Completed: toSafePercentage(item.Completed),
      "On Track": toSafePercentage(item["On Track"]),
      "Off Track": toSafePercentage(item["Off Track"]),
      Canceled: toSafePercentage(item.Canceled),
    };
    const isEmptyPeriod = GOAL_STATUS_KEYS.every((key) => normalizedStatuses[key] === 0);

    return {
      ...item,
      ...normalizedStatuses,
      [EMPTY_PERIOD_KEY]: isEmptyPeriod,
      [EMPTY_PERIOD_PLACEHOLDER_KEY]: isEmptyPeriod ? 1 : 0,
    };
  });
};

const EmptyPeriodPlaceholder = (props: any) => {
  const { x, y, width, payload } = props;
  if (!payload?.[EMPTY_PERIOD_KEY] || x == null || y == null || width == null) {
    return null;
  }

  const markerHeight = 4;
  const markerWidth = Math.max(Number(width) * 0.72, 10);
  const markerX = Number(x) + (Number(width) - markerWidth) / 2;

  return (
    <rect
      x={markerX}
      y={Number(y) - markerHeight}
      width={markerWidth}
      height={markerHeight}
      rx={2}
      fill="hsl(var(--muted-foreground) / 0.35)"
      pointerEvents="none"
    />
  );
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  const isEmptyPeriod = payload.some((entry: any) => entry.payload?.[EMPTY_PERIOD_KEY]);

  return (
    <div className="border-0 shadow-md bg-background/95 backdrop-blur-sm rounded-lg p-3">
      <p className="text-sm font-medium mb-1">{label}</p>
      <div className="space-y-1">
        {isEmptyPeriod ? (
          <p className="text-sm text-muted-foreground">
            No goal status data for this period
          </p>
        ) : payload.map((entry: any) => {
          if (entry.dataKey === EMPTY_PERIOD_PLACEHOLDER_KEY) return null;
          const value = Number(entry.value);
          if (value === 0) return null;
          
          return (
            <div key={entry.dataKey} className="flex items-center gap-2 text-sm">
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">{entry.dataKey}:</span>
              <span className="font-medium">{value.toFixed(1)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const GoalsAnalyticsChart: React.FC<GoalsAnalyticsChartProps> = ({ data, onBarClick }) => {
  const handleClick = (data: any, dataKey: string) => {
    if (onBarClick && data?.period && !data?.[EMPTY_PERIOD_KEY]) {
      onBarClick(data.period, dataKey);
    }
  };

  const chartData = normalizeGoalStatusData(data);

  if (chartData.length === 0) {
    return (
      <ChartCard title="Goals Status Over Time" subtitle="Track goal completion rates">
        <div className="flex items-center justify-center h-[420px] text-sm text-muted-foreground">
          No goals data available for the selected period
        </div>
      </ChartCard>
    );
  }

  return (
    <ChartCard 
      title="Goals Status Over Time" 
      subtitle="Percentage distribution of goal statuses"
      tooltip="Shows the percentage breakdown of goals by their completion status over time"
    >
      <ChartContainer config={chartConfig} className="h-[420px] w-full">
        <ResponsiveContainer width="100%" height="100%" minHeight={420}>
          <BarChart data={chartData} margin={{ top: 40, right: 20, left: 20, bottom: 10 }}>
            <defs>
              <linearGradient id="gradientGreen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--success)" />
                <stop offset="100%" stopColor="var(--success)" stopOpacity={0.7} />
              </linearGradient>
              <linearGradient id="gradientBlue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.7} />
              </linearGradient>
              <linearGradient id="gradientRed" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--error)" />
                <stop offset="100%" stopColor="var(--error)" stopOpacity={0.7} />
              </linearGradient>
              <linearGradient id="gradientGray" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--text-secondary)" />
                <stop offset="100%" stopColor="var(--text-muted)" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted/10" vertical={false} />
            <XAxis 
              dataKey="period" 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 13 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 13 }}
              axisLine={false}
              tickLine={false}
              label={{ value: 'Percentage', angle: -90, position: 'insideLeft', style: { fontSize: 13, fill: 'hsl(var(--muted-foreground))' } }}
              domain={[0, 100]}
              tickFormatter={(value) => Math.round(value).toString()}
            />
            <ChartTooltip content={<CustomTooltip />} />
            <Bar
              dataKey={EMPTY_PERIOD_PLACEHOLDER_KEY}
              fill="hsl(var(--muted-foreground) / 0.35)"
              maxBarSize={16}
              shape={<EmptyPeriodPlaceholder />}
              isAnimationActive={false}
            />
            <Bar 
              dataKey="Completed" 
              stackId="a" 
              fill="url(#gradientGreen)"
              radius={[0, 0, 0, 0]}
              animationDuration={250}
              onClick={(data) => handleClick(data, 'complete')}
              cursor="pointer"
            />
            <Bar 
              dataKey="On Track" 
              stackId="a" 
              fill="url(#gradientBlue)"
              radius={[0, 0, 0, 0]}
              animationDuration={250}
              onClick={(data) => handleClick(data, 'on_track')}
              cursor="pointer"
            />
            <Bar 
              dataKey="Off Track" 
              stackId="a" 
              fill="url(#gradientRed)"
              radius={[0, 0, 0, 0]}
              animationDuration={250}
              onClick={(data) => handleClick(data, 'off_track')}
              cursor="pointer"
            />
            <Bar 
              dataKey="Canceled" 
              stackId="a" 
              fill="url(#gradientGray)" 
              radius={[6, 6, 0, 0]}
              animationDuration={250}
              onClick={(data) => handleClick(data, 'canceled')}
              cursor="pointer"
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </ChartCard>
  );
};
