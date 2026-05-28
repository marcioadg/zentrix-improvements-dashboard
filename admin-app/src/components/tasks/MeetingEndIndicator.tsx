import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useOptimisticMeetingEnd } from '@/contexts/OptimisticMeetingEndContext';

export const MeetingEndIndicator: React.FC = () => {
  const { 
    isEndingMeeting, 
    isLeavingMeeting, 
    error, 
    clearError 
  } = useOptimisticMeetingEnd();

  if (!isEndingMeeting && !isLeavingMeeting && !error) {
    return null;
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mx-4 mt-4 mb-2">
        <XCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>Meeting processing failed: {error}</span>
          <button 
            onClick={clearError}
            className="text-sm underline hover:no-underline"
          >
            Dismiss
          </button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="mx-4 mt-4 mb-2 border-primary/20 bg-primary/5">
      <Loader2 className="h-4 w-4 animate-spin" />
      <AlertDescription>
        {isEndingMeeting ? 'Finalizing meeting and saving results...' : 'Processing meeting exit...'}
      </AlertDescription>
    </Alert>
  );
};