import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Info, AlertCircle, X } from 'lucide-react';
import { useBillingAlerts } from '@/hooks/useBillingAlerts';

const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case 'critical':
    case 'error':
      return <AlertTriangle className="h-4 w-4 text-destructive" />;
    case 'warning':
      return <AlertCircle className="h-4 w-4 text-warning" />;
    case 'info':
    default:
      return <Info className="h-4 w-4 text-info" />;
  }
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'critical':
    case 'error':
      return 'destructive';
    case 'warning':
      return 'secondary';
    case 'info':
    default:
      return 'outline';
  }
};

export const BillingAlertsCard = () => {
  const { alerts, loading, resolveAlert } = useBillingAlerts();

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-muted rounded w-1/4 mb-2"></div>
            <div className="h-3 bg-muted rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (alerts.length === 0) {
    return null; // Don't show the card if there are no alerts
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertTriangle className="h-5 w-5" />
          Billing Alerts ({alerts.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30"
          >
            {getSeverityIcon(alert.severity)}
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant={getSeverityColor(alert.severity) as any}>
                  {alert.severity.toUpperCase()}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {alert.alert_type.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
              <p className="text-sm text-foreground">{alert.message}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(alert.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => resolveAlert(alert.id)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};