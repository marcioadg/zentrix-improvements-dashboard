import React from 'react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, LabelList } from 'recharts';
import { TimeSeriesDataPoint } from '@/types/analytics';
import { ChartCard } from './ChartCard';
import { trimLeadingEmptyPeriods } from '@/utils/chartDataUtils';

interface TasksToIssuesRatioChartProps {
  data: TimeSeriesDataPoint[];
  onPointClick?: (period: string) => void;
}

const chartConfig = {
  "Percentage": {
    label: "Tasks per Issue %",
    color: "hsl(var(--chart-3))",
  },
} satisfies Record<string, { label: string; color: string }>;

export const TasksToIssuesRatioChart: React.FC<TasksToIssuesRatioChartProps> = ({ data, onPointClick }) => {
  const handleClick = (data: any) => {
    if (onPointClick && data?.period) {
      onPointClick(data.period);
    }
  };
  // Transform data to calculate percentage (ratio * 100)
  const ratioData = data.map(item => {
    const tasksCreated = Number(item['Tasks Created']) || 0;
    const issuesSolved = Number(item['Issues Solved']) || 0;
    
    // Calculate ratio then convert to percentage
    let percentage: number;
    if (issuesSolved === 0) {
      percentage = tasksCreated > 0 ? tasksCreated * 100 : 0;
    } else {
      percentage = (tasksCreated / issuesSolved) * 100;
    }
    
    return {
      ...item,
      Percentage: Math.round(percentage), // Round to whole number
    };
  });
  
  // Remove leading empty periods and filter out periods with no meetings (0%)
  const trimmedData = trimLeadingEmptyPeriods(ratioData, ["Percentage"])
    .filter(item => item.Percentage !== 0);
  
  if (trimmedData.length === 0) {
    return (
      <ChartCard title="Tasks per Issue" subtitle="Percentage of tasks created per issue solved">
        <div className="flex items-center justify-center h-[420px] text-muted-foreground">
          No data available for the selected period
        </div>
      </ChartCard>
    );
  }

  // Check if all values are zero
  const hasNoData = trimmedData.every(item => item.Percentage === 0);
  
  if (hasNoData) {
    return (
      <ChartCard title="Tasks per Issue" subtitle="Percentage of tasks created per issue solved">
        <div className="flex flex-col items-center justify-center h-[420px] text-center px-4">
          <p className="text-muted-foreground mb-2">No data available yet</p>
          <p className="text-sm text-muted-foreground/70">Data will appear once meetings generate tasks and resolve issues</p>
        </div>
      </ChartCard>
    );
  }

  // Calculate dynamic Y-axis domain with buffer
  const values = trimmedData.map(item => item.Percentage as number);
  const maxValue = Math.max(...values);
  const yAxisMax = Math.ceil(maxValue * 1.2) || 100; // 20% buffer, min 100

  return (
    <ChartCard 
      title="Tasks per Issue" 
      subtitle="Percentage of tasks created per issue solved"
      tooltip="Shows the percentage of tasks generated relative to issues resolved. 100% = 1 task per issue, 200% = 2 tasks per issue."
    >
      <ChartContainer config={chartConfig} className="h-[420px] w-full">
        <ResponsiveContainer width="100%" height="100%" minHeight={420}>
          <LineChart data={trimmedData} margin={{ top: 40, right: 20, left: 20, bottom: 10 }}>
            <defs>
              <linearGradient id="gradientPurple" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--chart-3))" />
                <stop offset="100%" stopColor="hsl(var(--chart-3) / 0.8)" />
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
              domain={[0, yAxisMax]}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 13 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
              tickFormatter={(value) => `${value}%`}
              label={{ value: 'Percentage', angle: -90, position: 'insideLeft', style: { fontSize: 13, fill: 'hsl(var(--muted-foreground))' } }}
            />
            <ChartTooltip 
              content={
                <ChartTooltipContent 
                  indicator="dot" 
                  className="border-0 shadow-md bg-background/95 backdrop-blur-sm rounded-lg p-3"
                  labelClassName="text-sm font-medium mb-1"
                  formatter={(value) => [`${value}%`, 'Tasks per Issue']}
                />
              } 
            />
            <Line 
              type="monotone"
              dataKey="Percentage" 
              stroke="url(#gradientPurple)"
              strokeWidth={3}
              dot={{ fill: 'hsl(var(--chart-3))', strokeWidth: 2, r: 5, cursor: onPointClick ? 'pointer' : undefined }}
              activeDot={{ fill: 'hsl(var(--chart-3) / 0.8)', strokeWidth: 0, r: 7, cursor: onPointClick ? 'pointer' : undefined, onClick: handleClick }}
              animationDuration={250}
            >
              <LabelList 
                dataKey="Percentage" 
                position="top" 
                fill="hsl(var(--foreground))"
                fontSize={12}
                fontWeight={500}
                content={(props: any) => {
                  const { x, y, value } = props;
                  if (value === 0 || value === null || value === undefined) return null;
                  return (
                    <text 
                      x={x} 
                      y={y - 10} 
                      fill="hsl(var(--foreground))" 
                      textAnchor="middle"
                      fontSize={12}
                      fontWeight={500}
                    >
                      {value}%
                    </text>
                  );
                }}
              />
            </Line>
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>
    </ChartCard>
  );
};
