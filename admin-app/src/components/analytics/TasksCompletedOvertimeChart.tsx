import React from 'react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList } from 'recharts';
import { TimeSeriesDataPoint } from '@/types/analytics';
import { ChartCard } from './ChartCard';
import { trimLeadingEmptyPeriods } from '@/utils/chartDataUtils';

interface TasksCompletedOvertimeChartProps {
  data: TimeSeriesDataPoint[];
  onBarClick?: (period: string, dataKey: string) => void;
}

const chartConfig = {
  "Tasks Completed": {
    label: "Tasks Completed",
    color: "hsl(var(--chart-1))",
  },
} satisfies Record<string, { label: string; color: string }>;

export const TasksCompletedOvertimeChart: React.FC<TasksCompletedOvertimeChartProps> = ({ 
  data, 
  onBarClick 
}) => {
  const handleClick = (data: any) => {
    if (onBarClick && data?.period) {
      onBarClick(data.period, 'Tasks Completed');
    }
  };

  // Remove leading empty periods and filter out periods with no data
  const trimmedData = trimLeadingEmptyPeriods(data, ["Tasks Completed"])
    .filter(item => item["Tasks Completed"] !== 0);

  if (trimmedData.length === 0) {
    return (
      <ChartCard 
        title="Tasks Completed Over Time" 
        subtitle="Track task completion trends"
      >
        <div className="flex items-center justify-center h-[420px] text-sm text-muted-foreground">
          No tasks data available for the selected period
        </div>
      </ChartCard>
    );
  }

  return (
    <ChartCard 
      title="Tasks Completed Over Time" 
      subtitle="Number of tasks completed per period"
      tooltip="Shows the total count of tasks marked as done in each time period"
    >
      <ChartContainer config={chartConfig} className="h-[420px] w-full">
        <ResponsiveContainer width="100%" height="100%" minHeight={420}>
          <BarChart data={trimmedData} margin={{ top: 40, right: 20, left: 20, bottom: 10 }}>
            <defs>
              <linearGradient id="gradientBlue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--chart-1))" />
                <stop offset="100%" stopColor="hsl(var(--chart-1) / 0.8)" />
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
              label={{ 
                value: 'Tasks Completed', 
                angle: -90, 
                position: 'insideLeft', 
                style: { fontSize: 13, fill: 'hsl(var(--muted-foreground))' } 
              }}
              allowDecimals={false}
            />
            <ChartTooltip 
              content={
                <ChartTooltipContent 
                  indicator="dot"
                  className="border-0 shadow-md bg-background/95 backdrop-blur-sm rounded-lg p-3"
                  labelClassName="text-sm font-medium mb-1"
                />
              } 
            />
            <Bar 
              dataKey="Tasks Completed" 
              fill="url(#gradientBlue)"
              radius={[6, 6, 0, 0]}
              onClick={handleClick}
              cursor="pointer"
              animationDuration={250}
            >
              <LabelList 
                dataKey="Tasks Completed" 
                position="top" 
                fill="hsl(var(--foreground))"
                fontSize={12}
                fontWeight={500}
                content={(props: any) => {
                  const { x, y, width, value } = props;
                  if (value === 0 || value === null || value === undefined) return null;
                  return (
                    <text 
                      x={x + width / 2} 
                      y={y - 4} 
                      fill="hsl(var(--foreground))" 
                      textAnchor="middle"
                      fontSize={12}
                      fontWeight={500}
                    >
                      {Math.round(value)}
                    </text>
                  );
                }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </ChartCard>
  );
};
