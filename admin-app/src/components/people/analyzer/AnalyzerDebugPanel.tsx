import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertTriangle, Info } from 'lucide-react';

interface DebugInfo {
  userAuthenticated: boolean;
  currentCompanyId?: string;
  usersCount: number;
  visiblePeopleCount: number;
  coreValuesCount: number;
  scoresCount: number;
  barsCount: number;
  columnsCount: number;
  loading: boolean;
  error: string | null;
  strategyDataLoaded: boolean;
  permissionsLoaded: boolean;
}

interface AnalyzerDebugPanelProps {
  debugInfo: DebugInfo;
}

export const AnalyzerDebugPanel: React.FC<AnalyzerDebugPanelProps> = ({ debugInfo }) => {
  return (
    <Card className="border-warning/30 bg-warning/10">
      <CardHeader>
        <CardTitle className="text-warning-foreground flex items-center gap-2">
          <Info className="h-5 w-5" />
          People Analyzer Debug Information
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-2">
            {debugInfo.userAuthenticated ? (
              <CheckCircle className="h-4 w-4 text-success" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-destructive" />
            )}
            <span>User: {debugInfo.userAuthenticated ? 'Authenticated' : 'Not Authenticated'}</span>
          </div>
          
          <div className="flex items-center gap-2">
            {debugInfo.currentCompanyId ? (
              <CheckCircle className="h-4 w-4 text-success" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-destructive" />
            )}
            <span>Company: {debugInfo.currentCompanyId ? 'Selected' : 'Not Selected'}</span>
          </div>
          
          <div className="flex items-center gap-2">
            {debugInfo.strategyDataLoaded ? (
              <CheckCircle className="h-4 w-4 text-success" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-destructive" />
            )}
            <span>Strategy: {debugInfo.strategyDataLoaded ? 'Loaded' : 'Not Loaded'}</span>
          </div>
          
          <div className="flex items-center gap-2">
            {debugInfo.permissionsLoaded ? (
              <CheckCircle className="h-4 w-4 text-success" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-destructive" />
            )}
            <span>Permissions: {debugInfo.permissionsLoaded ? 'Loaded' : 'Not Loaded'}</span>
          </div>
          
          <div className="flex items-center gap-2">
            {debugInfo.coreValuesCount > 0 ? (
              <CheckCircle className="h-4 w-4 text-success" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-destructive" />
            )}
            <span>Core Values: {debugInfo.coreValuesCount}</span>
          </div>
          
          <div className="flex items-center gap-2">
            {debugInfo.usersCount > 0 ? (
              <CheckCircle className="h-4 w-4 text-success" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-destructive" />
            )}
            <span>Total Users: {debugInfo.usersCount}</span>
          </div>
          
          <div className="flex items-center gap-2">
            {debugInfo.visiblePeopleCount > 0 ? (
              <CheckCircle className="h-4 w-4 text-success" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-destructive" />
            )}
            <span>Visible People: {debugInfo.visiblePeopleCount}</span>
          </div>
          
          <div className="flex items-center gap-2">
            {debugInfo.columnsCount > 0 ? (
              <CheckCircle className="h-4 w-4 text-success" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-destructive" />
            )}
            <span>Columns: {debugInfo.columnsCount}</span>
          </div>
        </div>
        
        {debugInfo.error && (
          <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <strong>Error:</strong>
            </div>
            <p className="text-destructive/80 mt-1">{debugInfo.error}</p>
          </div>
        )}
        
        {debugInfo.coreValuesCount === 0 && (
          <div className="mt-4 p-3 bg-info/10 border border-info/20 rounded-md">
            <div className="flex items-center gap-2 text-info">
              <Info className="h-4 w-4" />
              <strong>Setup Required:</strong>
            </div>
            <p className="text-info/80 mt-1">
              No core values found. Please set up your core values in the Strategy page first.
            </p>
          </div>
        )}
        
        {debugInfo.visiblePeopleCount === 0 && debugInfo.usersCount > 0 && (
          <div className="mt-4 p-3 bg-warning/10 border border-warning/20 rounded-md">
            <div className="flex items-center gap-2 text-warning">
              <Info className="h-4 w-4" />
              <strong>Permission Issue:</strong>
            </div>
            <p className="text-warning/80 mt-1">
              {debugInfo.usersCount} users exist, but you don't have permission to view any. Check your role permissions.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};