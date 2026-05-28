import React from 'react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList } from 'recharts';
import { TimeSeriesDataPoint } from '@/types/analytics';
import { ChartCard } from './ChartCard';
import { trimLeadingEmptyPeriods } from '@/utils/chartDataUtils';

interface MeetingRatingsChartProps {
  data: TimeSeriesDataPoint[];
  onBarClick?: (period: string) => void;
}

const chartConfig = {
  "Average Rating": {
    label: "Average Rating",
    color: "var(--accent)",
  },
} satisfies Record<string, { label: string; color: string }>;

export const MeetingRatingsChart: React.FC<MeetingRatingsChartProps> = ({ data, onBarClick }) => {
  const handleClick = (data: any) => {
    if (onBarClick && data?.period) {
      onBarClick(data.period);
    }
  };
  
  // Remove leading empty periods
  const trimmedData = trimLeadingEmptyPeriods(data, ["Average Rating"]);
  
  if (trimmedData.length === 0) {
    return (
      <ChartCard title="Meeting Ratings Over Time" subtitle="Track meeting satisfaction">
        <div className="flex items-center justify-center h-[420px] text-muted-foreground">
          No meeting ratings data available for the selected period
        </div>
      </ChartCard>
    );
  }

  return (
    <ChartCard 
      title="Meeting Ratings Over Time" 
      subtitle="Average participant satisfaction scores"
      tooltip="Shows the average rating given by meeting participants (scale 1-5)"
    >
      <ChartContainer config={chartConfig} className="h-[420px] w-full">
        <ResponsiveContainer width="100%" height="100%" minHeight={420}>
          <BarChart data={trimmedData} margin={{ top: 40, right: 20, left: 20, bottom: 10 }}>
            <defs>
              <linearGradient id="gradientBlue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.7} />
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
              domain={[0, 10]}
              label={{ value: 'Rating', angle: -90, position: 'insideLeft', style: { fontSize: 13, fill: 'hsl(var(--muted-foreground))' } }}
            />
            <ChartTooltip 
              content={
                <ChartTooltipContent 
                  indicator="dot" 
                  formatter={(value) => `${Number(value).toFixed(1)}/5`} 
                  className="border-0 shadow-md bg-background/95 backdrop-blur-sm rounded-lg p-3"
                  labelClassName="text-sm font-medium mb-1"
                />
              } 
            />
            <Bar 
              dataKey="Average Rating" 
              fill="url(#gradientBlue)"
              radius={[6, 6, 0, 0]}
              onClick={handleClick}
              cursor="pointer"
              animationDuration={250}
            >
              <LabelList 
                dataKey="Average Rating" 
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
