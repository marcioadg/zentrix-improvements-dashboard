import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, AlertTriangle, CheckCircle, Database, Lock } from 'lucide-react';
import type { RLSStats as RLSStatistics, TableRLSInfo as TableRLSStatus } from '@/services/rlsService';

interface SecurityDashboardProps {
  statistics: RLSStatistics | null;
  tableStatuses: TableRLSStatus[];
}

export const SecurityDashboard = ({ statistics, tableStatuses }: SecurityDashboardProps) => {
  if (!statistics) return null;

  const criticalTables = ['profiles', 'companies', 'teams', 'team_members', 'company_members'];
  const criticalTablesWithoutRLS = tableStatuses.filter(
    table => criticalTables.includes(table.table_name) && !table.rls_enabled
  );

  const tablesWithData = tableStatuses.filter(table => table.has_policies);
  const vulnerableTablesWithData = tablesWithData.filter(table => !table.rls_enabled);

  const securityScore = statistics.total_tables > 0
    ? Math.round((statistics.rls_enabled_tables / statistics.total_tables) * 100)
    : 0;

  const getSecurityLevel = () => {
    if (criticalTablesWithoutRLS.length > 0) return 'critical';
    if (vulnerableTablesWithData.length > 5) return 'warning';
    if (securityScore < 70) return 'warning';
    return 'good';
  };

  const securityLevel = getSecurityLevel();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
      {/* Overall Security Score */}
      <Card className={`border-2 ${
        securityLevel === 'critical' ? 'border-error' :
        securityLevel === 'warning' ? 'border-warning' :
        'border-success'
      }`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Security Score</CardTitle>
          <Shield className={`h-4 w-4 ${
            securityLevel === 'critical' ? 'text-error' :
            securityLevel === 'warning' ? 'text-warning' :
            'text-success'
          }`} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{securityScore}%</div>
          <p className="text-xs text-muted-foreground">
            {statistics.rls_enabled_tables} of {statistics.total_tables} tables protected
          </p>
          <Badge
            className={`mt-2 ${
              securityLevel === 'critical' ? 'bg-error/10 text-error border-error/30 dark:text-error' :
              securityLevel === 'warning' ? 'bg-warning/10 text-warning border-warning/30 dark:text-warning' :
              'bg-success/10 text-success border-success/30 dark:text-success'
            }`}
          >
            {securityLevel === 'critical' ? 'Critical Risk' :
             securityLevel === 'warning' ? 'Needs Attention' :
             'Secure'}
          </Badge>
        </CardContent>
      </Card>

      {/* Critical Tables Status */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Critical Tables</CardTitle>
          {criticalTablesWithoutRLS.length > 0 ? (
            <AlertTriangle className="h-4 w-4 text-error" />
          ) : (
            <CheckCircle className="h-4 w-4 text-success" />
          )}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {criticalTables.length - criticalTablesWithoutRLS.length}/{criticalTables.length}
          </div>
          <p className="text-xs text-muted-foreground">
            Core tables with RLS enabled
          </p>
          {criticalTablesWithoutRLS.length > 0 && (
            <Badge variant="destructive" className="mt-2">
              {criticalTablesWithoutRLS.length} Unprotected
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Active Policies */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Policies</CardTitle>
          <Lock className="h-4 w-4 text-info" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{statistics.total_policies}</div>
          <p className="text-xs text-muted-foreground">
            Active security policies
          </p>
        </CardContent>
      </Card>

      {/* Data Exposure Risk */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Data at Risk</CardTitle>
          <Database className="h-4 w-4 text-warning" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{vulnerableTablesWithData.length}</div>
          <p className="text-xs text-muted-foreground">
            Tables with data but no RLS
          </p>
          {vulnerableTablesWithData.length > 0 && (
            <Badge className="bg-warning/10 text-warning border-warning/30 dark:text-warning mt-2">
              Immediate Action Required
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Security Alerts */}
      {(criticalTablesWithoutRLS.length > 0 || vulnerableTablesWithData.length > 0) && (
        <Card className="md:col-span-2 lg:col-span-4 border-error/30 bg-error/5">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-error dark:text-error">
              <AlertTriangle className="h-5 w-5" />
              <span>Security Alerts</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {criticalTablesWithoutRLS.length > 0 && (
              <div>
                <p className="text-sm font-medium text-error dark:text-error">Critical tables without RLS:</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {criticalTablesWithoutRLS.map(table => (
                    <Badge key={table.table_name} variant="destructive" className="text-xs">
                      {table.table_name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {vulnerableTablesWithData.length > 0 && (
              <div>
                <p className="text-sm font-medium text-warning dark:text-warning">Tables with data but no RLS protection:</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {vulnerableTablesWithData.slice(0, 10).map(table => (
                    <Badge key={table.table_name} className="bg-warning/10 text-warning dark:text-warning text-xs">
                      {table.table_name}
                    </Badge>
                  ))}
                  {vulnerableTablesWithData.length > 10 && (
                    <Badge className="bg-warning/10 text-warning dark:text-warning text-xs">
                      +{vulnerableTablesWithData.length - 10} more
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
