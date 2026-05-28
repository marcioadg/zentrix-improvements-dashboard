import React from 'react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList } from 'recharts';
import { TimeSeriesDataPoint } from '@/types/analytics';
import { ChartCard } from './ChartCard';
import { trimLeadingEmptyPeriods } from '@/utils/chartDataUtils';

interface IssuesPerPersonOvertimeChartProps {
  data: TimeSeriesDataPoint[];
  onBarClick?: (period: string) => void;
}

const chartConfig = {
  "Issues Per Person": {
    label: "Issues Per Person",
    color: "hsl(var(--chart-5))",
  },
} satisfies Record<string, { label: string; color: string }>;

export const IssuesPerPersonOvertimeChart: React.FC<IssuesPerPersonOvertimeChartProps> = ({ 
  data, 
  onBarClick,
}) => {
  const handleClick = (data: any) => {
    if (onBarClick && data?.period) {
      onBarClick(data.period);
    }
  };
  // Remove leading empty periods and filter out periods with no data
  const trimmedData = trimLeadingEmptyPeriods(data, ["Issues Per Person"])
    .filter(item => item["Issues Per Person"] !== 0);

  if (trimmedData.length === 0) {
    return (
      <ChartCard 
        title="Issues Per Person" 
        subtitle="Track issue resolution per team member"
      >
        <div className="flex items-center justify-center h-[420px] text-sm text-muted-foreground">
          No data available for the selected period
        </div>
      </ChartCard>
    );
  }

  return (
    <ChartCard 
      title="Issues Per Person" 
      subtitle="Average issues resolved per active member"
      tooltip="Shows issues resolved divided by active company members for each period"
    >
      <ChartContainer config={chartConfig} className="h-[420px] w-full">
        <ResponsiveContainer width="100%" height="100%" minHeight={420}>
          <BarChart data={trimmedData} margin={{ top: 40, right: 20, left: 20, bottom: 10 }}>
            <defs>
              <linearGradient id="gradientOrange" x1="0" y1="0" x2="0" y2="1">
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
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 13 }}
              axisLine={false}
              tickLine={false}
              label={{ 
                value: 'Issues / Person', 
                angle: -90, 
                position: 'insideLeft', 
                style: { fontSize: 13, fill: 'hsl(var(--muted-foreground))' } 
              }}
              allowDecimals={true}
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
              dataKey="Issues Per Person" 
              fill="url(#gradientOrange)"
              radius={[6, 6, 0, 0]}
              onClick={handleClick}
              cursor={onBarClick ? "pointer" : undefined}
              animationDuration={250}
            >
              <LabelList 
                dataKey="Issues Per Person" 
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
                      {typeof value === 'number' ? value.toFixed(1) : value}
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
