import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Shield, Database, Activity, AlertTriangle, Search, Filter } from 'lucide-react';
import { useEnhancedRLSManagement } from '@/hooks/useEnhancedRLSManagement';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import PolicyCard from '@/components/rls/PolicyCard';
import EnhancedTableCard from '@/components/rls/EnhancedTableCard';
import BulkOperationsPanel from '@/components/rls/BulkOperationsPanel';

const EnhancedRLSManagement = () => {
  const {
    policies,
    tableStatuses,
    statistics,
    loading,
    isConnected,
    bulkOperationInProgress,
    toggleIndividualPolicy,
    toggleTableRLS,
    bulkToggleTableRLS,
    enableCompanyIsolationMode,
    refreshAll,
  } = useEnhancedRLSManagement();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<string>('all');
  const [selectedPolicyType, setSelectedPolicyType] = useState<string>('all');
  const [selectedTableStatus, setSelectedTableStatus] = useState<string>('all');

  // Filter functions
  const filteredTables = tableStatuses.filter(table => {
    const matchesSearch = table.table_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         table.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRiskLevel = selectedRiskLevel === 'all' || table.risk_level === selectedRiskLevel;
    const matchesTableStatus = selectedTableStatus === 'all' || 
                              (selectedTableStatus === 'enabled' && table.rls_enabled) ||
                              (selectedTableStatus === 'disabled' && !table.rls_enabled) ||
                              (selectedTableStatus === 'with_data' && table.has_data) ||
                              (selectedTableStatus === 'company_isolated' && table.company_isolated);
    
    return matchesSearch && matchesRiskLevel && matchesTableStatus;
  });

  const filteredPolicies = policies.filter(policy => {
    const matchesSearch = policy.policyname.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         policy.tablename.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         policy.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPolicyType = selectedPolicyType === 'all' || policy.policy_type === selectedPolicyType;
    
    return matchesSearch && matchesPolicyType;
  });

  // Group policies by table
  const policiesByTable = filteredPolicies.reduce((acc, policy) => {
    if (!acc[policy.tablename]) {
      acc[policy.tablename] = [];
    }
    acc[policy.tablename].push(policy);
    return acc;
  }, {} as Record<string, typeof policies>);

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
              <h1 className="text-3xl font-bold text-foreground">Enhanced RLS Management</h1>
              <p className="text-muted-foreground">Advanced Row-Level Security monitoring and control with intelligent features</p>
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
              disabled={bulkOperationInProgress}
            >
              <RefreshCw className={`h-4 w-4 ${bulkOperationInProgress ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Filter className="h-5 w-5" />
              <span>Search & Filters</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tables, policies..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={selectedRiskLevel} onValueChange={setSelectedRiskLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="Risk Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Risk Levels</SelectItem>
                  <SelectItem value="HIGH">High Risk</SelectItem>
                  <SelectItem value="MEDIUM">Medium Risk</SelectItem>
                  <SelectItem value="LOW">Low Risk</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={selectedPolicyType} onValueChange={setSelectedPolicyType}>
                <SelectTrigger>
                  <SelectValue placeholder="Policy Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Policy Types</SelectItem>
                  <SelectItem value="Personal Access">Personal Access</SelectItem>
                  <SelectItem value="Team Access">Team Access</SelectItem>
                  <SelectItem value="Company Access">Company Access</SelectItem>
                  <SelectItem value="Admin Access">Admin Access</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={selectedTableStatus} onValueChange={setSelectedTableStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Table Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tables</SelectItem>
                  <SelectItem value="enabled">RLS Enabled</SelectItem>
                  <SelectItem value="disabled">RLS Disabled</SelectItem>
                  <SelectItem value="with_data">With Data</SelectItem>
                  <SelectItem value="company_isolated">Company Isolated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="bulk-ops">Bulk Operations</TabsTrigger>
            <TabsTrigger value="tables">Tables ({filteredTables.length})</TabsTrigger>
            <TabsTrigger value="policies">Policies ({filteredPolicies.length})</TabsTrigger>
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
                  High-risk tables with data but no RLS protection
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {tableStatuses
                    .filter(table => table.has_data && !table.rls_enabled && table.risk_level === 'HIGH')
                    .map(table => (
                      <div key={table.table_name} className="flex items-center justify-between p-3 bg-destructive/5 border border-red-200 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                          <div>
                            <span className="font-medium">{table.table_name}</span>
                            <p className="text-sm text-muted-foreground">{table.description}</p>
                          </div>
                          <Badge variant="destructive">High Risk - No RLS</Badge>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => toggleTableRLS(table.table_name, true)}
                          className="bg-destructive hover:bg-red-700"
                          disabled={bulkOperationInProgress}
                        >
                          Enable RLS
                        </Button>
                      </div>
                    ))}
                  
                  {tableStatuses.filter(table => table.has_data && !table.rls_enabled && table.risk_level === 'HIGH').length === 0 && (
                    <div className="text-center py-4 text-success">
                      ✅ All high-risk tables with data have RLS enabled
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bulk Operations Tab */}
          <TabsContent value="bulk-ops" className="space-y-6">
            <BulkOperationsPanel
              tableStatuses={tableStatuses}
              onBulkToggle={bulkToggleTableRLS}
              onCompanyIsolationMode={enableCompanyIsolationMode}
              disabled={bulkOperationInProgress}
            />
          </TabsContent>

          {/* Tables Tab */}
          <TabsContent value="tables" className="space-y-6">
            <div className="grid gap-4">
              {filteredTables.map(table => (
                <EnhancedTableCard
                  key={table.table_name}
                  table={table}
                  onToggle={toggleTableRLS}
                  disabled={bulkOperationInProgress}
                />
              ))}
              
              {filteredTables.length === 0 && (
                <Card>
                  <CardContent className="text-center py-8">
                    <p className="text-muted-foreground">No tables match your current filters.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Policies Tab */}
          <TabsContent value="policies" className="space-y-6">
            <div className="space-y-6">
              {Object.entries(policiesByTable).map(([tableName, tablePolicies]) => (
                <Card key={tableName}>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Database className="h-5 w-5" />
                      <span>{tableName}</span>
                      <Badge variant="outline">
                        {tablePolicies.length} policies
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      {tableStatuses.find(t => t.table_name === tableName)?.description || 'No description available'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3">
                      {tablePolicies.map(policy => (
                        <PolicyCard
                          key={`${policy.tablename}-${policy.policyname}`}
                          policy={policy}
                          onToggle={toggleIndividualPolicy}
                          disabled={bulkOperationInProgress}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {Object.keys(policiesByTable).length === 0 && (
                <Card>
                  <CardContent className="text-center py-8">
                    <p className="text-muted-foreground">No policies match your current filters.</p>
                  </CardContent>
                </Card>
              )}
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
                  <p>• Bulk operations are logged with detailed results</p>
                  <p>• Company isolation mode changes are tracked</p>
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
                    <span>High-Risk Data Protection</span>
                    <Badge variant={
                      tableStatuses.filter(t => t.has_data && !t.rls_enabled && t.risk_level === 'HIGH').length === 0 
                        ? "default" 
                        : "destructive"
                    }>
                      {tableStatuses.filter(t => t.has_data && !t.rls_enabled && t.risk_level === 'HIGH').length === 0 
                        ? "Fully Protected" 
                        : `${tableStatuses.filter(t => t.has_data && !t.rls_enabled && t.risk_level === 'HIGH').length} Unprotected`
                      }
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span>Company Isolation</span>
                    <Badge variant="outline">
                      {tableStatuses.filter(t => t.company_isolated).length} / {tableStatuses.length} tables
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

export default EnhancedRLSManagement;
