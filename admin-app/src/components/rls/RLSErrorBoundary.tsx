
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw, Wifi, WifiOff } from 'lucide-react';

interface RLSError {
  type: 'network' | 'permission' | 'database' | 'unknown';
  message: string;
  operation: string;
  retryable: boolean;
}

interface RLSErrorBoundaryProps {
  error: RLSError | null;
  onRetry: () => void;
  onClearError: () => void;
  isConnected: boolean;
  children: React.ReactNode;
}

export const RLSErrorBoundary: React.FC<RLSErrorBoundaryProps> = ({
  error,
  onRetry,
  onClearError,
  isConnected,
  children
}) => {
  if (!error) {
    return <>{children}</>;
  }

  const getErrorIcon = () => {
    switch (error.type) {
      case 'network':
        return <WifiOff className="h-6 w-6 text-error" />;
      case 'permission':
        return <AlertTriangle className="h-6 w-6 text-warning" />;
      case 'database':
        return <AlertTriangle className="h-6 w-6 text-warning" />;
      default:
        return <AlertTriangle className="h-6 w-6 text-error" />;
    }
  };

  const getErrorTitle = () => {
    switch (error.type) {
      case 'network':
        return 'Network Connection Error';
      case 'permission':
        return 'Permission Denied';
      case 'database':
        return 'Database Configuration Error';
      default:
        return 'Unexpected Error';
    }
  };

  const getErrorDescription = () => {
    switch (error.type) {
      case 'network':
        return 'Unable to connect to the server. Please check your internet connection and try again.';
      case 'permission':
        return 'You do not have sufficient permissions to access RLS management features. Please contact your administrator.';
      case 'database':
        return 'Required database functions are not available. The RLS management features may not be properly configured.';
      default:
        return 'An unexpected error occurred while loading RLS data.';
    }
  };

  return (
    <div className="min-h-screen bg-muted/50 flex items-center justify-center">
      <div className="max-w-2xl mx-auto p-6">
        <Card className="border-error/30 bg-error/5">
          <CardHeader>
            <div className="flex items-center space-x-3">
              {getErrorIcon()}
              <div>
                <CardTitle className="text-error">{getErrorTitle()}</CardTitle>
                <CardDescription className="text-error/80">
                  {getErrorDescription()}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Operation:</strong> {error.operation}<br />
                <strong>Details:</strong> {error.message}
              </AlertDescription>
            </Alert>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {isConnected ? (
                  <>
                    <Wifi className="h-4 w-4 text-success" />
                    <span className="text-sm text-success">Connected</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-4 w-4 text-error" />
                    <span className="text-sm text-error">Disconnected</span>
                  </>
                )}
              </div>
              
              <div className="flex space-x-2">
                <Button variant="outline" onClick={onClearError}>
                  Dismiss
                </Button>
                {error.retryable && (
                  <Button onClick={onRetry} className="flex items-center space-x-2">
                    <RefreshCw className="h-4 w-4" />
                    <span>Retry</span>
                  </Button>
                )}
              </div>
            </div>

            {error.type === 'database' && (
              <div className="mt-4 p-4 bg-warning/5 border border-warning/30 rounded-lg">
                <h4 className="font-medium text-warning mb-2">Troubleshooting Steps:</h4>
                <ul className="text-sm text-warning/80 space-y-1">
                  <li>• Ensure you have super admin privileges</li>
                  <li>• Verify the database functions exist: get_enhanced_policies, get_enhanced_table_info, get_rls_statistics</li>
                  <li>• Check the Supabase dashboard for any database errors</li>
                  <li>• Contact your system administrator if the issue persists</li>
                </ul>
              </div>
            )}

            {error.type === 'network' && (
              <div className="mt-4 p-4 bg-info/5 border border-info/30 rounded-lg">
                <h4 className="font-medium text-info mb-2">Network Troubleshooting:</h4>
                <ul className="text-sm text-info/80 space-y-1">
                  <li>• Check your internet connection</li>
                  <li>• Try refreshing the page</li>
                  <li>• Check if other parts of the application are working</li>
                  <li>• Wait a moment and try again - the server may be temporarily unavailable</li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
