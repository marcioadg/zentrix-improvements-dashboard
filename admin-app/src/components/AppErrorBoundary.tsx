import React, { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import * as Sentry from '@sentry/react';
import { Button } from '@/components/ui/button';
import { logger } from '@/utils/logger';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

class AppErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState & { retryCount: number; isAutoRetrying: boolean }> {
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, retryCount: 0, isAutoRetrying: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('App Error Boundary caught an error:', error, errorInfo);
    Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } });

    // Auto-retry up to 3 times with exponential backoff: 1.5s, 3s, 6s
    if (this.state.retryCount < 3) {
      this.setState({ isAutoRetrying: true });
      const delay = 1500 * Math.pow(2, this.state.retryCount);
      this.retryTimer = setTimeout(() => {
        this.setState(prev => ({ hasError: false, error: undefined, retryCount: prev.retryCount + 1, isAutoRetrying: false }));
      }, delay);
    }
  }

  componentWillUnmount() {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }
  }

  render() {
    if (this.state.hasError) {
      // Show a lightweight spinner during auto-retry instead of the full error screen
      if (this.state.isAutoRetrying) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="max-w-md mx-auto text-center p-6">
              <RefreshCw className="h-8 w-8 text-muted-foreground animate-spin mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">
                Something went wrong. Retrying automatically… (attempt {this.state.retryCount + 1} of 3)
              </p>
            </div>
          </div>
        );
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="max-w-md mx-auto text-center p-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 mb-4">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>

            <h1 className="text-xl font-semibold text-foreground mb-2">
              Something went wrong
            </h1>

            <p className="text-muted-foreground mb-6">
              The app encountered an error and couldn't load properly.
            </p>

            <div className="space-y-3">
              <Button onClick={() => this.setState({ hasError: false, retryCount: 0 })} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>

              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                className="w-full"
              >
                Reload Page
              </Button>
            </div>

            {this.state.error && (
              <details className="mt-6 text-left">
                <summary className="text-xs text-muted-foreground cursor-pointer">
                  Error Details
                </summary>
                <pre className="text-xs text-destructive bg-destructive/5 p-2 rounded mt-2 overflow-auto max-h-32">
                  {this.state.error.message}
                  {'\n'}
                  {this.state.error.stack?.split('\n').slice(0, 5).join('\n')}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export { AppErrorBoundary };