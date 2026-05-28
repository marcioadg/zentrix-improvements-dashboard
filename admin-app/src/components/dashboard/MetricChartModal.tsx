import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { WeeklyMetricWithOwner } from '@/types/weeklyMetrics';

interface MetricChartModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metric: WeeklyMetricWithOwner;
  weekStarts: string[];
  periodMapping?: { [periodLabel: string]: string[] };
}

export const MetricChartModal: React.FC<MetricChartModalProps> = ({
  open,
  onOpenChange,
  metric,
  weekStarts,
  periodMapping,
}) => {
  // Always use original (granular) weekly values when available.
  // In grouped views (4-week, 13-week), the metric carries originalWeeklyValues
  // with individual week data, while weeklyValues has aggregated period values.
  const originalValues = (metric as any).originalWeeklyValues || metric.weeklyValues;

  // Determine the individual week dates to chart.
  // If periodMapping exists, flatten all original week dates from every period.
  // Otherwise, use weekStarts directly (already individual weeks).
  const allWeekDates = periodMapping
    ? [...new Set(Object.values(periodMapping).flat())].sort()
    : [...weekStarts].sort();

  // Prepare chart data - always show individual weekly data points
  const chartData = allWeekDates.map(weekStart => {
    const value = originalValues?.[weekStart] ?? null;
    let weekLabel = weekStart;

    try {
      const date = new Date(weekStart);
      if (!isNaN(date.getTime())) {
        weekLabel = format(date, 'MMM d');
      }
    } catch {
      weekLabel = weekStart;
    }

    return {
      week: weekLabel,
      value,
      target: metric.target_value,
      weekStart,
    };
  }).filter(item => item.value !== null && item.value !== undefined);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{metric.metric_name} - Trend Over Time</DialogTitle>
        </DialogHeader>
        
        <div className="h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="week" 
                className="fill-muted-foreground text-xs"
              />
              <YAxis 
                className="fill-muted-foreground text-xs"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
                formatter={(value: any, _name: string, props: any) => {
                  const label = props?.dataKey === 'value' ? 'Data' : 'Target';
                  return [`${value} ${metric.unit}`, label];
                }}
                labelFormatter={(_label: string, payload: any) => {
                  if (payload && payload.length > 0) {
                    const weekStart = payload[0].payload.weekStart;
                    try {
                      return format(new Date(weekStart), 'MMM d, yyyy');
                    } catch {
                      return weekStart;
                    }
                  }
                  return _label;
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                name="Data"
              />
              {metric.target_value && (
                <Line
                  type="monotone"
                  dataKey="target"
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Target"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Owner: {metric.owner}</span>
          <span>Unit: {metric.unit}</span>
          {metric.target_value && (
            <span>Target: {metric.target_value} {metric.unit}</span>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
