
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logger } from '@/utils/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Special handling for MultiCompanyProvider errors
      const isContextError = this.state.error?.message?.includes('MultiCompanyProvider');

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Alert className="max-w-md">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="space-y-4">
              <div>
                <p className="font-medium">
                  {isContextError ? 'Context Loading Error' : 'Something went wrong'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {isContextError 
                    ? 'Company context failed to load. This might be a temporary issue.'
                    : this.state.error?.message || 'An unexpected error occurred'
                  }
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={this.handleRetry}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Reload Page
                </Button>
                {isContextError && (
                  <Button variant="default" size="sm" onClick={this.handleReload}>
                    Reload Page
                  </Button>
                )}
              </div>
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}
