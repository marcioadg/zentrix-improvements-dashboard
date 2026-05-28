import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnalyticsMetricCardProps {
  title: string;
  value: number | string;
  growth: number | null;
  icon: LucideIcon;
  prefix?: string;
  suffix?: string;
  loading?: boolean;
  decimals?: number;
  onClick?: () => void;
}

export const AnalyticsMetricCard: React.FC<AnalyticsMetricCardProps> = ({
  title,
  value,
  growth,
  icon: Icon,
  prefix = '',
  suffix = '',
  loading = false,
  decimals = 0,
  onClick
}) => {
  const formatValue = (val: number | string) => {
    if (typeof val === 'string') return val;
    return val.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  };

  const getGrowthColor = (growth: number) => {
    if (growth > 0) return '[color:var(--success)] [background:color-mix(in_srgb,var(--success)_12%,transparent)] [border-color:color-mix(in_srgb,var(--success)_25%,transparent)]';
    if (growth < 0) return '[color:var(--error)] [background:color-mix(in_srgb,var(--error)_12%,transparent)] [border-color:color-mix(in_srgb,var(--error)_25%,transparent)]';
    return 'text-muted-foreground bg-muted border-border';
  };

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) return TrendingUp;
    if (growth < 0) return TrendingDown;
    return Minus;
  };

  return (
    <Card 
      className={cn(
        "transition-all duration-200",
        onClick && "cursor-pointer hover:border-primary/50 hover:shadow-md"
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {loading ? (
            <div className="h-8 w-24 bg-muted animate-pulse rounded" />
          ) : (
            <div className="text-2xl font-bold">
              {prefix}{formatValue(value)}{suffix}
            </div>
          )}
          
          {growth !== null && !loading && (
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs font-medium",
                getGrowthColor(growth)
              )}
            >
              {React.createElement(getGrowthIcon(growth), { className: "h-3 w-3 inline mr-1" })}
              {growth > 0 ? '+' : ''}{growth.toFixed(1)}% (7d)
            </Badge>
          )}
          
          {growth === null && !loading && (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              No historical data
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
