import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crown, Users, RotateCcw } from 'lucide-react';
import { MeetingRole } from '@/contexts/NewMeetingTimerContext';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface NewRoleSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartMeeting: (role: MeetingRole) => Promise<void>;
  teamName: string;
  hasExistingScriber?: boolean;
  activeMeetingId?: string | null;
}

export const NewRoleSelectionModal: React.FC<NewRoleSelectionModalProps> = ({
  isOpen,
  onClose,
  onStartMeeting,
  teamName,
  hasExistingScriber = false,
  activeMeetingId = null,
}) => {
  const [isStarting, setIsStarting] = useState(false);
  const [selectedRole, setSelectedRole] = useState<MeetingRole | null>(null);
  const [wasFormerScriber, setWasFormerScriber] = useState(false);
  const [canTakeOver, setCanTakeOver] = useState(false);

  // Auto-join as participant if there's already a scriber
  useEffect(() => {
    if (isOpen && hasExistingScriber) {
      // If there's an existing scriber, auto-join as participant (no modal needed)
      logger.log('🤖 Auto-joining as participant since scriber exists');
      handleStartMeeting('participant');
      return;
    }
  }, [isOpen, hasExistingScriber]);

  // useEffect for checking former scriber status
  useEffect(() => {
    const checkFormerScriber = async () => {
      if (!activeMeetingId || !isOpen) return;

      try {
        const currentUserId = (await supabase.auth.getUser()).data.user?.id;
        if (!currentUserId) return;

        const { data: meetingData, error } = await supabase
          .from('meetings_state')
          .select('scriber_id, role_assignments')
          .eq('id', activeMeetingId)
          .single();

        if (error || !meetingData) return;

        // Check if user was previously assigned as scriber in this meeting
        const roleAssignments = meetingData.role_assignments || {};
        const userWasScriber = roleAssignments[currentUserId] === 'scriber' || 
                              meetingData.scriber_id === currentUserId;

        // Check if no current active scriber
        const noActiveScriber = !meetingData.scriber_id || meetingData.scriber_id === currentUserId;

        setWasFormerScriber(userWasScriber);
        setCanTakeOver(noActiveScriber && !hasExistingScriber);

        logger.log('📋 Role detection:', {
          userWasScriber,
          noActiveScriber,
          canTakeOver: noActiveScriber && !hasExistingScriber,
          currentScriberId: meetingData.scriber_id,
          currentUserId
        });
      } catch (error) {
        logger.error('Error checking former scriber status:', error);
      }
    };

    checkFormerScriber();
  }, [activeMeetingId, isOpen, hasExistingScriber]);

  const handleStartMeeting = async (role: MeetingRole) => {
    setIsStarting(true);
    setSelectedRole(role);
    
    try {
      await onStartMeeting(role);
      onClose();
    } catch (error) {
      logger.error('Failed to start meeting:', error);
    } finally {
      setIsStarting(false);
      setSelectedRole(null);
    }
  };

  const getTitle = () => {
    if (activeMeetingId) {
      if (wasFormerScriber && canTakeOver) return 'Resume Your Role';
      if (canTakeOver) return 'Join Meeting';
      return 'Join Meeting';
    }
    return 'Pick your role';
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-sm bg-background/95 backdrop-blur-sm border-0 shadow-2xl p-0 gap-0">
        <div className="p-6 pb-4">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base font-medium text-foreground">
              Pick your role
            </DialogTitle>
          </DialogHeader>
        </div>
        
        <div className="px-6 pb-6 space-y-2">
          <button
            onClick={() => handleStartMeeting('scriber')}
            disabled={isStarting || (hasExistingScriber && !canTakeOver)}
            className={`w-full p-4 rounded-lg border transition-all duration-200 text-left group ${
              hasExistingScriber && !canTakeOver
                ? 'opacity-40 cursor-not-allowed border-border bg-muted/20' 
                : wasFormerScriber && canTakeOver
                ? 'border-green-200 bg-success/5 hover:bg-success/10 hover:border-green-300'
                : 'border-border bg-background hover:bg-muted/50 hover:border-muted-foreground/20'
            }`}
          >
            <div className="flex items-center gap-3">
              {wasFormerScriber && canTakeOver ? (
                <div className="w-8 h-8 rounded-md bg-success/10 flex items-center justify-center">
                  <RotateCcw className="h-4 w-4 text-success" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center group-hover:bg-muted-foreground/10 transition-colors">
                  <Crown className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1">
                <div className="text-sm font-medium text-foreground">
                  {wasFormerScriber && canTakeOver ? 'Resume as Scriber' : 
                   canTakeOver ? 'Become Scriber' : 'Scriber'}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Control timer & meeting flow
                </div>
              </div>
              {isStarting && selectedRole === 'scriber' && (
                <div className="text-xs text-muted-foreground">
                  Starting...
                </div>
              )}
            </div>
          </button>
          
          <button
            onClick={() => handleStartMeeting('participant')}
            disabled={isStarting}
            className="w-full p-4 rounded-lg border border-border bg-background hover:bg-muted/50 hover:border-muted-foreground/20 transition-all duration-200 text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center group-hover:bg-muted-foreground/10 transition-colors">
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-foreground">
                  Participant
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Follow along and contribute
                </div>
              </div>
              {isStarting && selectedRole === 'participant' && (
                <div className="text-xs text-muted-foreground">
                  Joining...
                </div>
              )}
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
