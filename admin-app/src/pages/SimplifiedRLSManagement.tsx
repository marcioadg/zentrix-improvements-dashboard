
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, Shield, Database, Activity, AlertTriangle, CheckCircle } from 'lucide-react';
import { useSimplifiedRLSManagement } from '@/hooks/useSimplifiedRLSManagement';

const SimplifiedRLSManagement = () => {
  const {
    policies,
    tableStatuses,
    statistics,
    loading,
    error,
    isConnected,
    toggleTableRLS,
    refreshAll,
  } = useSimplifiedRLSManagement();

  const getPolicyTypeColor = (cmd: string) => {
    switch (cmd) {
      case 'SELECT': return 'bg-[var(--info)]';
      case 'INSERT': return 'bg-[var(--success)]';
      case 'UPDATE': return 'bg-[var(--warning)]';
      case 'DELETE': return 'bg-destructive';
      default: return 'bg-muted-foreground';
    }
  };

  const getTableStatusColor = (table: { rls_enabled: boolean; policy_count: number }) => {
    if (!table.rls_enabled && table.policy_count === 0) return 'border-destructive bg-destructive/10';
    if (table.rls_enabled) return 'border-[var(--success)] bg-[var(--success)]/10';
    return 'border-border';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center space-x-3">
              <RefreshCw className="h-6 w-6 animate-spin text-primary" />
              <span className="text-lg">Loading RLS Management...</span>
            </div>
          </div>
        </div>
      </div>
    );
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
              <p className="text-muted-foreground">Simplified Row-Level Security monitoring and control</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-[var(--success)]' : 'bg-destructive'}`} />
              <span className="text-sm text-muted-foreground">
                {isConnected ? 'Connected' : 'Limited Functionality'}
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

        {/* Error Alert */}
        {error && (
          <Alert className="mb-6 border-[var(--warning)]/30 bg-[var(--warning)]/10">
            <AlertTriangle className="h-4 w-4 text-[var(--warning)]" />
            <AlertDescription className="text-foreground">
              <strong>Limited Functionality:</strong> Some advanced RLS features are unavailable. 
              Basic RLS monitoring and table controls are still functional.
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tables">Tables</TabsTrigger>
            <TabsTrigger value="policies">Policies</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                  <Shield className="h-4 w-4 text-[var(--success)]" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-[var(--success)]">
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
                  <Activity className="h-4 w-4 text-[var(--info)]" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-[var(--info)]">
                    {statistics?.total_policies || 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Tables with Data</CardTitle>
                  <Database className="h-4 w-4 text-[var(--warning)]" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-[var(--warning)]">
                    {statistics?.tables_with_data || 0}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Security Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-[var(--success)]" />
                  <span>Security Status</span>
                </CardTitle>
                <CardDescription>
                  Overview of RLS protection across your database
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {tableStatuses
                    .filter(table => !table.rls_enabled)
                    .slice(0, 5)
                    .map(table => (
                      <div key={table.table_name} className="flex items-center justify-between p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                          <span className="font-medium">{table.table_name}</span>
                          <Badge variant="destructive">No RLS</Badge>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => toggleTableRLS(table.table_name, true)}
                          className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                        >
                          Enable RLS
                        </Button>
                      </div>
                    ))}
                  
                  {tableStatuses.filter(table => !table.rls_enabled).length === 0 && (
                    <div className="text-center py-4 text-[var(--success)]">
                      ✅ All tables have RLS enabled
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
                              <Badge className={`${getPolicyTypeColor(policy.cmd)} text-white`}>
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
                              <code className="text-xs bg-muted p-2 rounded block break-all">
                                {policy.qual}
                              </code>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {policies.length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center">
                    <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No Policies Found</h3>
                    <p className="text-muted-foreground">
                      No RLS policies could be loaded. This may be due to limited database access.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SimplifiedRLSManagement;
