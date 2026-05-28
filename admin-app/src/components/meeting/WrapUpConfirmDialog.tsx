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

interface WrapUpConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  teamName?: string;
  loading?: boolean;
  sendRecapEmail: boolean;
  onSendRecapEmailChange: (checked: boolean) => void;
}

export const WrapUpConfirmDialog: React.FC<WrapUpConfirmDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  teamName,
  loading = false,
  sendRecapEmail,
  onSendRecapEmailChange
}) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Close Meeting</AlertDialogTitle>
          <AlertDialogDescription>
            {teamName ? (
              <>
                Are you sure you want to close the meeting for <strong>{teamName}</strong>?
              </>
            ) : (
              <>Are you sure you want to close this meeting?</>
            )}
            <span className="block mt-2 text-sm text-muted-foreground">
              This will save all ratings and finalize the meeting results.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        {/* Email checkbox */}
        <div className="flex items-center space-x-3 py-3 px-1 border-t border-border mt-2">
          <Checkbox 
            id="send-recap-email-wrapup" 
            checked={sendRecapEmail} 
            onCheckedChange={(checked) => onSendRecapEmailChange(checked === true)}
          />
          <Label 
            htmlFor="send-recap-email-wrapup" 
            className="flex items-center gap-2 text-sm font-medium cursor-pointer"
          >
            <Mail className="h-4 w-4 text-muted-foreground" />
            Send recap email to team members
          </Label>
        </div>
        
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Closing...' : 'Close Meeting'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
