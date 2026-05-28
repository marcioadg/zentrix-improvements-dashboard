import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart3, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMetricsOverview } from '@/hooks/useMetricsOverview';

export const MetricsOverview: React.FC = () => {
  const { myMetrics, loading } = useMetricsOverview();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on-track':
        return 'bg-status-success/10 text-status-success border-status-success/20';
      case 'ahead':
        return 'bg-accent/10 text-accent border-accent/20';
      case 'behind':
        return 'bg-status-error/10 text-status-error border-status-error/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'on-track':
        return <CheckCircle className="w-3 h-3" />;
      case 'ahead':
        return <TrendingUp className="w-3 h-3" />;
      case 'behind':
        return <AlertTriangle className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'on-track':
        return 'On Track';
      case 'ahead':
        return 'Ahead';
      case 'behind':
        return 'Behind';
      default:
        return 'No Target';
    }
  };

  if (loading) {
    return (
      <Card className="h-[400px]">
        <CardHeader>
          <CardTitle>My Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-muted rounded">
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-muted-foreground/20 rounded w-32" />
                  <div className="h-3 bg-muted-foreground/20 rounded w-20" />
                </div>
                <div className="space-y-1">
                  <div className="h-6 bg-muted-foreground/20 rounded w-16" />
                  <div className="h-4 bg-muted-foreground/20 rounded w-12" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-[400px]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>My Metrics</CardTitle>
        <Button variant="outline" size="sm" asChild className="text-muted-foreground border-border hover:text-foreground hover:border-border">
          <Link to="/metrics">
            View All
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 overflow-y-auto max-h-[320px]">
        {myMetrics.map((metric) => (
          <div key={metric.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-sm font-medium truncate">{metric.name}</h4>
                <Badge 
                  variant="outline" 
                  className={`text-xs px-2 py-0 ${getStatusColor(metric.status)}`}
                >
                  {getStatusIcon(metric.status)}
                  <span className="ml-1">{getStatusText(metric.status)}</span>
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">{metric.teamName}</p>
            </div>
            <div className="text-right ml-3">
              <div className="text-lg font-bold">
                {metric.value} {metric.unit}
              </div>
              {metric.target && (
                <div className="text-xs text-muted-foreground">
                  Target: {metric.target} {metric.unit}
                </div>
              )}
            </div>
          </div>
        ))}
        {myMetrics.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
            <BarChart3 className="h-8 w-8 text-muted-foreground" />
            <p className="text-[14px] font-medium text-foreground">No metrics assigned to you</p>
            <p className="text-[13px] text-muted-foreground">Track your key results by adding metrics</p>
            <Button variant="outline" size="sm" asChild>
              <Link to="/metrics">Add Metrics</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};