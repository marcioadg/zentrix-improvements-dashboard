import { useState, useEffect } from 'react';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useUserNotificationSettings } from '@/hooks/useUserNotificationSettings';
import { logger } from '@/utils/logger';

interface WebhookConfig {
  id: string;
  flag_events_enabled: boolean;
  last_test_at: string | null;
  last_test_status: string | null;
}

export const WebhookIntegrationSettings = () => {
  const { currentCompany } = useMultiCompany();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testingTaskAssigned, setTestingTaskAssigned] = useState(false);
  const [testingTrialExpiring, setTestingTrialExpiring] = useState(false);
  const [testingTrialExpired, setTestingTrialExpired] = useState(false);
  const [testingCompanyCreated, setTestingCompanyCreated] = useState(false);
  const [testingFlagAdded, setTestingFlagAdded] = useState(false);
  
  const [config, setConfig] = useState<WebhookConfig | null>(null);
  const [flagEventsEnabled, setFlagEventsEnabled] = useState(false);
  
  // User-level notification settings
  const { 
    settings: userNotifSettings, 
    loading: userNotifLoading, 
    saving: userNotifSaving, 
    updateTaskAssignedEnabled 
  } = useUserNotificationSettings();
  
  // Test Company Created button only for teste1.2naodeletar
  const isTestCompany = currentCompany?.name === 'teste1.2naodeletar';
  const isAnyTesting = testingConnection || testingTaskAssigned || testingTrialExpiring || testingTrialExpired || testingCompanyCreated || testingFlagAdded;

  useEffect(() => {
    if (currentCompany?.id) {
      fetchConfig();
    }
  }, [currentCompany?.id]);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('webhook_configurations')
        .select('id, flag_events_enabled, last_test_at, last_test_status')
        .eq('company_id', currentCompany?.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setConfig({
          id: data.id,
          flag_events_enabled: data.flag_events_enabled || false,
          last_test_at: data.last_test_at,
          last_test_status: data.last_test_status,
        });
        setFlagEventsEnabled(data.flag_events_enabled || false);
      }
    } catch (error) {
      logger.error('Error fetching webhook config:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load webhook configuration',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUserTaskNotificationToggle = async (enabled: boolean) => {
    const success = await updateTaskAssignedEnabled(enabled);
    if (success) {
      toast({
        title: 'Success',
        description: `Task notification emails ${enabled ? 'enabled' : 'disabled'}`,
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update notification setting',
      });
    }
  };

  const handleFlagEventsToggle = async (enabled: boolean) => {
    try {
      setFlagEventsEnabled(enabled);

      if (config) {
        // Update existing
        const { error } = await supabase
          .from('webhook_configurations')
          .update({
            flag_events_enabled: enabled,
            updated_at: new Date().toISOString(),
          })
          .eq('id', config.id);

        if (error) throw error;
      } else {
        // Insert new with flag_events_enabled
        const { data, error } = await supabase
          .from('webhook_configurations')
          .insert({
            company_id: currentCompany?.id,
            is_enabled: true,
            task_assigned_enabled: true,
            flag_events_enabled: enabled,
            created_by: (await supabase.auth.getUser()).data.user?.id,
          })
          .select('id, flag_events_enabled, last_test_at, last_test_status')
          .single();

        if (error) throw error;
        setConfig({
          id: data.id,
          flag_events_enabled: data.flag_events_enabled || false,
          last_test_at: data.last_test_at,
          last_test_status: data.last_test_status,
        });
      }

      toast({
        title: 'Success',
        description: `Customer flag events ${enabled ? 'enabled' : 'disabled'} successfully`,
      });

      await fetchConfig();
    } catch (error: any) {
      logger.error('Error updating flag events setting:', error);
      setFlagEventsEnabled(!enabled); // Revert on error
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update flag events setting',
      });
    }
  };

  const handleTestFlagAdded = async () => {
    if (!flagEventsEnabled) {
      toast({
        variant: 'destructive',
        title: 'Not Enabled',
        description: 'Please enable Customer Flag Events before testing',
      });
      return;
    }

    try {
      setTestingFlagAdded(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get user profile for name
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single();

      const fullName = profile?.full_name || 'User';
      const firstName = fullName.split(' ')[0];

      const { data, error } = await supabase.functions.invoke('send-webhook-event', {
        body: {
          event_type: 'customer_flag_added',
          company_id: currentCompany?.id,
          user_id: user.id,
          event_data: {
            user_name: fullName,
            name: fullName,
            first_name: firstName,
            company_name: currentCompany?.name || 'Test Company',
            flag_type: 'no_login_14_days',
            flag_label: 'No Login in 14+ Days',
            action: 'added',
          },
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: 'Test Successful',
          description: 'Customer flag added webhook sent successfully',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Test Failed',
          description: data?.error || 'Customer flag webhook test failed',
        });
      }

      await fetchConfig();
    } catch (error: any) {
      logger.error('Error testing flag webhook:', error);
      toast({
        variant: 'destructive',
        title: 'Test Failed',
        description: error.message || 'Failed to test flag webhook',
      });
    } finally {
      setTestingFlagAdded(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setTestingConnection(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Ensure config exists
      if (!config) {
        // Create config if it doesn't exist
        const { error: insertError } = await supabase
          .from('webhook_configurations')
          .insert({
            company_id: currentCompany?.id,
            is_enabled: true,
            created_by: user.id,
          });
        
        if (insertError) throw insertError;
        await fetchConfig();
      }

      const { data, error } = await supabase.functions.invoke('send-webhook-event', {
        body: {
          event_type: 'test_connection',
          company_id: currentCompany?.id,
          user_id: user.id,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: 'Connection Successful',
          description: 'Webhook connection test passed',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Connection Failed',
          description: data?.error || 'Webhook connection test failed',
        });
      }

      await fetchConfig();
    } catch (error: any) {
      logger.error('Error testing webhook:', error);
      toast({
        variant: 'destructive',
        title: 'Test Failed',
        description: error.message || 'Failed to test webhook connection',
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleTestTaskAssigned = async () => {
    if (!userNotifSettings?.task_assigned_enabled) {
      toast({
        variant: 'destructive',
        title: 'Not Enabled',
        description: 'Please enable Task Assigned Notifications before testing',
      });
      return;
    }

    try {
      setTestingTaskAssigned(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get user profile for name
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single();

      // Calculate due date 7 days from now
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);

      const { data, error } = await supabase.functions.invoke('send-webhook-event', {
        body: {
          event_type: 'task_assigned',
          company_id: currentCompany?.id,
          user_id: user.id,
          event_data: {
            task_id: 'test-task-001',
            task_title: 'Test Task Assignment',
            task_description: 'This is a test task to verify the integration works correctly.',
            assigned_by_name: profile?.full_name || 'Test Manager',
            assigned_by_email: profile?.email || user.email,
            assigned_at: new Date().toISOString(),
            due_date: dueDate.toISOString(),
            priority: 'medium',
            task_url: 'https://zentrixos.com/tasks',
            workspace_name: currentCompany?.name || 'Test Workspace',
          },
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: 'Test Successful',
          description: 'Task assigned webhook sent successfully',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Test Failed',
          description: data?.error || 'Task assigned webhook test failed',
        });
      }

      await fetchConfig();
    } catch (error: any) {
      logger.error('Error testing task assigned webhook:', error);
      toast({
        variant: 'destructive',
        title: 'Test Failed',
        description: error.message || 'Failed to test task assigned webhook',
      });
    } finally {
      setTestingTaskAssigned(false);
    }
  };

  const handleTestTrialExpiring = async () => {
    try {
      setTestingTrialExpiring(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get user profile for name
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single();

      // Calculate trial end date 3 days from now
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 3);

      const fullName = profile?.full_name || 'User';
      const firstName = fullName.split(' ')[0];

      const { data, error } = await supabase.functions.invoke('send-webhook-event', {
        body: {
          event_type: 'trial_ending',
          company_id: currentCompany?.id,
          user_id: user.id,
          event_data: {
            user_name: fullName,
            name: fullName,
            first_name: firstName,
            company_name: currentCompany?.name || 'Test Company',
            trial_end_date: trialEndDate.toISOString(),
            days_remaining: 3,
          },
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: 'Test Successful',
          description: 'Trial expiring webhook sent successfully',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Test Failed',
          description: data?.error || 'Trial expiring webhook test failed',
        });
      }

      await fetchConfig();
    } catch (error: any) {
      logger.error('Error testing trial expiring webhook:', error);
      toast({
        variant: 'destructive',
        title: 'Test Failed',
        description: error.message || 'Failed to test trial expiring webhook',
      });
    } finally {
      setTestingTrialExpiring(false);
    }
  };

  const handleTestTrialExpired = async () => {
    try {
      setTestingTrialExpired(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get user profile for name
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single();

      // Calculate trial end date 2 days ago
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() - 2);

      const fullName = profile?.full_name || 'User';
      const firstName = fullName.split(' ')[0];

      const { data, error } = await supabase.functions.invoke('send-webhook-event', {
        body: {
          event_type: 'trial_expired',
          company_id: currentCompany?.id,
          user_id: user.id,
          event_data: {
            user_name: fullName,
            name: fullName,
            first_name: firstName,
            company_name: currentCompany?.name || 'Test Company',
            trial_end_date: trialEndDate.toISOString(),
            days_expired: 2,
          },
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: 'Test Successful',
          description: 'Trial expired webhook sent successfully',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Test Failed',
          description: data?.error || 'Trial expired webhook test failed',
        });
      }

      await fetchConfig();
    } catch (error: any) {
      logger.error('Error testing trial expired webhook:', error);
      toast({
        variant: 'destructive',
        title: 'Test Failed',
        description: error.message || 'Failed to test trial expired webhook',
      });
    } finally {
      setTestingTrialExpired(false);
    }
  };

  const handleTestCompanyCreated = async () => {
    try {
      setTestingCompanyCreated(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get user profile for name
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single();

      const fullName = profile?.full_name || 'User';
      const firstName = fullName.split(' ')[0];

      const { data, error } = await supabase.functions.invoke('send-webhook-event', {
        body: {
          event_type: 'company_created',
          company_id: currentCompany?.id,
          user_id: user.id,
          event_data: {
            user_name: fullName,
            name: fullName,
            first_name: firstName,
            company_id: currentCompany?.id,
            company_name: currentCompany?.name || 'Test Company',
            company_slug: currentCompany?.slug || 'test-company',
            created_at: new Date().toISOString(),
          },
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: 'Test Successful',
          description: 'Company created webhook sent successfully',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Test Failed',
          description: data?.error || 'Company created webhook test failed',
        });
      }

      await fetchConfig();
    } catch (error: any) {
      logger.error('Error testing company created webhook:', error);
      toast({
        variant: 'destructive',
        title: 'Test Failed',
        description: error.message || 'Failed to test company created webhook',
      });
    } finally {
      setTestingCompanyCreated(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
        {/* Task Assignment Notifications - User Level */}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label>Task Assignment Notifications</Label>
            <p className="text-sm text-muted-foreground">
              Receive email notifications when tasks are assigned to you
            </p>
          </div>
          <Switch
            checked={userNotifSettings?.task_assigned_enabled ?? true}
            onCheckedChange={handleUserTaskNotificationToggle}
            disabled={userNotifLoading || userNotifSaving || isAnyTesting}
          />
        </div>

        {/* Customer Flag Events toggle - hidden for now */}

        {/* Last test status */}
        {config?.last_test_at && (
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Last Test:</span>
              {config.last_test_status === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-success" />
              ) : (
                <XCircle className="h-4 w-4 text-destructive" />
              )}
              <span className="text-sm text-muted-foreground">
                {new Date(config.last_test_at).toLocaleString()}
              </span>
            </div>
            {config.last_test_status && config.last_test_status !== 'success' && (
              <p className="text-sm text-muted-foreground">{config.last_test_status}</p>
            )}
          </div>
        )}

        {/* Test buttons - only visible for test company */}
        {isTestCompany && (
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={isAnyTesting}
              className="w-full"
            >
              {testingConnection && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Test Connection
            </Button>
            <Button
              variant="outline"
              onClick={handleTestTaskAssigned}
              disabled={!userNotifSettings?.task_assigned_enabled || isAnyTesting}
              className="w-full"
            >
              {testingTaskAssigned && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Test Task Assigned
            </Button>
            <Button
              variant="outline"
              onClick={handleTestTrialExpiring}
              disabled={isAnyTesting}
              className="w-full"
            >
              {testingTrialExpiring && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Test Trial Expiring
            </Button>
            <Button
              variant="outline"
              onClick={handleTestTrialExpired}
              disabled={isAnyTesting}
              className="w-full"
            >
              {testingTrialExpired && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Test Trial Expired
            </Button>
            {isTestCompany && (
              <Button
                variant="outline"
                onClick={handleTestCompanyCreated}
                disabled={isAnyTesting}
                className="w-full"
              >
                {testingCompanyCreated && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Test Company Created
              </Button>
            )}
            {/* Test Flag Added button - hidden for now */}
          </div>
        )}
      </div>
  );
};
