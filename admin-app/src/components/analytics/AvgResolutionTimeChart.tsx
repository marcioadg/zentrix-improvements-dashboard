import React from 'react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList } from 'recharts';
import { TimeSeriesDataPoint } from '@/types/analytics';
import { ChartCard } from './ChartCard';
import { trimLeadingEmptyPeriods } from '@/utils/chartDataUtils';

interface AvgResolutionTimeChartProps {
  data: TimeSeriesDataPoint[];
  onBarClick?: (period: string) => void;
}

const chartConfig = {
  "Avg Resolution Time": {
    label: "Avg Time Per Issue",
    color: "hsl(var(--chart-5))",
  },
} satisfies Record<string, { label: string; color: string }>;

export const AvgResolutionTimeChart: React.FC<AvgResolutionTimeChartProps> = ({ data, onBarClick }) => {
  const handleClick = (data: any) => {
    if (onBarClick && data?.period) {
      onBarClick(data.period);
    }
  };
  
  // Remove leading empty periods and filter out periods with no data
  const trimmedData = trimLeadingEmptyPeriods(data, ["Avg Resolution Time"])
    .filter(item => item["Avg Resolution Time"] !== 0);
  
  if (trimmedData.length === 0) {
    return (
      <ChartCard title="Avg Time Per Issue" subtitle="Track time spent discussing issues">
        <div className="flex items-center justify-center h-[420px] text-muted-foreground">
          No resolution time data available for the selected period
        </div>
      </ChartCard>
    );
  }

  // Calculate dynamic Y-axis domain with buffer
  const values = trimmedData.map(item => item["Avg Resolution Time"] as number);
  const maxValue = Math.max(...values);
  const yAxisMax = Math.ceil(maxValue * 1.2); // 20% buffer above max value

  return (
    <ChartCard 
      title="Avg Time Per Issue" 
      subtitle="Average time spent per issue in meetings (minutes)"
      tooltip="Shows the average time spent discussing each issue during the Issues section of meetings"
    >
      <ChartContainer config={chartConfig} className="h-[420px] w-full">
        <ResponsiveContainer width="100%" height="100%" minHeight={420}>
          <BarChart data={trimmedData} margin={{ top: 40, right: 20, left: 20, bottom: 10 }}>
            <defs>
              <linearGradient id="gradientAmber" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--chart-5))" />
                <stop offset="100%" stopColor="hsl(var(--chart-5) / 0.8)" />
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
              label={{ value: 'Minutes', angle: -90, position: 'insideLeft', style: { fontSize: 13, fill: 'hsl(var(--muted-foreground))' } }}
            />
            <ChartTooltip 
              content={
                <ChartTooltipContent 
                  indicator="dot"
                  formatter={(value) => `${Number(value).toFixed(1)} min`}
                  className="border-0 shadow-md bg-background/95 backdrop-blur-sm rounded-lg p-3"
                  labelClassName="text-sm font-medium mb-1"
                />
              } 
            />
            <Bar 
              dataKey="Avg Resolution Time" 
              fill="url(#gradientAmber)"
              radius={[6, 6, 0, 0]}
              onClick={handleClick}
              cursor="pointer"
              animationDuration={250}
            >
              <LabelList 
                dataKey="Avg Resolution Time" 
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
                      {value.toFixed(1)}
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
