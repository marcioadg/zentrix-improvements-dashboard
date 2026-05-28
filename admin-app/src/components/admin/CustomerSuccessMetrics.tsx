import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingDown, Wallet, Users, Activity, BarChart3, ArrowRightLeft, Percent } from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { CustomerSuccessMetrics, MRRGrowthDataPoint, UsageDataPoint, ConversionRateResult } from '@/services/customerSuccessAnalytics';
import { calculateConversionRate, calculateOverallConversionRate } from '@/services/customerSuccessAnalytics';
import type { DrilldownType } from './CustomerSuccessKPIDrilldownModal';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

interface CustomerSuccessMetricsProps {
  metrics: CustomerSuccessMetrics;
  mrrGrowthData: MRRGrowthDataPoint[];
  usageData: UsageDataPoint[];
  onCardClick?: (type: DrilldownType) => void;
}

export const CustomerSuccessMetricsComponent: React.FC<CustomerSuccessMetricsProps> = ({
  metrics,
  mrrGrowthData,
  usageData,
  onCardClick,
}) => {
  const [conversionPeriod, setConversionPeriod] = useState('30');
  const [conversionData, setConversionData] = useState<ConversionRateResult>({ rate: 0, totalTrials: 0, converted: 0 });
  const [conversionLoading, setConversionLoading] = useState(true);
  const [overallConversion, setOverallConversion] = useState<ConversionRateResult>({ rate: 0, totalTrials: 0, converted: 0 });
  const [overallLoading, setOverallLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setConversionLoading(true);
      const result = await calculateConversionRate(parseInt(conversionPeriod));
      setConversionData(result);
      setConversionLoading(false);
    };
    load();
  }, [conversionPeriod]);

  useEffect(() => {
    const load = async () => {
      const result = await calculateOverallConversionRate();
      setOverallConversion(result);
      setOverallLoading(false);
    };
    load();
  }, []);

  const healthDistributionData = [
    { name: 'Unhealthy', value: metrics.healthDistribution['Unhealthy'] || 0, color: 'var(--destructive)' },
    { name: 'Not Good', value: metrics.healthDistribution['Not Good'] || 0, color: 'var(--warning)' },
    { name: 'Not bad/Not good', value: metrics.healthDistribution['Not bad/ Not good'] || 0, color: 'hsl(var(--chart-3))' },
    { name: 'Fine', value: metrics.healthDistribution['Fine'] || 0, color: 'hsl(var(--chart-2))' },
    { name: 'Healthy', value: metrics.healthDistribution['Healthy'] || 0, color: 'var(--success)' },
    { name: 'Unknown', value: metrics.healthDistribution['Unknown'] || 0, color: 'hsl(var(--muted))' },
  ];

  const cardBaseClasses = "border-2 border-border/30 hover:border-primary/50 transition-all cursor-pointer hover:shadow-md";

  return (
    <div className="space-y-6 mb-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-8 gap-4">
        <Card 
          className={cardBaseClasses}
          onClick={() => onCardClick?.('mrr')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total MRR</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.totalMRR.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Click to see breakdown</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-border/30 hover:border-border/60 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ARPA</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.arpa.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Avg Revenue / Account</p>
          </CardContent>
        </Card>

        <Card 
          className={cardBaseClasses}
          onClick={() => onCardClick?.('churn')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.churnRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Click to see churned</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-border/30 hover:border-border/60 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg LTV</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.averageLTV.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">Lifetime Value</p>
          </CardContent>
        </Card>

        <Card 
          className={cardBaseClasses}
          onClick={() => onCardClick?.('active')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paying Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.payingCustomers}
              <span className="text-base font-normal text-muted-foreground ml-1">
                ({metrics.payingCustomersOnTime} on time)
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Click to see list</p>
          </CardContent>
        </Card>

        <Card 
          className={cardBaseClasses}
          onClick={() => onCardClick?.('atRisk')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">At-Risk Customers</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.atRiskCustomers}</div>
            <p className="text-xs text-muted-foreground">Click to see list</p>
          </CardContent>
        </Card>

        {/* Conversion Rate Card */}
        <Card className="border-2 border-border/30 hover:border-border/60 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {conversionLoading ? (
              <div className="h-8 w-24 bg-muted animate-pulse rounded" />
            ) : (
              <>
                <div className="text-2xl font-bold">{conversionData.rate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">
                  {conversionData.converted}/{conversionData.totalTrials} trials → paid
                </p>
              </>
            )}
            <ToggleGroup 
              type="single" 
              value={conversionPeriod} 
              onValueChange={(v) => v && setConversionPeriod(v)}
              className="mt-2 justify-start"
              size="sm"
            >
              <ToggleGroupItem value="7" className="text-xs px-2 h-6">7d</ToggleGroupItem>
              <ToggleGroupItem value="14" className="text-xs px-2 h-6">14d</ToggleGroupItem>
              <ToggleGroupItem value="30" className="text-xs px-2 h-6">30d</ToggleGroupItem>
            </ToggleGroup>
          </CardContent>
        </Card>

        {/* Overall Conversion Rate Card */}
        <Card className="border-2 border-border/30 hover:border-border/60 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Conversion</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {overallLoading ? (
              <div className="h-8 w-24 bg-muted animate-pulse rounded" />
            ) : (
              <>
                <div className="text-2xl font-bold">{overallConversion.rate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">
                  {overallConversion.converted}/{overallConversion.totalTrials} all-time
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Health Score Distribution */}
        <Card className="border-2 border-border/30">
          <CardHeader>
            <CardTitle>Health Score Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={healthDistributionData} margin={{ bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis 
                  dataKey="name" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={0}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} minPointSize={2}>
                  {healthDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* MRR Growth Over Time */}
        <Card className="border-2 border-border/30">
          <CardHeader>
            <CardTitle>MRR Growth Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={mrrGrowthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis 
                  dataKey="month" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`$${value}`, 'MRR']}
                />
                <Line 
                  type="monotone" 
                  dataKey="mrr" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Usage Hours Chart */}
      <Card className="border-2 border-border/30">
        <CardHeader>
          <CardTitle>Top 10 Companies by Usage Hours (7 days)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={usageData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis 
                type="number" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis 
                dataKey="company_name" 
                type="category" 
                width={150}
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [`${value.toFixed(1)}h`, 'Usage']}
              />
              <Bar 
                dataKey="usage_hours" 
                fill="hsl(var(--chart-4))" 
                radius={[0, 8, 8, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
