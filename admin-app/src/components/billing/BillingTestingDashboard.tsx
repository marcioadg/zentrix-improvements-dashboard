import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, TestTube, CheckCircle, AlertCircle, Users, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { logger } from '@/utils/logger';

interface TestResult {
  test: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message: string;
  details?: any;
  duration?: number;
}

export const BillingTestingDashboard = () => {
  const [tests, setTests] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const { toast } = useToast();
  const { currentCompany } = useMultiCompany();

  const updateTestResult = (testName: string, result: Partial<TestResult>) => {
    setTests(prev => prev.map(test => 
      test.test === testName 
        ? { ...test, ...result }
        : test
    ));
  };

  const runBillingTests = async () => {
    if (!currentCompany?.id) {
      toast({ description: "No current company selected", variant: "destructive" });
      return;
    }

    setIsRunning(true);
    
    // Initialize test list
    const initialTests: TestResult[] = [
      { test: "Company Subscription Status", status: 'pending', message: "Checking..." },
      { test: "User Billing Events", status: 'pending', message: "Verifying..." },
      { test: "Usage Calculation", status: 'pending', message: "Calculating..." },
      { test: "Stripe Integration", status: 'pending', message: "Testing..." },
      { test: "Real-time Usage Report", status: 'pending', message: "Triggering..." }
    ];
    
    setTests(initialTests);

    try {
      // Test 1: Company Subscription Status
      updateTestResult("Company Subscription Status", { status: 'running' });
      const { data: subscription, error: subError } = await supabase
        .from('company_subscriptions')
        .select('*')
        .eq('company_id', currentCompany?.id)
        .single();

      if (subError) {
        updateTestResult("Company Subscription Status", { 
          status: 'error', 
          message: `Error: ${subError.message}` 
        });
      } else {
        updateTestResult("Company Subscription Status", { 
          status: 'success', 
          message: `${subscription.subscription_tier} - ${subscription.subscribed ? 'Active' : 'Inactive'}`,
          details: {
            tier: subscription.subscription_tier,
            subscribed: subscription.subscribed,
            hasStripeId: !!subscription.stripe_subscription_id,
            billingType: subscription.billing_type,
            currentUsage: subscription.current_month_usage
          }
        });
      }

      // Test 2: User Billing Events
      updateTestResult("User Billing Events", { status: 'running' });
      const { data: billingEvents, error: eventsError } = await supabase
        .from('user_billing_events')
        .select('*')
        .eq('company_id', currentCompany?.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (eventsError) {
        updateTestResult("User Billing Events", { 
          status: 'error', 
          message: `Error: ${eventsError.message}` 
        });
      } else {
        updateTestResult("User Billing Events", { 
          status: 'success', 
          message: `Found ${billingEvents?.length || 0} recent events`,
          details: billingEvents?.slice(0, 3).map(e => ({
            eventType: e.event_type,
            date: e.event_date,
            userId: e.user_id
          }))
        });
      }

      // Test 3: Usage Calculation
      updateTestResult("Usage Calculation", { status: 'running' });
      try {
        const { data: usageData, error: usageError } = await supabase
          .rpc('update_monthly_usage', {
            p_company_id: currentCompany?.id,
            p_billing_month: new Date().toISOString().slice(0, 7) + '-01'
          });

        if (usageError) {
          updateTestResult("Usage Calculation", { 
            status: 'error', 
            message: `Error: ${usageError.message}` 
          });
        } else {
          updateTestResult("Usage Calculation", { 
            status: 'success', 
            message: `${usageData?.user_count || 0} users, $${usageData?.total_amount || 0}`,
            details: {
              userCount: usageData?.user_count,
              totalAmount: usageData?.total_amount,
              billingMonth: new Date().toISOString().slice(0, 7) + '-01'
            }
          });
        }
      } catch (error) {
        updateTestResult("Usage Calculation", { 
          status: 'error', 
          message: `Calculation failed: ${error}` 
        });
      }

      // Test 4: Stripe Integration (if applicable)
      updateTestResult("Stripe Integration", { status: 'running' });
      if (subscription && subscription.stripe_customer_id && subscription.subscription_tier !== 'Free') {
        try {
          const { data: reportResult, error: reportError } = await supabase.functions.invoke('report-usage', {
            body: {
              company_id: currentCompany?.id,
              billing_month: new Date().toISOString().slice(0, 7) + '-01'
            }
          });

          if (reportError) {
            updateTestResult("Stripe Integration", { 
              status: 'error', 
              message: `Report error: ${reportError.message}` 
            });
          } else {
            updateTestResult("Stripe Integration", { 
              status: 'success', 
              message: `Usage reported successfully`,
              details: reportResult
            });
          }
        } catch (error) {
          updateTestResult("Stripe Integration", { 
            status: 'error', 
            message: `Stripe test failed: ${error}` 
          });
        }
      } else {
        updateTestResult("Stripe Integration", { 
          status: 'success', 
          message: "No Stripe customer - OK for Free/Trial"
        });
      }

      // Test 5: Real-time Usage Report
      updateTestResult("Real-time Usage Report", { status: 'running' });
      try {
        const { data: realtimeResult, error: realtimeError } = await supabase.functions.invoke('realtime-usage-report', {
          body: {
            company_id: currentCompany?.id,
            event_type: 'test',
            user_id: 'test-user-id',
            force_report: false
          }
        });

        if (realtimeError) {
          updateTestResult("Real-time Usage Report", { 
            status: 'error', 
            message: `Realtime error: ${realtimeError.message}` 
          });
        } else {
          updateTestResult("Real-time Usage Report", { 
            status: 'success', 
            message: "Real-time reporting functional",
            details: realtimeResult
          });
        }
      } catch (error) {
        updateTestResult("Real-time Usage Report", { 
          status: 'error', 
          message: `Real-time test failed: ${error}` 
        });
      }

      toast({ description: "Billing system test completed!" });

    } catch (error) {
      logger.error("Error running billing tests:", error);
      toast({ description: "Error running tests", variant: "destructive" });
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'running': return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-destructive" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    const variants = {
      pending: 'secondary',
      running: 'secondary',
      success: 'default',
      error: 'destructive'
    } as const;
    
    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          Billing System Testing Dashboard
        </CardTitle>
        <CardDescription>
          Test your billing system end-to-end to verify Stripe integration and usage tracking
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runBillingTests} 
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Running Tests...
            </>
          ) : (
            <>
              <TestTube className="h-4 w-4 mr-2" />
              Run Complete Billing Test
            </>
          )}
        </Button>

        {tests.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold">Test Results</h4>
            {tests.map((test, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  {getStatusIcon(test.status)}
                  <div>
                    <div className="font-medium">{test.test}</div>
                    <div className="text-sm text-muted-foreground">{test.message}</div>
                    {test.details && (
                      <div className="text-xs text-muted-foreground mt-1">
                        <pre className="bg-muted p-2 rounded text-xs mt-1 max-w-md overflow-auto">
                          {JSON.stringify(test.details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
                {getStatusBadge(test.status)}
              </div>
            ))}
          </div>
        )}

        <div className="text-sm text-muted-foreground space-y-2">
          <h4 className="font-semibold">What this tests:</h4>
          <ul className="space-y-1 ml-4">
            <li>• Subscription status and Stripe configuration</li>
            <li>• User billing event tracking (joins/leaves)</li>
            <li>• Prorated usage calculations</li>
            <li>• Stripe usage reporting integration</li>
            <li>• Real-time usage updates</li>
          </ul>
          
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <p className="font-medium">Expected Behavior:</p>
            <ul className="text-xs space-y-1 mt-1">
              <li>• <strong>Trial:</strong> First charge when trial ends</li>
              <li>• <strong>Post-Trial:</strong> Immediate charge + prorated for current period</li>
              <li>• <strong>User Changes:</strong> Real-time usage updates to Stripe</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};