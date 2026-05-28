
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { RefreshCw, Shield, Database, Activity, AlertTriangle } from 'lucide-react';
import { useRLSManagement } from '@/hooks/useRLSManagement';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';

const RLSManagement = () => {
  const {
    policies,
    tableStatuses,
    statistics,
    loading,
    isConnected,
    toggleTableRLS,
    refreshAll,
  } = useRLSManagement();

  const getPolicyTypeColor = (cmd: string) => {
    switch (cmd) {
      case 'SELECT': return 'bg-primary';
      case 'INSERT': return 'bg-green-500';
      case 'UPDATE': return 'bg-yellow-500';
      case 'DELETE': return 'bg-destructive';
      default: return 'bg-muted-foreground';
    }
  };

  const getTableStatusColor = (status: { rls_enabled: boolean; has_data: boolean }) => {
    if (!status.rls_enabled && status.has_data) return 'border-red-500 bg-destructive/5';
    if (status.rls_enabled && status.has_data) return 'border-green-500 bg-success/5';
    return 'border-border';
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">RLS Management</h1>
              <p className="text-muted-foreground">Real-time Row-Level Security monitoring and control</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-destructive'}`} />
              <span className="text-sm text-muted-foreground">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            
            <Button 
              onClick={refreshAll} 
              variant="outline" 
              size="sm"
              className="flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tables">Tables</TabsTrigger>
            <TabsTrigger value="policies">Policies</TabsTrigger>
            <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Tables</CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{statistics?.total_tables || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">RLS Enabled</CardTitle>
                  <Shield className="h-4 w-4 text-success" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-success">
                    {statistics?.rls_enabled_tables || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {statistics ? Math.round((statistics.rls_enabled_tables / statistics.total_tables) * 100) : 0}% coverage
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Policies</CardTitle>
                  <Activity className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">
                    {statistics?.total_policies || 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Policy Types</CardTitle>
                  <Activity className="h-4 w-4 text-secondary-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-secondary-foreground">
                    {statistics?.unique_policy_types || 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Tables with Data</CardTitle>
                  <Database className="h-4 w-4 text-warning" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-warning">
                    {statistics?.tables_with_data || 0}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Security Alerts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  <span>Security Alerts</span>
                </CardTitle>
                <CardDescription>
                  Tables with data but no RLS protection
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {tableStatuses
                    .filter(table => table.has_data && !table.rls_enabled)
                    .map(table => (
                      <div key={table.table_name} className="flex items-center justify-between p-3 bg-destructive/5 border border-red-200 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                          <span className="font-medium">{table.table_name}</span>
                          <Badge variant="destructive">No RLS</Badge>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => toggleTableRLS(table.table_name, true)}
                          className="bg-destructive hover:bg-red-700"
                        >
                          Enable RLS
                        </Button>
                      </div>
                    ))}
                  
                  {tableStatuses.filter(table => table.has_data && !table.rls_enabled).length === 0 && (
                    <div className="text-center py-4 text-success">
                      ✅ All tables with data have RLS enabled
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tables Tab */}
          <TabsContent value="tables" className="space-y-6">
            <div className="grid gap-4">
              {tableStatuses.map(table => (
                <Card key={table.table_name} className={getTableStatusColor(table)}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div>
                          <h3 className="font-semibold text-lg">{table.table_name}</h3>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant={table.rls_enabled ? "default" : "destructive"}>
                              {table.rls_enabled ? "RLS Enabled" : "RLS Disabled"}
                            </Badge>
                            <Badge variant="outline">
                              {table.policy_count} policies
                            </Badge>
                            {table.has_data && (
                              <Badge variant="secondary">Has Data</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <label className="text-sm font-medium">RLS</label>
                        <Switch
                          checked={table.rls_enabled}
                          onCheckedChange={(checked) => toggleTableRLS(table.table_name, checked)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Policies Tab */}
          <TabsContent value="policies" className="space-y-6">
            <div className="space-y-4">
              {Object.entries(
                policies.reduce((acc, policy) => {
                  if (!acc[policy.tablename]) {
                    acc[policy.tablename] = [];
                  }
                  acc[policy.tablename].push(policy);
                  return acc;
                }, {} as Record<string, typeof policies>)
              ).map(([tableName, tablePolicies]) => (
                <Card key={tableName}>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Database className="h-5 w-5" />
                      <span>{tableName}</span>
                      <Badge variant="outline">
                        {tablePolicies.length} policies
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {tablePolicies.map(policy => (
                        <div key={policy.policyname} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-3">
                              <h4 className="font-medium">{policy.policyname}</h4>
                              <Badge className={getPolicyTypeColor(policy.cmd)}>
                                {policy.cmd}
                              </Badge>
                              <Badge variant="outline">
                                {policy.permissive}
                              </Badge>
                            </div>
                          </div>
                          
                          {policy.qual && (
                            <div className="mt-2">
                              <p className="text-sm text-muted-foreground mb-1">Condition:</p>
                              <code className="text-xs bg-muted p-2 rounded block">
                                {policy.qual}
                              </code>
                            </div>
                          )}
                          
                          {policy.with_check && (
                            <div className="mt-2">
                              <p className="text-sm text-muted-foreground mb-1">With Check:</p>
                              <code className="text-xs bg-muted p-2 rounded block">
                                {policy.with_check}
                              </code>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Monitoring Tab */}
          <TabsContent value="monitoring" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Real-time Connection Status</CardTitle>
                <CardDescription>
                  Monitor live changes to RLS policies and table configurations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4">
                  <div className={`h-4 w-4 rounded-full ${isConnected ? 'bg-green-500' : 'bg-destructive'}`} />
                  <span className="font-medium">
                    {isConnected ? 'Connected to real-time updates' : 'Disconnected from real-time updates'}
                  </span>
                </div>
                
                <div className="mt-4 text-sm text-muted-foreground">
                  <p>• Policy changes are monitored in real-time</p>
                  <p>• Table RLS status updates automatically</p>
                  <p>• Admin actions are logged and tracked</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>RLS Coverage</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-32 bg-muted rounded-full h-2">
                        <div 
                          className="h-2 rounded-full"
                          style={{
                            background: "var(--btn-bg, hsl(var(--primary)))",
                            width: `${statistics ? (statistics.rls_enabled_tables / statistics.total_tables) * 100 : 0}%` 
                          }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {statistics ? Math.round((statistics.rls_enabled_tables / statistics.total_tables) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span>Data Protection</span>
                    <Badge variant={
                      tableStatuses.filter(t => t.has_data && !t.rls_enabled).length === 0 
                        ? "default" 
                        : "destructive"
                    }>
                      {tableStatuses.filter(t => t.has_data && !t.rls_enabled).length === 0 
                        ? "Fully Protected" 
                        : `${tableStatuses.filter(t => t.has_data && !t.rls_enabled).length} Unprotected`
                      }
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default RLSManagement;
