
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crown, Users, Play, AlertCircle } from 'lucide-react';
import { useNewMeetingTimer, MeetingRole } from '@/contexts/NewMeetingTimerContext';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

interface RoleSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  teamName: string;
  existingScriber?: string | null;
}

export const RoleSelectionModal: React.FC<RoleSelectionModalProps> = ({
  isOpen,
  onClose,
  teamId,
  teamName,
  existingScriber
}) => {
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { startMeeting } = useNewMeetingTimer();
  const { toast } = useToast();

  const handleStartMeeting = async (role: MeetingRole) => {
    setIsStarting(true);
    setError(null);
    try {
      await startMeeting(teamId, role);
      onClose();
    } catch (error: any) {
      logger.error('Failed to start meeting:', error);
      const errorMessage = error?.message || 'Unknown error occurred';
      setError(errorMessage);
      toast({
        title: "Failed to Start Meeting",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-5 w-5 text-primary" />
            Start Meeting: {teamName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground mb-6">
            Choose your role for this meeting:
          </p>

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <p className="text-sm text-destructive font-medium">Failed to Start Meeting</p>
              </div>
              <p className="text-sm text-destructive/80 mt-1">{error}</p>
            </div>
          )}
          
          {/* Scriber Option */}
          <div className="space-y-3">
            <Button
              onClick={() => handleStartMeeting('scriber')}
              disabled={isStarting || !!existingScriber}
              className="w-full h-auto p-4 flex flex-col items-start gap-2 text-left"
              variant={existingScriber ? "secondary" : "default"}
            >
              <div className="flex items-center gap-2 w-full">
                <Crown className="h-5 w-5 text-warning" />
                <span className="font-semibold">
                  Start as Meeting Scriber
                </span>
              </div>
              <p className="text-sm opacity-90">
                Control the timer, navigate sections, and facilitate the meeting
              </p>
              {existingScriber && (
                <p className="text-xs text-warning mt-1">
                  Meeting already has a Scriber
                </p>
              )}
            </Button>
            
            {/* Participant Option */}
            <Button
              onClick={() => handleStartMeeting('participant')}
              disabled={isStarting}
              variant="outline"
              className="w-full h-auto p-4 flex flex-col items-start gap-2 text-left"
            >
              <div className="flex items-center gap-2 w-full">
                <Users className="h-5 w-5 text-info" />
                <span className="font-semibold">
                  Join as Participant
                </span>
              </div>
              <p className="text-sm opacity-75">
                Follow along with the shared timer and participate in discussions
              </p>
            </Button>
          </div>
          
          <div className="mt-6 p-3 bg-info/10 rounded-lg">
            <p className="text-xs text-info">
              <strong>Scriber:</strong> Controls timer, facilitates meeting<br/>
              <strong>Participant:</strong> Follows shared timer, participates in meeting
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
