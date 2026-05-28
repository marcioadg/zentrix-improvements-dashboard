import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crown, Users, ArrowLeft } from 'lucide-react';
import { logger } from '@/utils/logger';

interface CustomMeetingRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRoleSelected: (role: 'scriber' | 'participant') => Promise<void>;
  teamName?: string;
  audienceType: 'team' | 'members';
  memberCount?: number;
}

export const CustomMeetingRoleModal: React.FC<CustomMeetingRoleModalProps> = ({
  isOpen,
  onClose,
  onRoleSelected,
  teamName,
  audienceType,
  memberCount,
}) => {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'scriber' | 'participant' | null>(null);

  const handleRoleSelect = async (role: 'scriber' | 'participant') => {
    setIsSelecting(true);
    setSelectedRole(role);
    
    try {
      await onRoleSelected(role);
    } catch (error) {
      logger.error('Failed to start meeting with role:', error);
      setIsSelecting(false);
      setSelectedRole(null);
    }
  };

  const getAudienceDisplay = () => {
    if (audienceType === 'team') {
      return teamName || 'Team';
    }
    return `${memberCount || 0} Selected Member${memberCount !== 1 ? 's' : ''}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-sm bg-background/95 backdrop-blur-sm border-0 shadow-2xl p-0 gap-0">
        <div className="p-6 pb-4">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base font-medium text-foreground">
              Pick your role
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              {getAudienceDisplay()}
            </p>
          </DialogHeader>
        </div>
        
        <div className="px-6 pb-6 space-y-2">
          <button
            onClick={() => handleRoleSelect('scriber')}
            disabled={isSelecting}
            className="w-full p-4 rounded-lg border border-border bg-background hover:bg-muted/50 hover:border-muted-foreground/20 transition-all duration-200 text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center group-hover:bg-muted-foreground/10 transition-colors">
                <Crown className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-foreground">
                  Scriber
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Control timer & meeting flow
                </div>
              </div>
              {isSelecting && selectedRole === 'scriber' && (
                <div className="text-xs text-muted-foreground">
                  Starting...
                </div>
              )}
            </div>
          </button>
          
          <button
            onClick={() => handleRoleSelect('participant')}
            disabled={isSelecting}
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
              {isSelecting && selectedRole === 'participant' && (
                <div className="text-xs text-muted-foreground">
                  Starting...
                </div>
              )}
            </div>
          </button>
          
          <Button
            variant="ghost"
            className="w-full mt-2"
            onClick={onClose}
            disabled={isSelecting}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Builder
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
