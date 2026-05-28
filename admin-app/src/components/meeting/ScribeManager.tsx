import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Crown, AlertTriangle, Timer, Users, Wifi, WifiOff } from 'lucide-react';
import { useNewMeetingTimer } from '@/contexts/NewMeetingTimerContext';
import { useToast } from '@/hooks/use-toast';
import { useScribeActivity } from '@/hooks/useScribeActivity';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface ScribeManagerProps {
  teamId: string;
}

export const ScribeManager: React.FC<ScribeManagerProps> = ({ teamId }) => {
  const { 
    isRunning,
    currentRole,
    scriberId,
    meetingId,
    takeOverAsScriber,
    currentUserId
  } = useNewMeetingTimer();

  const [scriberTransferState, setScriiberTransferState] = useState<{
    isTransferring: boolean;
    volunteers: string[];
    timeout: number;
    showVolunteerPrompt: boolean;
  }>({
    isTransferring: false,
    volunteers: [],
    timeout: 0,
    showVolunteerPrompt: false
  });

  const { toast } = useToast();
  const scriberActivity = useScribeActivity(meetingId, scriberId);

  // Show volunteer prompt when scriber becomes inactive
  useEffect(() => {
    if (scriberActivity.isTimeout && currentRole === 'participant' && !scriberTransferState.showVolunteerPrompt) {
      setScriiberTransferState(prev => ({
        ...prev,
        showVolunteerPrompt: true
      }));

      toast({
        title: "Scriber Inactive",
        description: "The meeting scriber appears to be inactive. Someone needs to take over.",
        variant: "destructive",
      });
    }
  }, [scriberActivity.isTimeout, currentRole, scriberTransferState.showVolunteerPrompt, toast]);

  // Listen for scriber transfer events
  useEffect(() => {
    if (!meetingId) return;

    const subscription = supabase
      .channel(`scriber_transfer_${meetingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'scriber_transfer_log',
          filter: `meeting_state_id=eq.${meetingId}`
        },
        (payload) => {
          logger.log('🔄 Scriber transfer event:', payload.new);
          const transferData = payload.new as any;
          
          if (transferData.transfer_type === 'volunteer_requested') {
            // Someone volunteered - add to volunteers list if not already there
            setScriiberTransferState(prev => ({
              ...prev,
              volunteers: prev.volunteers.includes(transferData.new_scriber_id) 
                ? prev.volunteers 
                : [...prev.volunteers, transferData.new_scriber_id]
            }));
          } else if (transferData.transfer_type === 'scriber_left') {
            // Scriber left - show volunteer prompt
            setScriiberTransferState(prev => ({
              ...prev,
              showVolunteerPrompt: true,
              timeout: 30 // 30 second timeout
            }));

            toast({
              title: "Scriber Left Meeting",
              description: "The meeting scriber has left. Someone needs to take over to continue.",
              variant: "destructive",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [meetingId, toast]);

  // Volunteer timeout countdown
  useEffect(() => {
    if (scriberTransferState.timeout > 0) {
      const timer = setTimeout(() => {
        setScriiberTransferState(prev => ({
          ...prev,
          timeout: prev.timeout - 1
        }));
      }, 1000);

      return () => clearTimeout(timer);
    } else if (scriberTransferState.timeout === 0 && scriberTransferState.showVolunteerPrompt) {
      // Timeout reached - auto-assign if no volunteers
      handleAutoAssignment();
    }
  }, [scriberTransferState.timeout]);

  const handleVolunteer = async () => {
    if (!meetingId || !currentUserId) return;

    try {
      setScriiberTransferState(prev => ({ ...prev, isTransferring: true }));

      // Attempt to take over using the simplified transfer function
      await takeOverAsScriber();

      setScriiberTransferState({
        isTransferring: false,
        volunteers: [],
        timeout: 0,
        showVolunteerPrompt: false
      });

      logger.log('You are now the meeting scriber (toast suppressed)');

    } catch (error) {
      logger.error('Error volunteering as scriber:', error);
      setScriiberTransferState(prev => ({ ...prev, isTransferring: false }));
      
      toast({
        title: "Failed to Take Over",
        description: "Unable to become scriber. Another user may have already taken over.",
        variant: "destructive",
      });
    }
  };

  const handleAutoAssignment = async () => {
    // This would typically assign to the first participant
    // For now, just clear the prompt
    setScriiberTransferState({
      isTransferring: false,
      volunteers: [],
      timeout: 0,
      showVolunteerPrompt: false
    });

    toast({
      title: "No Scriber Available",
      description: "Meeting continues without a designated scriber. Anyone can volunteer.",
      variant: "destructive",
    });
  };

  if (!isRunning) {
    return null;
  }

  const isCurrentUserScriber = currentUserId === scriberId;
  const hasScriber = !!scriberId;
  const canTakeOver = currentRole === 'participant' && (!hasScriber || scriberActivity.isTimeout);

  return (
    <div className="space-y-3">
      {/* Scriber Status Display */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Crown className="h-4 w-4 text-warning" />
          <span className="text-sm font-medium">Scriber:</span>
        </div>
        
        {hasScriber ? (
          <div className="flex items-center gap-2">
            <Badge variant={isCurrentUserScriber ? "default" : "secondary"}>
              {isCurrentUserScriber ? "You" : "Team Member"}
            </Badge>
            
            {/* Activity indicator */}
            <div className="flex items-center gap-1">
              {scriberActivity.isActive ? (
                <Wifi className="h-3 w-3 text-green-500" />
              ) : (
                <WifiOff className="h-3 w-3 text-destructive" />
              )}
              <span className="text-xs text-muted-foreground">
                {scriberActivity.isActive ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
        ) : (
          <Badge variant="outline" className="text-warning border-orange-200">
            No Scriber
          </Badge>
        )}
      </div>

      {/* Scriber Transfer Alert */}
      {scriberTransferState.showVolunteerPrompt && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertDescription>
            <div className="space-y-3">
              <div>
                <strong>Scriber Needed!</strong>
                {scriberActivity.isTimeout 
                  ? " The current scriber appears to be inactive."
                  : " The scriber has left the meeting."
                }
                Someone needs to take over to control the meeting timer.
              </div>
              
              {scriberTransferState.timeout > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <Timer className="h-3 w-3" />
                  Auto-assignment in {scriberTransferState.timeout}s
                </div>
              )}
              
              {canTakeOver && (
                <Button 
                  onClick={handleVolunteer}
                  disabled={scriberTransferState.isTransferring}
                  size="sm"
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  {scriberTransferState.isTransferring ? "Taking Over..." : "Volunteer as Scriber"}
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Take Over Button (shown when no scriber or scriber inactive) */}
      {canTakeOver && !scriberTransferState.showVolunteerPrompt && (
        <Button
          onClick={handleVolunteer}
          size="sm"
          variant="outline"
          className="flex items-center gap-2 text-xs px-3 py-1 h-8 border-yellow-300 hover:bg-warning/5 hover:border-yellow-400"
        >
          <Crown className="h-3 w-3 text-warning" />
          Become Scriber
        </Button>
      )}

      {/* No Timer Control Warning */}
      {currentRole === 'participant' && hasScriber && scriberActivity.isActive && (
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <Users className="h-3 w-3" />
          Timer controlled by scriber
        </div>
      )}
    </div>
  );
};