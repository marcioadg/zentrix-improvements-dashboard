
import React from 'react';
import { TimeSeriesDataPoint } from '@/types/analytics';
import { ChartCard } from './ChartCard';
import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { ResponsiveContainer, BarChart, XAxis, YAxis, Bar, LabelList } from 'recharts';
import { trimLeadingEmptyPeriods } from '@/utils/chartDataUtils';

interface MetricsPerformanceChartProps {
  data: TimeSeriesDataPoint[];
  onBarClick?: (period: string) => void;
}

const chartConfig = {
  "On Track": {
    label: "On Track",
    color: "var(--success)",
  },
};

export const MetricsPerformanceChart: React.FC<MetricsPerformanceChartProps> = ({ data, onBarClick }) => {
  const trimmedData = trimLeadingEmptyPeriods(data, ['On Track']);
  
  if (!trimmedData || trimmedData.length === 0) {
    return (
      <ChartCard
        title="Metrics Performance"
        subtitle="Percentage of metrics on track"
      >
        <div className="flex items-center justify-center h-[420px] text-muted-foreground">
          No metrics data available for the selected period
        </div>
      </ChartCard>
    );
  }

  // Calculate dynamic max for Y-axis
  const maxValue = Math.max(...trimmedData.map(d => {
    const val = d["On Track"];
    return typeof val === 'number' ? val : 0;
  }));
  const yAxisMax = maxValue > 100 ? Math.ceil(maxValue / 10) * 10 : 100;

  const handleClick = (data: any) => {
    if (onBarClick && data?.period) {
      onBarClick(data.period);
    }
  };

  return (
    <ChartCard
      title="Metrics Performance"
      subtitle="Percentage of metrics on track"
    >
      <ChartContainer config={chartConfig} className="h-[420px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={trimmedData}
            style={{ cursor: onBarClick ? 'pointer' : 'default' }}
          >
            <XAxis 
              dataKey="period" 
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            />
            <YAxis 
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              domain={[0, yAxisMax]}
              tickFormatter={(value) => `${value}%`}
            />
            <ChartTooltip
              cursor={{ fill: 'hsl(var(--muted) / 0.3)' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg p-3">
                      <p className="font-medium mb-1">{data.period}</p>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-sm" 
                          style={{ backgroundColor: chartConfig["On Track"].color }}
                        />
                        <span className="text-sm">On Track: {data["On Track"]}%</span>
                      </div>
                      {data.isLastKnown && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Most recent data
                        </p>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar
              dataKey="On Track"
              fill={chartConfig["On Track"].color}
              radius={[4, 4, 0, 0]}
              className="transition-opacity hover:opacity-80"
              onClick={handleClick}
              cursor="pointer"
            >
              <LabelList
                dataKey="On Track"
                position="top"
                formatter={(value: number) => `${Math.round(value)}%`}
                style={{
                  fill: 'hsl(var(--foreground))',
                  fontSize: '12px',
                  fontWeight: 500,
                }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </ChartCard>
  );
};
