import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Search, 
  Database, 
  Shield, 
  ArrowRight, 
  AlertTriangle, 
  CheckCircle, 
  Eye,
  Users,
  Lock,
  Unlock,
  FileText,
  GitBranch,
  Target
} from 'lucide-react';
import { useSimplifiedRLSManagement } from '@/hooks/useSimplifiedRLSManagement';

// Sample page configurations - this would normally come from analyzing the codebase
const PAGE_CONFIGS = {
  '/dashboard': {
    name: 'Dashboard',
    description: 'Main dashboard with metrics and tasks',
    queries: [
      {
        name: 'fetchUserMetrics',
        tables: ['weekly_metrics', 'teams', 'team_members'],
        operations: ['SELECT'],
        description: 'Loads user metrics for current company'
      },
      {
        name: 'fetchUserTasks',
        tables: ['fast_tasks'],
        operations: ['SELECT', 'UPDATE'],
        description: 'Loads and updates user tasks'
      },
      {
        name: 'fetchCompanyGoals',
        tables: ['team_goals', 'teams'],
        operations: ['SELECT'],
        description: 'Loads company-wide goals'
      }
    ]
  },
  '/teams': {
    name: 'Teams Management',
    description: 'Team creation and member management',
    queries: [
      {
        name: 'fetchUserTeams',
        tables: ['teams', 'team_members', 'company_members'],
        operations: ['SELECT'],
        description: 'Lists teams user has access to'
      },
      {
        name: 'createTeam',
        tables: ['teams', 'team_members'],
        operations: ['INSERT'],
        description: 'Creates new team and adds creator as member'
      },
      {
        name: 'updateTeamMembers',
        tables: ['team_members'],
        operations: ['INSERT', 'DELETE'],
        description: 'Adds/removes team members'
      }
    ]
  },
  '/metrics': {
    name: 'Weekly Metrics',
    description: 'Team metrics tracking and reporting',
    queries: [
      {
        name: 'fetchTeamMetrics',
        tables: ['weekly_metrics', 'teams', 'team_members'],
        operations: ['SELECT'],
        description: 'Loads metrics for teams user belongs to'
      },
      {
        name: 'updateMetricValue',
        tables: ['weekly_metrics'],
        operations: ['UPDATE'],
        description: 'Updates metric values'
      },
      {
        name: 'createMetric',
        tables: ['weekly_metrics'],
        operations: ['INSERT'],
        description: 'Creates new metrics'
      }
    ]
  }
};

const DataAccessAnalyzer = () => {
  const [selectedPage, setSelectedPage] = useState<string>('');
  const [activeTab, setActiveTab] = useState('overview');
  
  const {
    policies,
    tableStatuses,
    loading,
    error
  } = useSimplifiedRLSManagement();

  const selectedPageConfig = selectedPage ? PAGE_CONFIGS[selectedPage as keyof typeof PAGE_CONFIGS] : null;

  // Get all unique tables used by the selected page
  const pageTables = useMemo(() => {
    if (!selectedPageConfig) return [];
    
    const tableSet = new Set<string>();
    selectedPageConfig.queries.forEach(query => {
      query.tables.forEach(table => tableSet.add(table));
    });
    
    return Array.from(tableSet).map(tableName => {
      const tableStatus = tableStatuses.find(t => t.table_name === tableName);
      const tablePolicies = policies.filter(p => p.tablename === tableName);
      
      return {
        name: tableName,
        rls_enabled: tableStatus?.rls_enabled || false,
        policies: tablePolicies,
        policy_count: tablePolicies.length
      };
    });
  }, [selectedPageConfig, tableStatuses, policies]);

  // Risk assessment
  const riskAssessment = useMemo(() => {
    if (!selectedPageConfig || !pageTables.length) return { level: 'low', issues: [] };
    
    const issues: string[] = [];
    let riskLevel = 'low';
    
    pageTables.forEach(table => {
      if (!table.rls_enabled) {
        issues.push(`Table "${table.name}" has no security protection (RLS disabled)`);
        riskLevel = 'high';
      } else if (table.policy_count === 0) {
        issues.push(`Table "${table.name}" has RLS enabled but no policies defined`);
        riskLevel = 'high';
      }
    });
    
    const selectPolicies = policies.filter(p => 
      pageTables.some(t => t.name === p.tablename) && p.cmd === 'SELECT'
    );
    
    if (selectPolicies.some(p => p.qual?.includes('true') || !p.qual)) {
      issues.push('Some policies may allow unrestricted access');
      riskLevel = riskLevel === 'high' ? 'high' : 'medium';
    }
    
    return { level: riskLevel, issues };
  }, [selectedPageConfig, pageTables, policies]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading data access analysis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <Target className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Data Access Analyzer
              </h1>
              <p className="text-muted-foreground">
                Understand exactly how data flows through your pages
              </p>
            </div>
          </div>
        </div>

        {/* Page Selector */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Select Page to Analyze
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Choose a page to see its complete data access flow and security analysis
            </p>
          </CardHeader>
          <CardContent>
            <Select value={selectedPage} onValueChange={setSelectedPage}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a page to analyze..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PAGE_CONFIGS).map(([path, config]) => (
                  <SelectItem key={path} value={path}>
                    {config.name} ({path})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedPageConfig ? (
          <>
            {/* Risk Overview */}
            <Alert className={`mb-8 ${
              riskAssessment.level === 'high' ? 'border-red-500 bg-destructive/5' :
              riskAssessment.level === 'medium' ? 'border-yellow-500 bg-warning/5' :
              'border-green-500 bg-success/5'
            }`}>
              <AlertTriangle className={`h-4 w-4 ${
                riskAssessment.level === 'high' ? 'text-destructive' :
                riskAssessment.level === 'medium' ? 'text-warning' :
                'text-success'
              }`} />
              <AlertDescription>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium">
                    Security Risk Level: 
                  </span>
                  <Badge variant={
                    riskAssessment.level === 'high' ? 'destructive' :
                    riskAssessment.level === 'medium' ? 'secondary' : 'default'
                  }>
                    {riskAssessment.level.toUpperCase()}
                  </Badge>
                </div>
                {riskAssessment.issues.length > 0 && (
                  <ul className="list-disc pl-5 space-y-1">
                    {riskAssessment.issues.map((issue, i) => (
                      <li key={i} className="text-sm">{issue}</li>
                    ))}
                  </ul>
                )}
                {riskAssessment.level === 'low' && (
                  <p className="text-sm">All tables have proper security protection configured.</p>
                )}
              </AlertDescription>
            </Alert>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="flow">Data Flow</TabsTrigger>
                <TabsTrigger value="policies">Security Policies</TabsTrigger>
                <TabsTrigger value="risks">Risk Analysis</TabsTrigger>
                <TabsTrigger value="testing">Test Checklist</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                {/* Page Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      {selectedPageConfig.name} Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">{selectedPageConfig.description}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-2xl font-bold text-primary">{selectedPageConfig.queries.length}</div>
                        <div className="text-sm text-muted-foreground">Database Queries</div>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-2xl font-bold text-primary">{pageTables.length}</div>
                        <div className="text-sm text-muted-foreground">Tables Accessed</div>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-2xl font-bold text-primary">
                          {pageTables.filter(t => t.rls_enabled).length}
                        </div>
                        <div className="text-sm text-muted-foreground">Protected Tables</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Queries */}
                <Card>
                  <CardHeader>
                    <CardTitle>Database Queries</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {selectedPageConfig.queries.map((query, i) => (
                        <div key={i} className="p-4 border rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-medium">{query.name}</h3>
                            <div className="flex gap-1">
                              {query.operations.map(op => (
                                <Badge key={op} variant="outline" className="text-xs">
                                  {op}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{query.description}</p>
                          <div className="flex gap-2 flex-wrap">
                            {query.tables.map(table => (
                              <Badge key={table} variant="secondary" className="text-xs">
                                <Database className="h-3 w-3 mr-1" />
                                {table}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="flow" className="space-y-6">
                <Card>
                  <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="h-5 w-5" />
                  Data Access Flow
                </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      How data flows from user request to final results
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {selectedPageConfig.queries.map((query, i) => (
                        <div key={i} className="p-6 border rounded-lg bg-muted/30">
                          <h3 className="font-medium mb-4 flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center">
                              {i + 1}
                            </div>
                            {query.name}
                          </h3>
                          
                          <div className="flex items-center gap-4 overflow-x-auto pb-4">
                            {/* User */}
                            <div className="flex flex-col items-center min-w-24">
                              <Users className="h-8 w-8 text-primary mb-2" />
                              <span className="text-xs text-center">User Request</span>
                            </div>
                            
                            <ArrowRight className="text-muted-foreground" />
                            
                            {/* Query */}
                            <div className="flex flex-col items-center min-w-24">
                              <Search className="h-8 w-8 text-green-500 mb-2" />
                              <span className="text-xs text-center">SQL Query</span>
                            </div>
                            
                            <ArrowRight className="text-muted-foreground" />
                            
                            {/* Tables */}
                            {query.tables.map((tableName, tableIndex) => {
                              const table = pageTables.find(t => t.name === tableName);
                              return (
                                <React.Fragment key={tableName}>
                                  <div className="flex flex-col items-center min-w-24">
                                    <Database className={`h-8 w-8 mb-2 ${
                                      table?.rls_enabled ? 'text-green-500' : 'text-destructive'
                                    }`} />
                                    <span className="text-xs text-center">{tableName}</span>
                                    <div className="flex items-center gap-1 mt-1">
                                      {table?.rls_enabled ? (
                                        <Lock className="h-3 w-3 text-green-500" />
                                      ) : (
                                        <Unlock className="h-3 w-3 text-destructive" />
                                      )}
                                      <span className="text-xs">
                                        {table?.policy_count || 0} policies
                                      </span>
                                    </div>
                                  </div>
                                  {tableIndex < query.tables.length - 1 && (
                                    <ArrowRight className="text-muted-foreground" />
                                  )}
                                </React.Fragment>
                              );
                            })}
                            
                            <ArrowRight className="text-muted-foreground" />
                            
                            {/* Result */}
                            <div className="flex flex-col items-center min-w-24">
                              <CheckCircle className="h-8 w-8 text-purple-500 mb-2" />
                              <span className="text-xs text-center">Filtered Rows</span>
                            </div>
                          </div>
                          
                          <div className="mt-4 p-3 bg-background rounded border">
                            <p className="text-sm">
                              <span className="font-medium">Plain English:</span> {query.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="policies" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Security Policies Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {pageTables.map(table => (
                        <div key={table.name} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="font-medium text-lg">{table.name}</h3>
                            <div className="flex items-center gap-2">
                              {table.rls_enabled ? (
                                <Badge variant="default" className="bg-success/10 text-green-800">
                                  <Lock className="h-3 w-3 mr-1" />
                                  Protected
                                </Badge>
                              ) : (
                                <Badge variant="destructive">
                                  <Unlock className="h-3 w-3 mr-1" />
                                  Unprotected
                                </Badge>
                              )}
                              <Badge variant="outline">
                                {table.policy_count} policies
                              </Badge>
                            </div>
                          </div>
                          
                          {table.policies.length > 0 ? (
                            <div className="space-y-3">
                              {table.policies.map((policy, policyIndex) => (
                                <div key={policyIndex} className="p-3 bg-muted/50 rounded">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge variant="outline" className="text-xs">
                                      {policy.cmd}
                                    </Badge>
                                    <span className="font-medium text-sm">{policy.policyname}</span>
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {policy.cmd === 'SELECT' && 'Users can view records when: '}
                                    {policy.cmd === 'INSERT' && 'Users can create records when: '}
                                    {policy.cmd === 'UPDATE' && 'Users can edit records when: '}
                                    {policy.cmd === 'DELETE' && 'Users can delete records when: '}
                                    <code className="bg-background px-2 py-1 rounded text-xs ml-1">
                                      {policy.qual || 'No conditions (unrestricted)'}
                                    </code>
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8 text-muted-foreground">
                              <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                              <p>No security policies defined for this table</p>
                              {table.rls_enabled && (
                                <p className="text-sm">RLS is enabled but no policies exist - this blocks all access</p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="risks" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      Risk Analysis & Mitigation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="p-4 border rounded-lg">
                        <h3 className="font-medium mb-3">Potential Security Issues</h3>
                        {riskAssessment.issues.length > 0 ? (
                          <div className="space-y-2">
                            {riskAssessment.issues.map((issue, i) => (
                              <div key={i} className="flex items-start gap-2">
                                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                                <span className="text-sm">{issue}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-success">
                            <CheckCircle className="h-4 w-4" />
                            <span className="text-sm">No security issues detected</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="p-4 border rounded-lg">
                        <h3 className="font-medium mb-3">What Could Go Wrong</h3>
                        <div className="space-y-3">
                          <div className="p-3 bg-destructive/5 border border-red-200 rounded">
                            <h4 className="font-medium text-red-800 mb-1">Data Exposure</h4>
                            <p className="text-sm text-red-700">
                              Without proper RLS policies, users might see data from other companies or teams they shouldn't access.
                            </p>
                          </div>
                          <div className="p-3 bg-orange-50 border border-orange-200 rounded">
                            <h4 className="font-medium text-orange-800 mb-1">Unauthorized Modifications</h4>
                            <p className="text-sm text-orange-700">
                              Missing UPDATE/DELETE policies could allow users to modify or delete data they shouldn't touch.
                            </p>
                          </div>
                          <div className="p-3 bg-warning/5 border border-yellow-200 rounded">
                            <h4 className="font-medium text-yellow-800 mb-1">Complete Data Loss</h4>
                            <p className="text-sm text-yellow-700">
                              Overly permissive policies could allow users to access or modify all data in the system.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="testing" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5" />
                      Security Testing Checklist
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Test these scenarios to verify your security is working correctly
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="p-4 border rounded-lg">
                        <h3 className="font-medium mb-3 flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          User Role Testing
                        </h3>
                        <div className="space-y-2">
                          <label className="flex items-center gap-2">
                            <input type="checkbox" className="rounded" />
                            <span className="text-sm">Test as normal team member - should only see their team's data</span>
                          </label>
                          <label className="flex items-center gap-2">
                            <input type="checkbox" className="rounded" />
                            <span className="text-sm">Test as team manager - should see team data and manage members</span>
                          </label>
                          <label className="flex items-center gap-2">
                            <input type="checkbox" className="rounded" />
                            <span className="text-sm">Test as company admin - should see company-wide data</span>
                          </label>
                          <label className="flex items-center gap-2">
                            <input type="checkbox" className="rounded" />
                            <span className="text-sm">Test as user from different company - should see no data</span>
                          </label>
                        </div>
                      </div>

                      <div className="p-4 border rounded-lg">
                        <h3 className="font-medium mb-3 flex items-center gap-2">
                          <Eye className="h-4 w-4" />
                          Data Visibility Testing
                        </h3>
                        <div className="space-y-2">
                          {selectedPageConfig.queries.map((query, i) => (
                            <div key={i} className="pl-4 border-l-2 border-muted">
                              <h4 className="font-medium text-sm mb-1">{query.name}</h4>
                              {query.tables.map(table => (
                                <label key={table} className="flex items-center gap-2">
                                  <input type="checkbox" className="rounded" />
                                  <span className="text-sm">Verify {table} only shows authorized records</span>
                                </label>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="p-4 border rounded-lg">
                        <h3 className="font-medium mb-3 flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Security Boundary Testing
                        </h3>
                        <div className="space-y-2">
                          <label className="flex items-center gap-2">
                            <input type="checkbox" className="rounded" />
                            <span className="text-sm">Try to access data from a different company (should fail)</span>
                          </label>
                          <label className="flex items-center gap-2">
                            <input type="checkbox" className="rounded" />
                            <span className="text-sm">Try to modify data you don't own (should fail)</span>
                          </label>
                          <label className="flex items-center gap-2">
                            <input type="checkbox" className="rounded" />
                            <span className="text-sm">Test with revoked permissions (should fail)</span>
                          </label>
                          <label className="flex items-center gap-2">
                            <input type="checkbox" className="rounded" />
                            <span className="text-sm">Test after user leaves team (should lose access)</span>
                          </label>
                        </div>
                      </div>

                      <Alert>
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Pro Tip:</strong> Create test users with different roles and companies to systematically test these scenarios. 
                          Document any data that shows up unexpectedly - it might indicate a security gap.
                        </AlertDescription>
                      </Alert>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Target className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium text-lg mb-2">Select a Page to Analyze</h3>
              <p className="text-muted-foreground">
                Choose a page from the dropdown above to see its complete data access flow and security analysis.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default DataAccessAnalyzer;