import React from 'react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, LabelList } from 'recharts';
import { TimeSeriesDataPoint } from '@/types/analytics';
import { ChartCard } from './ChartCard';
import { Clock } from 'lucide-react';
import { trimLeadingEmptyPeriods } from '@/utils/chartDataUtils';

interface ScorecardsAnalyticsChartProps {
  data: TimeSeriesDataPoint[];
  onBarClick?: (period: string) => void;
}

const chartConfig = {
  "On Track": {
    label: "On Track",
    color: "hsl(var(--chart-2))",
  },
} satisfies Record<string, { label: string; color: string }>;

export const ScorecardsAnalyticsChart: React.FC<ScorecardsAnalyticsChartProps> = ({ data, onBarClick }) => {
  const handleClick = (data: any) => {
    if (onBarClick && data?.period) {
      onBarClick(data.period);
    }
  };
  
  // Remove leading empty periods
  const trimmedData = trimLeadingEmptyPeriods(data, ["On Track"]);
  
  if (trimmedData.length === 0) {
    return (
      <ChartCard title="Scorecards Performance" subtitle="Track scorecard health">
        <div className="flex items-center justify-center h-[420px] text-muted-foreground">
          No scorecard data available for the selected period
        </div>
      </ChartCard>
    );
  }

  // Calculate dynamic Y-axis domain with buffer
  const values = trimmedData.map(item => item["On Track"] as number);
  const maxValue = Math.max(...values);
  // For percentages: max at 100% unless data exceeds it
  const yAxisMax = maxValue > 100 ? Math.ceil(maxValue * 1.2) : 100;

  return (
    <ChartCard 
      title="Scorecards Performance" 
      subtitle="Percentage of scorecards on track"
      tooltip="Displays the percentage of scorecards that are meeting their targets over time"
    >
      <ChartContainer config={chartConfig} className="h-[420px] w-full">
        <ResponsiveContainer width="100%" height="100%" minHeight={420}>
          <BarChart data={trimmedData} margin={{ top: 40, right: 20, left: 20, bottom: 10 }}>
            <defs>
              <linearGradient id="gradientGreen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--chart-2))" />
                <stop offset="100%" stopColor="hsl(var(--chart-2) / 0.8)" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted/10" vertical={false} />
            <XAxis 
              dataKey="period" 
              tick={{ fill: 'var(--muted-foreground)', fontSize: 13 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              domain={[0, yAxisMax]}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 13 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
              label={{ value: 'On Track %', angle: -90, position: 'insideLeft', style: { fontSize: 13, fill: 'hsl(var(--muted-foreground))' } }}
            />
            <ChartTooltip 
              content={({ active, payload }) => {
                if (active && payload?.[0]) {
                  const data = payload[0].payload as TimeSeriesDataPoint;
                  const color = chartConfig["On Track"].color;
                  return (
                    <div className="rounded-lg border-0 bg-background/95 backdrop-blur-sm p-3 shadow-md">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium mb-1">{data.period}</span>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                          <span className="text-sm font-semibold">{Number(data["On Track"]).toFixed(1)}%</span>
                          {data.isLastKnown && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground ml-1">
                              <Clock className="h-3 w-3" />
                              <span>Last known</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar 
              dataKey="On Track" 
              fill="url(#gradientGreen)"
              radius={[6, 6, 0, 0]}
              onClick={handleClick}
              cursor="pointer"
              animationDuration={250}
            >
              {trimmedData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`} 
                  opacity={entry.isLastKnown ? 0.5 : 1}
                  strokeDasharray={entry.isLastKnown ? "5,5" : "0"}
                  stroke={entry.isLastKnown ? "hsl(var(--chart-2))" : "none"}
                  strokeWidth={entry.isLastKnown ? 2 : 0}
                />
              ))}
              <LabelList 
                dataKey="On Track" 
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
                      {Math.round(value)}%
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
