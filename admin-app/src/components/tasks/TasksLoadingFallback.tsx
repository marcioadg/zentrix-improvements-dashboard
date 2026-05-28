
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface TasksLoadingFallbackProps {
  loadingStep: string;
  onRetry?: () => void;
  error?: string | null;
}

export const TasksLoadingFallback: React.FC<TasksLoadingFallbackProps> = ({
  loadingStep,
  onRetry,
  error
}) => {
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive">Loading Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive/80 mb-4">{error}</p>
            {onRetry && (
              <Button onClick={onRetry} variant="outline" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Tasks</h1>
        <p className="text-muted-foreground">Loading your tasks...</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center min-h-96 space-y-4">
            <LoadingSpinner size="lg" />
            <div className="text-center">
              <p className="text-lg font-medium">{loadingStep}</p>
              <p className="text-sm text-muted-foreground mt-2">
                This may take a few moments...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
