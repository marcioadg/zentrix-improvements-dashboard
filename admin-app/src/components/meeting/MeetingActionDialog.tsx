import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Mail } from 'lucide-react';

interface MeetingActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  actionType: 'delete' | 'finalize';
  meetingName: string;
  meetingDuration?: string;
  loading?: boolean;
  // Email checkbox props (only for finalize)
  sendRecapEmail?: boolean;
  onSendRecapEmailChange?: (checked: boolean) => void;
}

export const MeetingActionDialog = ({
  open,
  onOpenChange,
  onConfirm,
  actionType,
  meetingName,
  meetingDuration,
  loading = false,
  sendRecapEmail = true,
  onSendRecapEmailChange
}: MeetingActionDialogProps) => {
  const isDelete = actionType === 'delete';
  
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isDelete ? 'Delete Meeting' : 'Finalize Meeting'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isDelete ? (
              <>
                Are you sure you want to delete the meeting for <strong>{meetingName}</strong>?
                {meetingDuration && (
                  <span className="block mt-1 text-sm text-muted-foreground">
                    Duration: {meetingDuration}
                  </span>
                )}
                <span className="block mt-2 text-sm text-destructive">
                  This action cannot be undone.
                </span>
              </>
            ) : (
              <>
                Are you sure you want to finalize the meeting for <strong>{meetingName}</strong>?
                {meetingDuration && (
                  <span className="block mt-1 text-sm text-muted-foreground">
                    Current duration: {meetingDuration}
                  </span>
                )}
                <span className="block mt-2 text-sm text-warning">
                  This will end the meeting and save the results.
                </span>
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        {/* Email checkbox for finalize action */}
        {!isDelete && onSendRecapEmailChange && (
          <div className="flex items-center space-x-3 py-3 px-1 border-t border-border mt-2">
            <Checkbox 
              id="send-recap-email" 
              checked={sendRecapEmail} 
              onCheckedChange={(checked) => onSendRecapEmailChange(checked === true)}
            />
            <Label 
              htmlFor="send-recap-email" 
              className="flex items-center gap-2 text-sm font-medium cursor-pointer"
            >
              <Mail className="h-4 w-4 text-muted-foreground" />
              Send recap email to team members
            </Label>
          </div>
        )}
        
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={loading}
            className={isDelete ? 'bg-destructive hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'}
          >
            {loading ? 'Processing...' : (isDelete ? 'Delete' : 'Finalize')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};