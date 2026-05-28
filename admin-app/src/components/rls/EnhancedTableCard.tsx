
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Database, Shield, AlertTriangle, Info, Building2 } from 'lucide-react';
import type { EnhancedTableRLSStatus } from '@/hooks/useEnhancedRLSManagement';

interface EnhancedTableCardProps {
  table: EnhancedTableRLSStatus;
  onToggle: (tableName: string, enable: boolean) => void;
  disabled?: boolean;
}

const EnhancedTableCard: React.FC<EnhancedTableCardProps> = ({ table, onToggle, disabled }) => {
  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'HIGH': return 'border-red-500 bg-destructive/5';
      case 'MEDIUM': return 'border-yellow-500 bg-warning/5';
      case 'LOW': return 'border-green-500 bg-success/5';
      default: return 'border-border bg-muted/50';
    }
  };

  const getRiskBadgeColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'HIGH': return 'bg-destructive text-white';
      case 'MEDIUM': return 'bg-yellow-500 text-white';
      case 'LOW': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getTableStatusColor = (table: EnhancedTableRLSStatus) => {
    if (!table.rls_enabled && table.has_data && table.risk_level === 'HIGH') {
      return 'border-red-500 bg-destructive/5';
    }
    if (table.rls_enabled && table.has_data) {
      return 'border-green-500 bg-success/5';
    }
    return getRiskLevelColor(table.risk_level);
  };

  const shouldShowWarning = !table.rls_enabled && table.has_data && table.risk_level === 'HIGH';

  return (
    <Card className={`${getTableStatusColor(table)} border-l-4`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Database className="h-5 w-5 text-secondary-foreground" />
            <div>
              <CardTitle className="text-lg font-semibold">{table.table_name}</CardTitle>
              <CardDescription className="text-sm mt-1">
                {table.description}
              </CardDescription>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {shouldShowWarning && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Security Risk: High-risk table with data but no RLS protection!</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            <label className="text-sm font-medium">RLS</label>
            <Switch
              checked={table.rls_enabled}
              onCheckedChange={(checked) => onToggle(table.table_name, checked)}
              disabled={disabled}
            />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Badge variant={table.rls_enabled ? "default" : "destructive"}>
                <Shield className="h-3 w-3 mr-1" />
                {table.rls_enabled ? "RLS Enabled" : "RLS Disabled"}
              </Badge>
              
              <Badge variant="outline">
                {table.policy_count} policies
              </Badge>
              
              {table.has_data && (
                <Badge variant="secondary">Has Data</Badge>
              )}
              
              {table.company_isolated && (
                <Badge className="bg-secondary text-purple-800">
                  <Building2 className="h-3 w-3 mr-1" />
                  Company Isolated
                </Badge>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge className={getRiskBadgeColor(table.risk_level)}>
              {table.risk_level} Risk
            </Badge>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Info className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <div className="space-y-1">
                    <p className="font-medium">Table Information</p>
                    <p className="text-xs">Policies: {table.policy_count}</p>
                    <p className="text-xs">Has Data: {table.has_data ? 'Yes' : 'No'}</p>
                    <p className="text-xs">Risk Level: {table.risk_level}</p>
                    <p className="text-xs">Company Isolated: {table.company_isolated ? 'Yes' : 'No'}</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EnhancedTableCard;
