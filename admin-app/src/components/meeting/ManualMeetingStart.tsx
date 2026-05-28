
import React from 'react';
import { Button } from '@/components/ui/button';
import { Play, RefreshCw } from 'lucide-react';

interface ManualMeetingStartProps {
  onStartMeeting: () => void;
  isStarting: boolean;
  lastError: string | null;
  startAttempts: number;
}

export const ManualMeetingStart: React.FC<ManualMeetingStartProps> = ({
  onStartMeeting,
  isStarting,
  lastError,
  startAttempts
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="bg-card p-8 rounded-lg shadow-md max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-foreground mb-4">Start Your Meeting</h1>
        
        {lastError && (
          <div className="mb-4 p-3 bg-destructive/5 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">
              Auto-start failed: {lastError}
            </p>
          </div>
        )}
        
        <p className="text-muted-foreground mb-6">
          {startAttempts > 0 
            ? "Auto-start didn't work, but you can start the meeting manually."
            : "Click the button below to begin your meeting."
          }
        </p>
        
        <Button
          onClick={onStartMeeting}
          disabled={isStarting}
          className="w-full"
          size="lg"
        >
          {isStarting ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Starting Meeting...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Start Meeting
            </>
          )}
        </Button>
        
        {startAttempts > 0 && (
          <p className="text-xs text-muted-foreground mt-3">
            Attempt {startAttempts}/2
          </p>
        )}
      </div>
    </div>
  );
};
