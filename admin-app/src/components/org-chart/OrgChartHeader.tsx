
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { RealtimeConnectionStatus } from '@/components/shared/RealtimeConnectionStatus';
import { OrgChartDebugPanel } from './OrgChartDebugPanel';

interface OrgChartHeaderProps {
  fetchError: string | null;
  currentCompany: any;
  realtimeConnected: boolean;
  isSuperAdmin: boolean;
  debugInfo: any;
  isLoading?: boolean;
}

export const OrgChartHeader: React.FC<OrgChartHeaderProps> = ({
  fetchError,
  currentCompany,
  realtimeConnected,
  isSuperAdmin,
  debugInfo,
  isLoading = false,
}) => {
  return (
    <>
      {/* Error Display */}
      {fetchError && (
        <Alert variant="destructive" className="mx-2 sm:mx-4 mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span className="text-sm">Failed to load org chart data: {fetchError}</span>
            <Button 
              variant="outline" 
              size="sm" 
              className="self-start sm:self-auto"
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Company Context Warning — only show after loading completes */}
      {!currentCompany && !isLoading && (
        <Alert className="mx-2 sm:mx-4 mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Please select a company from the company switcher to view and manage organizational roles.
          </AlertDescription>
        </Alert>
      )}

      {/* Real-time Connection Status */}
      <RealtimeConnectionStatus 
        connected={realtimeConnected} 
        className="fixed bottom-4 right-4 z-50 scale-90 sm:scale-100"
      />

      {/* Super Admin Debug Panel */}
      {/* Debug panel hidden — use browser console for debug info */}
    </>
  );
};
