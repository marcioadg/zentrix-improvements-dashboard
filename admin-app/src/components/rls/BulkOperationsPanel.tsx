
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Shield, ShieldOff, Building2, Zap, AlertTriangle } from 'lucide-react';
import type { EnhancedTableRLSStatus } from '@/hooks/useEnhancedRLSManagement';

interface BulkOperationsPanelProps {
  tableStatuses: EnhancedTableRLSStatus[];
  onBulkToggle: (tableNames: string[], enable: boolean) => void;
  onCompanyIsolationMode: () => void;
  disabled?: boolean;
}

const BulkOperationsPanel: React.FC<BulkOperationsPanelProps> = ({
  tableStatuses,
  onBulkToggle,
  onCompanyIsolationMode,
  disabled
}) => {
  const allTableNames = tableStatuses.map(table => table.table_name);
  const enabledTables = tableStatuses.filter(table => table.rls_enabled);
  const disabledTables = tableStatuses.filter(table => !table.rls_enabled);
  const tablesWithData = tableStatuses.filter(table => table.has_data);
  const unprotectedHighRiskTables = tableStatuses.filter(
    table => !table.rls_enabled && table.has_data && table.risk_level === 'HIGH'
  );

  const handleEnableAll = () => {
    onBulkToggle(allTableNames, true);
  };

  const handleDisableAll = () => {
    onBulkToggle(allTableNames, false);
  };

  const handleEnableHighRisk = () => {
    const highRiskTableNames = tableStatuses
      .filter(table => table.risk_level === 'HIGH')
      .map(table => table.table_name);
    onBulkToggle(highRiskTableNames, true);
  };

  return (
    <Card className="border-2 border-info/30 bg-info/5">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Zap className="h-5 w-5 text-info" />
          <span>Bulk Operations</span>
        </CardTitle>
        <CardDescription>
          Perform operations on multiple tables at once. Use with caution.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Security Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-card rounded-lg border">
          <div className="text-center">
            <div className="text-2xl font-bold text-success">{enabledTables.length}</div>
            <div className="text-xs text-muted-foreground">RLS Enabled</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-error">{disabledTables.length}</div>
            <div className="text-xs text-muted-foreground">RLS Disabled</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-info">{tablesWithData.length}</div>
            <div className="text-xs text-muted-foreground">With Data</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-warning">{unprotectedHighRiskTables.length}</div>
            <div className="text-xs text-muted-foreground">High Risk</div>
          </div>
        </div>

        {/* Warning for unprotected high-risk tables */}
        {unprotectedHighRiskTables.length > 0 && (
          <div className="flex items-center space-x-2 p-3 bg-error/10 border border-error/30 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-error" />
            <div className="text-sm text-error">
              <strong>Security Warning:</strong> {unprotectedHighRiskTables.length} high-risk tables with data have no RLS protection!
            </div>
          </div>
        )}

        {/* Bulk Operation Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Enable All RLS */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="default" disabled={disabled} className="w-full">
                <Shield className="h-4 w-4 mr-2" />
                Enable All RLS
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Enable RLS on All Tables?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will enable Row Level Security on all {allTableNames.length} tables in the database. 
                  This is generally recommended for security but may affect application functionality if proper policies are not in place.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleEnableAll}>
                  Enable All RLS
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Disable All RLS */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={disabled} className="w-full">
                <ShieldOff className="h-4 w-4 mr-2" />
                Disable All RLS
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Disable RLS on All Tables?</AlertDialogTitle>
                <AlertDialogDescription className="space-y-2">
                  <p className="text-error font-medium">⚠️ DANGER: This will disable Row Level Security on all {allTableNames.length} tables!</p>
                  <p>This will make all data accessible to all users and should only be done in development environments or with extreme caution.</p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDisableAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  I Understand - Disable All
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Enable High Risk Tables */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={disabled} className="w-full border-warning/30 text-warning hover:bg-warning/10">
                <Shield className="h-4 w-4 mr-2" />
                Secure High Risk
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Enable RLS on High-Risk Tables?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will enable Row Level Security on all tables marked as HIGH risk. 
                  These tables typically contain sensitive user data, company information, or administrative functions.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleEnableHighRisk}>
                  Secure High Risk Tables
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Company Isolation Mode */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={disabled} className="w-full border-primary/30 text-primary hover:bg-primary/10">
                <Building2 className="h-4 w-4 mr-2" />
                Company Isolation
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Enable Company Isolation Mode?</AlertDialogTitle>
                <AlertDialogDescription className="space-y-2">
                  <p>This will enable a secure multi-tenant configuration:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Enables RLS on all tables</li>
                    <li>Ensures company data isolation</li>
                    <li>Maintains team boundaries within companies</li>
                    <li>Preserves essential security policies</li>
                  </ul>
                  <p className="text-success font-medium">✅ Recommended for production multi-tenant environments</p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onCompanyIsolationMode} className="bg-primary">
                  Enable Company Isolation
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
};

export default BulkOperationsPanel;
