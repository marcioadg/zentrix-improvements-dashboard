import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Activity, RefreshCw, Users, DollarSign, Clock } from 'lucide-react';
import { useBillingMonitoring } from '@/hooks/useBillingMonitoring';
import { formatDistanceToNow } from 'date-fns';
import { logger } from '@/utils/logger';

export const BillingRealtimeMonitor = () => {
  const { 
    metrics, 
    recentEvents, 
    loading, 
    isRealtimeConnected, 
    refreshAll, 
    triggerUsageReport 
  } = useBillingMonitoring();

  const handleTriggerUsageReport = async () => {
    try {
      await triggerUsageReport('manual_test');
    } catch (error) {
      logger.error('Failed to trigger usage report:', error);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading billing metrics...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Real-time Billing Monitor
          <Badge variant={isRealtimeConnected ? 'default' : 'destructive'}>
            {isRealtimeConnected ? 'Live' : 'Disconnected'}
          </Badge>
        </CardTitle>
        <CardDescription>
          Monitor your billing metrics and usage events in real-time
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Metrics */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <div className="font-semibold">{metrics.userCount} Users</div>
                <div className="text-sm text-muted-foreground">Current Usage: {metrics.currentUsage?.toFixed(2) || 0}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <DollarSign className="h-8 w-8 text-success" />
              <div>
                <div className="font-semibold">{metrics.subscriptionTier}</div>
                <div className="text-sm text-muted-foreground">
                  {metrics.billingType === 'usage_based' ? 'Usage-based' : 'Fixed'}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Clock className="h-8 w-8 text-primary" />
              <div>
                <div className="font-semibold">
                  {metrics.lastUsageUpdate 
                    ? formatDistanceToNow(new Date(metrics.lastUsageUpdate), { addSuffix: true })
                    : 'Never'
                  }
                </div>
                <div className="text-sm text-muted-foreground">Last Update</div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button onClick={refreshAll} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
          
          {metrics?.billingType === 'usage_based' && metrics?.stripeSubscriptionId && (
            <Button onClick={handleTriggerUsageReport} variant="outline" size="sm">
              <Activity className="h-4 w-4 mr-2" />
              Trigger Usage Report
            </Button>
          )}
        </div>

        {/* Recent Events */}
        <div>
          <h4 className="font-semibold mb-3">Recent Billing Events</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {recentEvents.length > 0 ? (
              recentEvents.map((event) => (
                <div key={event.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{event.eventType}</Badge>
                    <div>
                      <div className="text-sm font-medium">{event.notes}</div>
                      <div className="text-xs text-muted-foreground">
                        User: {event.userId.slice(0, 8)}... | {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {event.eventDate}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-muted-foreground p-6">
                No recent billing events
              </div>
            )}
          </div>
        </div>

        {/* Billing Fix Test - Temporary for testeforbilling91 fix */}
        {metrics?.companyId === 'ae345a8a-fdef-4cc5-9519-f959b680654c' && (
          <div className="border-t pt-4">
            <div className="text-sm font-medium text-warning mb-2">
              🔧 Billing Fix Available
            </div>
            <div className="text-xs text-muted-foreground mb-3">
              This company has $0 usage reported. Click below to fix the billing issue.
            </div>
            <Button 
              onClick={handleTriggerUsageReport} 
              variant="outline" 
              size="sm"
              className="w-full border-orange-200 text-orange-700 hover:bg-orange-50"
            >
              Fix Billing Issue Now
            </Button>
          </div>
        )}

        {/* Connection Status */}
        <div className="text-xs text-muted-foreground border-t pt-4">
          <div className="flex items-center justify-between">
            <span>Real-time Connection:</span>
            <Badge variant={isRealtimeConnected ? 'default' : 'destructive'} className="text-xs">
              {isRealtimeConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>
          {metrics?.stripeSubscriptionId && (
            <div className="flex items-center justify-between mt-1">
              <span>Stripe Subscription:</span>
              <span className="font-mono text-xs">{metrics.stripeSubscriptionId.slice(0, 12)}...</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};