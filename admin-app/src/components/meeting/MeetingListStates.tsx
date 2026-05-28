
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingState as UILoadingState } from '@/components/ui/loading-state';
import { AlertTriangle, RefreshCw, Calendar, Users } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface MeetingLoadingStateProps {
  showFallback?: boolean;
}

interface ErrorStateProps {
  error: string;
  onRetry?: () => void;
}

interface EmptyStateProps {
  showCreateButton?: boolean;
  onCreateMeeting?: () => void;
}

export const MeetingLoadingState: React.FC<MeetingLoadingStateProps> = ({ showFallback = false }) => {
  if (showFallback) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-foreground">Loading meetings...</h3>
              <p className="text-sm text-muted-foreground mt-1">
                This may take a moment while we set up your workspace
              </p>
            </div>
            <Alert className="max-w-md mx-auto">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                If this takes too long, try refreshing the page
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="py-12">
        <UILoadingState message="Loading your meetings..." />
      </CardContent>
    </Card>
  );
};

export const ErrorState: React.FC<ErrorStateProps> = ({ error, onRetry }) => (
  <Card>
    <CardContent className="py-8">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <div>
          <h3 className="text-lg font-medium text-foreground">Unable to load meetings</h3>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
        </div>
        {onRetry && (
          <Button onClick={onRetry} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        )}
      </div>
    </CardContent>
  </Card>
);

export const EmptyState: React.FC<EmptyStateProps> = ({ 
  showCreateButton = false, 
  onCreateMeeting 
}) => (
  <div className="text-center py-16">
    <div className="mx-auto h-12 w-12 text-muted-foreground mb-4">
      <Users className="h-full w-full" />
    </div>
    <h3 className="text-lg font-medium text-foreground mb-2">No active meetings</h3>
    <p className="text-muted-foreground mb-6 max-w-md mx-auto">
      Start a meeting above to begin collaborating with your team
    </p>
  </div>
);
