import React, { useState, useContext } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSettings } from '@/contexts/SettingsContext';
import { NewMeetingTimerContext } from '@/contexts/NewMeetingTimerContext';
import { VotingContext } from '@/contexts/VotingContext';
import { useToast } from '@/hooks/use-toast';
import { VotingService } from '@/services/VotingService';
import { Vote, Save } from 'lucide-react';
import { logger } from '@/utils/logger';
interface VotingSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
export const VotingSettingsModal: React.FC<VotingSettingsModalProps> = ({
  open,
  onOpenChange
}) => {
  const {
    settings,
    updateVoteLimit,
    loading
  } = useSettings();
  
  // Safe context access for preview mode
  const timerContext = useContext(NewMeetingTimerContext);
  const votingContext = useContext(VotingContext);
  
  const meetingId = timerContext?.meetingId;
  const currentRole = timerContext?.currentRole;
  const refreshVoteLimit = votingContext?.refreshVoteLimit;
  const effectiveVoteLimit = votingContext?.voteLimit;
  
  const {
    toast
  } = useToast();
  
  // Detect preview mode (when contexts are missing)
  const isPreviewMode = !votingContext || !timerContext;
  
  const [voteLimit, setVoteLimit] = useState(effectiveVoteLimit || settings?.vote_limit || 25);
  const [saving, setSaving] = useState(false);
  const isScriber = currentRole === 'scriber';
  const hasActiveMeeting = !!meetingId;
  const handleSave = async () => {
    // Block save in preview mode
    if (isPreviewMode) {
      toast({
        title: "Preview Mode",
        description: "Voting settings can only be changed during active meetings.",
      });
      return;
    }
    
    if (voteLimit < 3 || voteLimit > 100) {
      toast({
        title: "Invalid vote limit",
        description: "Vote limit must be between 3 and 100.",
        variant: "destructive"
      });
      return;
    }
    setSaving(true);
    try {
      let success = false;
      if (isScriber && hasActiveMeeting && meetingId) {
        // Scriber setting team-wide vote limit for current meeting
        const result = await VotingService.updateMeetingVoteLimit(meetingId, voteLimit);
        success = result.success;
        if (success) {
          toast({
            title: "Team vote limit updated",
            description: `Vote limit set to ${voteLimit} votes for all team members in this meeting.`
          });
        } else {
          toast({
            title: "Failed to update meeting vote limit",
            description: result.error || "An error occurred while updating the vote limit.",
            variant: "destructive"
          });
        }
      } else {
        // Regular user setting personal vote limit
        success = await updateVoteLimit(voteLimit);
        if (success) {
          toast({
            title: "Personal vote limit updated",
            description: `Your vote limit set to ${voteLimit} votes per meeting.`
          });
        }
      }
      if (success) {
        // Refresh the vote limit in the voting context to reflect the change immediately
        if (refreshVoteLimit) {
          await refreshVoteLimit();
        }
        onOpenChange(false);
      }
    } catch (error) {
      logger.error('Error updating vote limit:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while updating the vote limit.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };
  if (loading) {
    return <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Vote className="h-5 w-5" />
              Voting Settings
            </DialogTitle>
          </DialogHeader>
          <div className="animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </DialogContent>
      </Dialog>;
  }
  const modalTitle = isScriber && hasActiveMeeting ? "Team Voting Settings" : "Personal Voting Settings";
  const modalDescription = isScriber && hasActiveMeeting ? "Set the vote limit for all team members in this meeting." : "Configure your personal vote limit for meetings.";
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Vote className="h-5 w-5" />
            {modalTitle}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vote-limit">Votes per user per meeting</Label>
            <Input 
              id="vote-limit" 
              type="number" 
              inputMode="numeric"
              pattern="[0-9]*"
              min={3} 
              max={100} 
              value={voteLimit} 
              onChange={e => setVoteLimit(parseInt(e.target.value) || 25)} 
              className="w-32" 
              autoComplete="off"
              disabled={isPreviewMode} 
            />
            <p className="text-sm text-muted-foreground">
              {isPreviewMode 
                ? "Preview mode - settings available during active meetings" 
                : `Between 3 and 100 votes. Current: ${effectiveVoteLimit}`}
            </p>
          </div>

          

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || voteLimit === effectiveVoteLimit || isPreviewMode} className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              {isPreviewMode ? 'Preview Only' : saving ? 'Saving...' : isScriber && hasActiveMeeting ? 'Set Team Limit' : 'Save Settings'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>;
};