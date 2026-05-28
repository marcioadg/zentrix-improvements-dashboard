
import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle, Wifi, Shield } from 'lucide-react';

interface MetricsErrorRecoveryProps {
  error?: string | null;
  loading?: boolean;
  onRetry?: () => void;
  canRetry?: boolean;
  retryCount?: number;
}

export const MetricsErrorRecovery: React.FC<MetricsErrorRecoveryProps> = ({
  error,
  loading = false,
  onRetry,
  canRetry = false,
  retryCount = 0
}) => {
  if (!error) return null;

  const getErrorIcon = () => {
    if (error.includes('Network error')) return <Wifi className="w-5 h-5" />;
    if (error.includes('Permission denied') || error.includes('Access restricted')) return <Shield className="w-5 h-5" />;
    return <AlertCircle className="w-5 h-5" />;
  };

  const getErrorColor = () => {
    if (error.includes('No team selected')) return 'text-info bg-info/10 border-info/20';
    if (error.includes('Network error')) return 'text-warning bg-warning/10 border-warning/20';
    if (error.includes('Permission denied') || error.includes('Access restricted')) return 'text-destructive bg-destructive/10 border-destructive/20';
    return 'text-muted-foreground bg-muted border-border';
  };

  const shouldShowRetry = canRetry && onRetry && !error.includes('No team selected') && !error.includes('Permission denied');

  return (
    <div className={`p-4 rounded-lg border ${getErrorColor()}`}>
      <div className="flex items-start gap-3">
        {getErrorIcon()}
        <div className="flex-1">
          <div className="font-medium">
            {error.includes('No team selected') ? 'Team Selection Required' : 'Metrics Loading Issue'}
          </div>
          <div className="text-sm mt-1 opacity-90">{error}</div>
          
          {shouldShowRetry && (
            <div className="mt-3 flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Retrying...' : retryCount > 0 ? `Retry (${retryCount}/3)` : 'Retry'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
