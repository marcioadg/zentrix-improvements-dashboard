import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { WrapUpConfirmDialog } from './WrapUpConfirmDialog';
import { useToast } from '@/hooks/use-toast';

interface WrapUpActionsProps {
  adjustedCompletionStatus: {
    completed: number;
    total: number;
    absent: number;
    isComplete: boolean;
  };
  onEndMeeting: (sendRecapEmail: boolean) => void;
  teamName?: string;
  loading?: boolean;
  canEndMeeting?: boolean; // NEW: Permission check
}

export const WrapUpActions: React.FC<WrapUpActionsProps> = ({
  adjustedCompletionStatus,
  onEndMeeting,
  teamName,
  loading = false,
  canEndMeeting = true // Default to true for backward compatibility
}) => {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [sendRecapEmail, setSendRecapEmail] = useState(true);
  const { toast } = useToast();

  const handleButtonClick = () => {
    if (!canEndMeeting) {
      toast({
        title: "Permission denied",
        description: "Only the scriber or company directors can close the meeting.",
        variant: "destructive",
      });
      return;
    }
    
    if (adjustedCompletionStatus.isComplete) {
      setShowConfirmDialog(true);
    }
  };

  const handleConfirm = () => {
    setShowConfirmDialog(false);
    onEndMeeting(sendRecapEmail);
  };

  return (
    <>
      <div className="text-center pt-4">
        <Button 
          onClick={handleButtonClick} 
          disabled={!adjustedCompletionStatus.isComplete || loading || !canEndMeeting} 
          className="w-full" 
          variant="default"
          size="lg"
          title={!canEndMeeting ? 'Only the scriber or company directors can close the meeting' : undefined}
        >
          {!canEndMeeting
            ? 'Only scriber or director can close'
            : loading 
              ? 'Closing...'
              : adjustedCompletionStatus.isComplete 
                ? 'Close Meeting' 
                : adjustedCompletionStatus.total === 0 
                  ? 'Rate All Present Members'
                  : `Rate ${adjustedCompletionStatus.total - adjustedCompletionStatus.completed} More`
          }
        </Button>
      </div>

      <WrapUpConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        onConfirm={handleConfirm}
        teamName={teamName}
        loading={loading}
        sendRecapEmail={sendRecapEmail}
        onSendRecapEmailChange={setSendRecapEmail}
      />
    </>
  );
};
