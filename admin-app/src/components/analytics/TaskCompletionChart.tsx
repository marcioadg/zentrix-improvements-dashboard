import React from 'react';
import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { TimeSeriesDataPoint } from '@/types/analytics';
import { ChartCard } from './ChartCard';
import { trimLeadingEmptyPeriods } from '@/utils/chartDataUtils';

interface TaskCompletionChartProps {
  data: TimeSeriesDataPoint[];
  onBarClick?: (period: string, dataKey: string) => void;
}

const chartConfig = {
  "On Time": {
    label: "On Time",
    color: "var(--success)",
  },
  "Late": {
    label: "Late",
    color: "var(--error)",
  },
} satisfies Record<string, { label: string; color: string }>;

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="border-0 shadow-md bg-background/95 backdrop-blur-sm rounded-lg p-3">
      <p className="text-sm font-medium mb-1">{label}</p>
      <div className="space-y-1">
        {payload.map((entry: any) => {
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

export const TaskCompletionChart: React.FC<TaskCompletionChartProps> = ({ data, onBarClick }) => {
  const handleClick = (data: any, dataKey: string) => {
    if (onBarClick && data?.period) {
      onBarClick(data.period, dataKey);
    }
  };

  // Data already comes as percentages from backend, use directly
  const transformedData = data;
  
  // Remove leading empty periods
  const trimmedData = trimLeadingEmptyPeriods(transformedData, ["On Time", "Late"]);

  if (trimmedData.length === 0) {
    return (
      <ChartCard title="Task Completion Status" subtitle="Track task delivery performance">
        <div className="flex items-center justify-center h-[420px] text-sm text-muted-foreground">
          No task completion data available for the selected period
        </div>
      </ChartCard>
    );
  }

  return (
    <ChartCard 
      title="Task Completion Status" 
      subtitle="Breakdown of task delivery timing"
      tooltip="Shows the distribution of tasks completed on time, late, and overdue"
    >
      <ChartContainer config={chartConfig} className="h-[420px] w-full">
        <ResponsiveContainer width="100%" height="100%" minHeight={420}>
          <BarChart data={trimmedData} margin={{ top: 40, right: 20, left: 20, bottom: 10 }}>
            <defs>
              <linearGradient id="gradientGreen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--success)" />
                <stop offset="100%" stopColor="var(--success)" stopOpacity={0.7} />
              </linearGradient>
              <linearGradient id="gradientRed" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--error)" />
                <stop offset="100%" stopColor="var(--error)" stopOpacity={0.7} />
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
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
              label={{ value: 'Percentage', angle: -90, position: 'insideLeft', style: { fontSize: 13, fill: 'hsl(var(--muted-foreground))' } }}
            />
            <ChartTooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="On Time" 
              stackId="a" 
              fill="url(#gradientGreen)"
              radius={[0, 0, 0, 0]}
              animationDuration={250}
              onClick={(data) => handleClick(data, 'On Time')}
              cursor="pointer"
            />
            <Bar 
              dataKey="Late" 
              stackId="a" 
              fill="url(#gradientRed)"
              radius={[6, 6, 0, 0]}
              animationDuration={250}
              onClick={(data) => handleClick(data, 'Late')}
              cursor="pointer"
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </ChartCard>
  );
};
