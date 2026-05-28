import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase, SUPABASE_URL } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Activity, TrendingUp, AlertCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { logger } from '@/utils/logger';

interface ActivityStats {
  today: number;
  week: number;
  successRate: string;
}

interface RecentLog {
  id: string;
  company_name: string;
  event_type: string;
  status_code: number;
  sent_at: string;
  error_message?: string;
}

interface EnabledCompany {
  id: string;
  company_name: string;
  is_enabled: boolean;
  created_at: string;
  last_test_at?: string;
}

export const PlatformWebhookConfig: React.FC = () => {
  const { toast } = useToast();
  const [isTesting, setIsTesting] = useState(false);
  const [activityStats, setActivityStats] = useState<ActivityStats | null>(null);
  const [recentLogs, setRecentLogs] = useState<RecentLog[]>([]);
  const [enabledCompanies, setEnabledCompanies] = useState<EnabledCompany[]>([]);
  const [loading, setLoading] = useState(true);

  const CRM_WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/receive-webhook-event`;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([
      fetchActivityStats(),
      fetchRecentLogs(),
      fetchEnabledCompanies()
    ]);
    setLoading(false);
  };

  const fetchActivityStats = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      // Today's events
      const { count: todayCount } = await supabase
        .from('webhook_activity_logs')
        .select('*', { count: 'exact', head: true })
        .gte('sent_at', today.toISOString());

      // This week's events
      const { count: weekCount } = await supabase
        .from('webhook_activity_logs')
        .select('*', { count: 'exact', head: true })
        .gte('sent_at', weekAgo.toISOString());

      // Success rate (today)
      const { data: todayStats } = await supabase
        .from('webhook_activity_logs')
        .select('status_code')
        .gte('sent_at', today.toISOString());

      const successCount = todayStats?.filter(s => s.status_code === 200).length || 0;
      const totalCount = todayStats?.length || 0;
      const successRate = totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 0;

      setActivityStats({
        today: todayCount || 0,
        week: weekCount || 0,
        successRate: `${successRate}%`
      });
    } catch (error) {
      logger.error('Error fetching activity stats:', error);
    }
  };

  const fetchRecentLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('webhook_activity_logs')
        .select(`
          id,
          event_type,
          status_code,
          sent_at,
          error_message,
          company_id,
          companies (name)
        `)
        .order('sent_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const logs = data?.map(log => ({
        id: log.id,
        company_name: (log.companies as any)?.name || 'Unknown',
        event_type: log.event_type,
        status_code: log.status_code,
        sent_at: log.sent_at,
        error_message: log.error_message
      })) || [];

      setRecentLogs(logs);
    } catch (error) {
      logger.error('Error fetching recent logs:', error);
    }
  };

  const fetchEnabledCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('webhook_configurations')
        .select(`
          id,
          is_enabled,
          created_at,
          last_test_at,
          company_id,
          companies (name)
        `)
        .eq('is_enabled', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const companies = data?.map(config => ({
        id: config.id,
        company_name: (config.companies as any)?.name || 'Unknown',
        is_enabled: config.is_enabled,
        created_at: config.created_at,
        last_test_at: config.last_test_at
      })) || [];

      setEnabledCompanies(companies);
    } catch (error) {
      logger.error('Error fetching enabled companies:', error);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    try {
      // Call the edge function with a test event
      const { data, error } = await supabase.functions.invoke('send-webhook-event', {
        body: {
          event_type: 'test_connection',
          event_data: {
            timestamp: new Date().toISOString(),
            source: 'platform_admin_test'
          }
        }
      });

      if (error) throw error;

      toast({
        title: 'Test Successful',
        description: 'Platform webhook connection is working correctly',
      });

      // Refresh data to show the test in logs
      await fetchData();
    } catch (error) {
      logger.error('Test connection error:', error);
      toast({
        title: 'Test Failed',
        description: error instanceof Error ? error.message : 'Failed to test connection',
        variant: 'destructive',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle>Platform CRM Integration</CardTitle>
          <CardDescription>
            Manage the centralized webhook connection to Zentrix CRM
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Webhook URL - Read Only */}
          <div>
            <Label>Webhook URL (Platform-Wide)</Label>
            <Input 
              value={CRM_WEBHOOK_URL}
              readOnly
              className="font-mono text-xs bg-muted"
            />
            <p className="text-xs text-muted-foreground mt-1">
              This URL is hardcoded in the platform edge function
            </p>
          </div>

          {/* API Key Status */}
          <div>
            <Label>API Key</Label>
            <div className="flex gap-2 items-center">
              <Input 
                value="Stored in Supabase Secrets"
                readOnly
                className="bg-muted"
              />
              <Badge variant="outline" className="whitespace-nowrap">
                CRM_API_KEY
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              API key is securely stored as a Supabase secret and accessed by edge functions
            </p>
          </div>

          {/* Test Connection */}
          <Button 
            onClick={handleTestConnection}
            disabled={isTesting}
            className="w-full"
          >
            {isTesting ? 'Testing...' : 'Test Platform Connection'}
          </Button>
        </CardContent>
      </Card>

      {/* Activity Stats Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Platform Activity Stats</CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchData}
              disabled={loading}
            >
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4 text-muted-foreground">Loading stats...</div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col items-center justify-center p-4 border rounded-lg">
                <Activity className="h-5 w-5 text-primary mb-2" />
                <p className="text-sm text-muted-foreground">Today</p>
                <p className="text-2xl font-bold">{activityStats?.today || 0}</p>
              </div>
              <div className="flex flex-col items-center justify-center p-4 border rounded-lg">
                <TrendingUp className="h-5 w-5 text-primary mb-2" />
                <p className="text-sm text-muted-foreground">This Week</p>
                <p className="text-2xl font-bold">{activityStats?.week || 0}</p>
              </div>
              <div className="flex flex-col items-center justify-center p-4 border rounded-lg">
                <CheckCircle className="h-5 w-5 text-primary mb-2" />
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">{activityStats?.successRate || '0%'}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity Card */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Webhook Activity</CardTitle>
          <CardDescription>Latest events sent across all companies</CardDescription>
        </CardHeader>
        <CardContent>
          {recentLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No webhook activity yet</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {recentLogs.map(log => (
                <div key={log.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{log.company_name}</p>
                    <p className="text-xs text-muted-foreground">{log.event_type}</p>
                    {log.error_message && (
                      <p className="text-xs text-destructive mt-1">{log.error_message}</p>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <Badge variant={log.status_code === 200 ? 'default' : 'destructive'}>
                      {log.status_code}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDateTime(log.sent_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Companies Using CRM Card */}
      <Card>
        <CardHeader>
          <CardTitle>Companies with CRM Enabled</CardTitle>
          <CardDescription>
            {enabledCompanies.length} {enabledCompanies.length === 1 ? 'company has' : 'companies have'} webhook integration enabled
          </CardDescription>
        </CardHeader>
        <CardContent>
          {enabledCompanies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No companies have enabled webhook integration yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company Name</TableHead>
                  <TableHead>Enabled Since</TableHead>
                  <TableHead>Last Test</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enabledCompanies.map(company => (
                  <TableRow key={company.id}>
                    <TableCell className="font-medium">{company.company_name}</TableCell>
                    <TableCell>{formatDateTime(company.created_at)}</TableCell>
                    <TableCell>
                      {company.last_test_at ? formatDateTime(company.last_test_at) : 'Never'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
