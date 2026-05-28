
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, Info, RefreshCw } from 'lucide-react';

interface DebugInfo {
  userAuthenticated: boolean;
  hasPermissions: boolean;
  rlsEnabled: boolean;
  viewMode: string;
  selectedTeamIds: string[];
  tasksCount: number;
  filteredTasksCount: number;
}

interface TasksDebugPanelProps {
  debugInfo: DebugInfo;
  error: string | null;
  loading: boolean;
  onRefresh?: () => void;
}

export const TasksDebugPanel: React.FC<TasksDebugPanelProps> = ({
  debugInfo,
  error,
  loading,
  onRefresh
}) => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (!isDevelopment) return null;

  const getStatusIcon = (condition: boolean) => {
    return condition ? <CheckCircle className="h-4 w-4 text-success" /> : <AlertTriangle className="h-4 w-4 text-destructive" />;
  };

  const getStatusColor = (condition: boolean) => {
    return condition ? 'bg-success/10 text-green-800' : 'bg-destructive/10 text-red-800';
  };

  return (
    <Card className="mb-4 border-dashed border-yellow-300 bg-warning/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-yellow-800">
          <Info className="h-5 w-5" />
          Debug Panel (Development Only)
        </CardTitle>
        <CardDescription>
          Current status and debugging information for the Tasks page
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">System Status</h4>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {getStatusIcon(debugInfo.userAuthenticated)}
                <span className="text-sm">User Authenticated</span>
                <Badge variant="outline" className={getStatusColor(debugInfo.userAuthenticated)}>
                  {debugInfo.userAuthenticated ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(debugInfo.hasPermissions)}
                <span className="text-sm">Has Permissions</span>
                <Badge variant="outline" className={getStatusColor(debugInfo.hasPermissions)}>
                  {debugInfo.hasPermissions ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(debugInfo.rlsEnabled)}
                <span className="text-sm">RLS Enabled</span>
                <Badge variant="outline" className={getStatusColor(debugInfo.rlsEnabled)}>
                  {debugInfo.rlsEnabled ? 'Yes' : 'No'}
                </Badge>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-sm">Data Status</h4>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm">View Mode:</span>
                <Badge variant="secondary">{debugInfo.viewMode}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Selected Teams:</span>
                <Badge variant="secondary">{debugInfo.selectedTeamIds.length}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Total Tasks:</span>
                <Badge variant="secondary">{debugInfo.tasksCount}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Filtered Tasks:</span>
                <Badge variant="secondary">{debugInfo.filteredTasksCount}</Badge>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-destructive/5 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="font-medium text-red-800">Error Detected</span>
            </div>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {loading && (
          <div className="mt-4 p-3 bg-primary/5 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm text-primary">Loading tasks data...</span>
            </div>
          </div>
        )}

        {onRefresh && (
          <div className="mt-4 pt-3 border-t">
            <Button onClick={onRefresh} variant="outline" size="sm" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh Debug Info
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
