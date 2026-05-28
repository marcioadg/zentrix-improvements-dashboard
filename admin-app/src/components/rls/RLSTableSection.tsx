import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Shield, Database, AlertTriangle, CheckCircle, Lock, Unlock } from 'lucide-react';
import type { TableRLSInfo as TableRLSStatus } from '@/services/rlsService';
import { logger } from '@/utils/logger';

interface RLSTableSectionProps {
  tables: TableRLSStatus[];
  onToggleRLS: (tableName: string, enable: boolean) => Promise<void>;
  tableCategories: Record<string, string[]>;
  selectedCategory: string;
}

export const RLSTableSection = ({ 
  tables, 
  onToggleRLS, 
  tableCategories,
  selectedCategory 
}: RLSTableSectionProps) => {
  const criticalTables = ['profiles', 'companies', 'teams', 'team_members', 'company_members'];

  const getTableRiskLevel = (table: TableRLSStatus) => {
    if (criticalTables.includes(table.table_name) && !table.rls_enabled) {
      return 'critical';
    }
    if (table.has_policies && !table.rls_enabled) {
      return 'high';
    }
    if (!table.rls_enabled) {
      return 'medium';
    }
    if (table.policy_count === 0) {
      return 'medium';
    }
    return 'low';
  };

  const getRiskBadge = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical':
        return <Badge variant="destructive">Critical Risk</Badge>;
      case 'high':
        return <Badge className="bg-destructive/10 text-red-800 border-red-200">High Risk</Badge>;
      case 'medium':
        return <Badge className="bg-warning/10 text-yellow-800 border-yellow-200">Medium Risk</Badge>;
      case 'low':
        return <Badge className="bg-success/10 text-green-800 border-green-200">Secure</Badge>;
      default:
        return null;
    }
  };

  const getTableIcon = (table: TableRLSStatus) => {
    const riskLevel = getTableRiskLevel(table);
    if (riskLevel === 'critical') return <AlertTriangle className="h-5 w-5 text-destructive" />;
    if (table.rls_enabled) return <Shield className="h-5 w-5 text-green-500" />;
    return <Database className="h-5 w-5 text-muted-foreground" />;
  };

  const getCategoryName = (tableName: string) => {
    for (const [category, tableNames] of Object.entries(tableCategories)) {
      if (tableNames.includes(tableName)) {
        return category.charAt(0).toUpperCase() + category.slice(1);
      }
    }
    return 'Other';
  };

  // Group tables by category
  const groupedTables = tables.reduce((acc, table) => {
    const category = getCategoryName(table.table_name);
    if (!acc[category]) acc[category] = [];
    acc[category].push(table);
    return acc;
  }, {} as Record<string, TableRLSStatus[]>);

  const handleToggleRLS = async (tableName: string, currentState: boolean) => {
    try {
      await onToggleRLS(tableName, !currentState);
    } catch (error) {
      logger.error('Failed to toggle RLS:', error);
    }
  };

  return (
    <div className="space-y-6">
      {Object.entries(groupedTables).map(([category, categoryTables]) => (
        <div key={category}>
          <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
            <span>{category} Tables</span>
            <Badge variant="outline">{categoryTables.length}</Badge>
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryTables.map((table) => {
              const riskLevel = getTableRiskLevel(table);
              
              return (
                <Card 
                  key={table.table_name}
                  className={`transition-all hover:shadow-md ${
                    riskLevel === 'critical' ? 'border-red-200 bg-destructive/5' :
                    riskLevel === 'high' ? 'border-orange-200 bg-orange-50' :
                    riskLevel === 'medium' ? 'border-yellow-200 bg-warning/5' :
                    'border-green-200 bg-success/5'
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getTableIcon(table)}
                        <CardTitle className="text-sm font-medium">
                          {table.table_name}
                        </CardTitle>
                      </div>
                      {getRiskBadge(riskLevel)}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* RLS Status Toggle */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {table.rls_enabled ? (
                          <Lock className="h-4 w-4 text-green-500" />
                        ) : (
                          <Unlock className="h-4 w-4 text-destructive" />
                        )}
                        <span className="text-sm font-medium">
                          RLS {table.rls_enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <Switch
                        checked={table.rls_enabled}
                        onCheckedChange={() => handleToggleRLS(table.table_name, table.rls_enabled)}
                      />
                    </div>

                    {/* Table Statistics */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Policies:</span>
                        <span className="ml-2 font-medium">{table.policy_count}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Has Policies:</span>
                        <span className="ml-2">
                          {table.has_policies ? (
                            <CheckCircle className="h-4 w-4 text-green-500 inline" />
                          ) : (
                            <span className="text-muted-foreground">No</span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Warnings */}
                    {riskLevel === 'critical' && (
                      <div className="p-2 bg-destructive/10 border border-red-200 rounded-md">
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                          <span className="text-xs text-red-800 font-medium">
                            Critical table without RLS protection!
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {table.rls_enabled && table.policy_count === 0 && (
                      <div className="p-2 bg-warning/10 border border-yellow-200 rounded-md">
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="h-4 w-4 text-warning" />
                          <span className="text-xs text-yellow-800 font-medium">
                            RLS enabled but no policies defined
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};