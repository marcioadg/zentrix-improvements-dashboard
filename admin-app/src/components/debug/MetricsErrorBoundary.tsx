
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw, Bug, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { logger } from '@/utils/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  userContext?: any;
}

export class MetricsErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('🚨 MetricsErrorBoundary caught an error:', error);
    logger.error('🚨 Component stack:', errorInfo.componentStack);
    logger.error('🚨 Error stack:', error.stack);
    
    // Capture user context for debugging
    const userContext = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      componentStack: errorInfo.componentStack
    };
    
    this.setState({ 
      error, 
      errorInfo, 
      userContext 
    });
    
    this.props.onError?.(error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined,
      userContext: undefined 
    });
  };

  private handleCopyErrorInfo = () => {
    const errorReport = {
      error: this.state.error?.message,
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      userContext: this.state.userContext
    };
    
    navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2));
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isNetworkError = this.state.error?.message?.toLowerCase().includes('network') ||
                            this.state.error?.message?.toLowerCase().includes('fetch');

      return (
        <div className="p-6 border border-red-200 bg-destructive/5 rounded-lg m-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-destructive mt-1 flex-shrink-0" />
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-red-800 mb-2">
                {isNetworkError ? 'Network Error' : 'Something went wrong'}
              </h2>
              
              <div className="space-y-3">
                <p className="text-red-700">
                  {isNetworkError 
                    ? 'Unable to load metrics data. This could be due to network connectivity or server issues.'
                    : 'An unexpected error occurred while loading the metrics page.'
                  }
                </p>
                
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={this.handleRetry}>
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Try Again
                  </Button>
                  
                  <Button variant="outline" size="sm" onClick={this.handleCopyErrorInfo}>
                    <Copy className="h-4 w-4 mr-1" />
                    Copy Error Info
                  </Button>
                  
                  <Button variant="outline" size="sm" onClick={() => window.location.href = '/dashboard'}>
                    Go to Dashboard
                  </Button>
                </div>
                
                {process.env.NODE_ENV === 'development' && (
                  <details className="text-sm text-destructive mt-4">
                    <summary className="cursor-pointer font-medium flex items-center gap-1">
                      <Bug className="h-4 w-4" />
                      Developer Details
                    </summary>
                    <div className="mt-2 p-3 bg-destructive/10 rounded text-xs overflow-auto max-h-40">
                      <div><strong>Error:</strong> {this.state.error?.message}</div>
                      <div><strong>Component Stack:</strong></div>
                      <pre className="whitespace-pre-wrap">{this.state.errorInfo?.componentStack}</pre>
                      {this.state.error?.stack && (
                        <>
                          <div><strong>Error Stack:</strong></div>
                          <pre className="whitespace-pre-wrap">{this.state.error.stack}</pre>
                        </>
                      )}
                    </div>
                  </details>
                )}
                
                <div className="text-sm text-destructive mt-4">
                  <p><strong>Troubleshooting tips:</strong></p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Check your internet connection</li>
                    <li>Try refreshing the page</li>
                    <li>Clear your browser cache</li>
                    <li>Contact support if the issue persists</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook version for easier use in functional components
export const withMetricsErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>
) => {
  return (props: P) => (
    <MetricsErrorBoundary>
      <Component {...props} />
    </MetricsErrorBoundary>
  );
};
