
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, LogIn, Building2, AlertCircle } from 'lucide-react';

interface TasksAuthErrorRecoveryProps {
  error: string;
  onRetry: () => void;
  retryAttempt: number;
  loading: boolean;
}

export const TasksAuthErrorRecovery: React.FC<TasksAuthErrorRecoveryProps> = ({
  error,
  onRetry,
  retryAttempt,
  loading
}) => {
  const isAuthError = error.includes('log in');
  const isCompanyError = error.includes('Company context');
  
  const getIcon = () => {
    if (isAuthError) return <LogIn className="h-5 w-5" />;
    if (isCompanyError) return <Building2 className="h-5 w-5" />;
    return <AlertCircle className="h-5 w-5" />;
  };

  const getTitle = () => {
    if (isAuthError) return 'Authentication Required';
    if (isCompanyError) return 'Company Access Required';
    return 'Loading Error';
  };

  const getDescription = () => {
    if (isAuthError) return 'Please log in to view your tasks and team information.';
    if (isCompanyError) return 'Company context is required to load your tasks. Please ensure you have access to a company or contact support.';
    return error;
  };

  const getActionText = () => {
    if (isAuthError) return 'Go to Login';
    return `Retry ${retryAttempt > 0 ? `(${retryAttempt})` : ''}`;
  };

  const handleAction = () => {
    if (isAuthError) {
      window.location.href = '/login';
    } else {
      onRetry();
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Tasks</h1>
        <p className="text-muted-foreground">Unable to load your tasks</p>
      </div>

      <Card className="border-warning/30 bg-warning/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-warning-foreground">
            {getIcon()}
            {getTitle()}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-warning-foreground/80">
              {getDescription()}
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button 
              onClick={handleAction}
              disabled={loading}
              className="gap-2"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                getIcon()
              )}
              {getActionText()}
            </Button>

            {!isAuthError && (
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()}
              >
                Refresh Page
              </Button>
            )}
          </div>

          {retryAttempt > 2 && (
            <Alert>
              <AlertDescription>
                If the problem persists, try refreshing the page or contact support.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
