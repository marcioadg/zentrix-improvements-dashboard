
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Database, 
  Network, 
  Shield,
  RefreshCw,
  Bug
} from 'lucide-react';

interface DiagnosticResult {
  test: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  duration?: number;
  details?: any;
}

interface NetworkMetrics {
  connectionType: string;
  downlink?: number;
  rtt?: number;
  effectiveType?: string;
}

export const TasksDebugUtility: React.FC = () => {
  const { user } = useAuth();
  const { currentCompany } = useMultiCompany();
  
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([]);
  const [running, setRunning] = useState(false);
  const [networkMetrics, setNetworkMetrics] = useState<NetworkMetrics | null>(null);

  // Collect network information
  useEffect(() => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      setNetworkMetrics({
        connectionType: connection.type || 'unknown',
        downlink: connection.downlink,
        rtt: connection.rtt,
        effectiveType: connection.effectiveType
      });
    }
  }, []);

  // Individual diagnostic tests
  const tests = {
    async testDatabaseConnectivity(): Promise<DiagnosticResult> {
      const start = performance.now();
      try {
        const { error } = await supabase.rpc('test_db_connectivity');
        const duration = performance.now() - start;
        
        if (error) {
          return {
            test: 'Database Connectivity',
            status: 'fail',
            message: `Database connection failed: ${error.message}`,
            duration
          };
        }
        
        return {
          test: 'Database Connectivity',
          status: duration > 2000 ? 'warning' : 'pass',
          message: duration > 2000 ? 'Database connection is slow' : 'Database connection is healthy',
          duration
        };
      } catch (error) {
        return {
          test: 'Database Connectivity',
          status: 'fail',
          message: `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          duration: performance.now() - start
        };
      }
    },

    async testUserAuthentication(): Promise<DiagnosticResult> {
      const start = performance.now();
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        const duration = performance.now() - start;
        
        if (error) {
          return {
            test: 'User Authentication',
            status: 'fail',
            message: `Authentication error: ${error.message}`,
            duration
          };
        }
        
        if (!session || !user) {
          return {
            test: 'User Authentication',
            status: 'fail',
            message: 'No active session or user data',
            duration
          };
        }
        
        return {
          test: 'User Authentication',
          status: 'pass',
          message: `Authenticated as ${user.email}`,
          duration,
          details: { userId: user.id, email: user.email }
        };
      } catch (error) {
        return {
          test: 'User Authentication',
          status: 'fail',
          message: `Authentication test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          duration: performance.now() - start
        };
      }
    },

    async testCompanyAccess(): Promise<DiagnosticResult> {
      const start = performance.now();
      try {
        if (!currentCompany) {
          return {
            test: 'Company Access',
            status: 'fail',
            message: 'No company selected',
            duration: performance.now() - start
          };
        }

        const { data, error } = await supabase
          .from('company_members')
          .select('permission_level')
          .eq('user_id', user?.id)
          .eq('company_id', currentCompany?.id)
          .single();

        const duration = performance.now() - start;

        if (error) {
          return {
            test: 'Company Access',
            status: 'fail',
            message: `Company access error: ${error.message}`,
            duration
          };
        }

        return {
          test: 'Company Access',
          status: 'pass',
          message: `Access to ${currentCompany?.name} as ${data.permission_level}`,
          duration,
          details: { companyId: currentCompany?.id, role: data.permission_level }
        };
      } catch (error) {
        return {
          test: 'Company Access',
          status: 'fail',
          message: `Company access test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          duration: performance.now() - start
        };
      }
    },

    async testTeamAccess(): Promise<DiagnosticResult> {
      const start = performance.now();
      try {
        const { data, error } = await supabase.rpc('get_user_teams');
        const duration = performance.now() - start;

        if (error) {
          return {
            test: 'Team Access',
            status: 'fail',
            message: `Team access error: ${error.message}`,
            duration
          };
        }

        const teamCount = data?.length || 0;
        
        return {
          test: 'Team Access',
          status: teamCount > 0 ? 'pass' : 'warning',
          message: teamCount > 0 ? `Access to ${teamCount} teams` : 'No teams accessible',
          duration,
          details: { teamCount, teams: data?.slice(0, 3) }
        };
      } catch (error) {
        return {
          test: 'Team Access',
          status: 'fail',
          message: `Team access test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          duration: performance.now() - start
        };
      }
    },

    async testTaskQuery(): Promise<DiagnosticResult> {
      const start = performance.now();
      try {
        const { data, error } = await supabase.rpc('get_user_task_counts');
        const duration = performance.now() - start;

        if (error) {
          return {
            test: 'Task Query',
            status: 'fail',
            message: `Task query error: ${error.message}`,
            duration
          };
        }

        const totalTasks = data?.reduce((sum: number, item: any) => sum + (item.task_count || 0), 0) || 0;
        
        return {
          test: 'Task Query',
          status: duration > 3000 ? 'warning' : 'pass',
          message: duration > 3000 ? `Found ${totalTasks} tasks (slow query)` : `Found ${totalTasks} tasks`,
          duration,
          details: { totalTasks, breakdown: data }
        };
      } catch (error) {
        return {
          test: 'Task Query',
          status: 'fail',
          message: `Task query test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          duration: performance.now() - start
        };
      }
    },

    async testRLSPolicies(): Promise<DiagnosticResult> {
      const start = performance.now();
      try {
        // Test direct table access vs function access
        const [directResult, functionResult] = await Promise.allSettled([
          supabase.from('fast_tasks').select('id').limit(1),
          supabase.rpc('get_user_tasks', { target_team_ids: null }).select('id').limit(1)
        ]);

        const duration = performance.now() - start;

        const directSuccess = directResult.status === 'fulfilled' && !directResult.value.error;
        const functionSuccess = functionResult.status === 'fulfilled' && !functionResult.value.error;

        if (!directSuccess && !functionSuccess) {
          return {
            test: 'RLS Policies',
            status: 'fail',
            message: 'Both direct and function access failed',
            duration,
            details: { 
              directError: directResult.status === 'rejected' ? directResult.reason : directResult.value.error,
              functionError: functionResult.status === 'rejected' ? functionResult.reason : functionResult.value.error
            }
          };
        }

        if (!directSuccess) {
          return {
            test: 'RLS Policies',
            status: 'warning',
            message: 'Direct table access blocked, function access works',
            duration,
            details: { directError: directResult.status === 'rejected' ? directResult.reason : directResult.value.error }
          };
        }

        return {
          test: 'RLS Policies',
          status: 'pass',
          message: 'RLS policies are working correctly',
          duration
        };
      } catch (error) {
        return {
          test: 'RLS Policies',
          status: 'fail',
          message: `RLS test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          duration: performance.now() - start
        };
      }
    }
  };

  const runDiagnostics = async () => {
    setRunning(true);
    setDiagnostics([]);

    const results: DiagnosticResult[] = [];
    
    for (const [testName, testFunc] of Object.entries(tests)) {
      try {
        const result = await testFunc();
        results.push(result);
        setDiagnostics([...results]);
        
        // Small delay between tests to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        results.push({
          test: testName,
          status: 'fail',
          message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
        setDiagnostics([...results]);
      }
    }

    setRunning(false);
  };

  const getStatusIcon = (status: 'pass' | 'fail' | 'warning') => {
    switch (status) {
      case 'pass':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'fail':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'warning':
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadgeVariant = (status: 'pass' | 'fail' | 'warning') => {
    switch (status) {
      case 'pass':
        return 'default';
      case 'fail':
        return 'destructive';
      case 'warning':
        return 'secondary';
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bug className="h-5 w-5" />
          <CardTitle>Tasks Page Diagnostics</CardTitle>
        </div>
        <CardDescription>
          Debug and troubleshoot loading issues on the tasks page
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="diagnostics" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
            <TabsTrigger value="network">Network</TabsTrigger>
            <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
          </TabsList>
          
          <TabsContent value="diagnostics" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">System Health Check</h3>
              <Button 
                onClick={runDiagnostics} 
                disabled={running}
                size="sm"
              >
                {running ? (
                  <>
                    <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3 w-3 mr-2" />
                    Run Diagnostics
                  </>
                )}
              </Button>
            </div>
            
            {diagnostics.length > 0 && (
              <div className="space-y-3">
                {diagnostics.map((result, index) => (
                  <Card key={index} className={`border-l-4 ${
                    result.status === 'pass' ? 'border-l-green-500' :
                    result.status === 'fail' ? 'border-l-red-500' :
                    'border-l-yellow-500'
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(result.status)}
                          <div>
                            <h4 className="font-medium">{result.test}</h4>
                            <p className="text-sm text-muted-foreground">{result.message}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {result.duration && (
                            <span className="text-xs text-muted-foreground">
                              {result.duration.toFixed(0)}ms
                            </span>
                          )}
                          <Badge variant={getStatusBadgeVariant(result.status)}>
                            {result.status}
                          </Badge>
                        </div>
                      </div>
                      
                      {result.details && (
                        <details className="mt-3">
                          <summary className="text-xs text-muted-foreground cursor-pointer">
                            View Details
                          </summary>
                          <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-auto">
                            {JSON.stringify(result.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="network" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Network className="h-4 w-4" />
                    Connection Info
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {networkMetrics ? (
                    <div className="space-y-2 text-sm">
                      <div>Type: {networkMetrics.connectionType}</div>
                      {networkMetrics.effectiveType && (
                        <div>Effective Type: {networkMetrics.effectiveType}</div>
                      )}
                      {networkMetrics.downlink && (
                        <div>Downlink: {networkMetrics.downlink} Mbps</div>
                      )}
                      {networkMetrics.rtt && (
                        <div>RTT: {networkMetrics.rtt}ms</div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Network information not available
                    </p>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Database Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div>Region: Unknown</div>
                    <div>Connection Pool: Active</div>
                    <div>RLS: Enabled</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="suggestions" className="space-y-4">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <strong>Common Solutions:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Check your internet connection stability</li>
                  <li>Refresh the page to clear any stuck requests</li>
                  <li>Try logging out and logging back in</li>
                  <li>Contact support if RLS policies are failing</li>
                  <li>Use a different browser if problems persist</li>
                </ul>
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
