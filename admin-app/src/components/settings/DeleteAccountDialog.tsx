import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { deleteUserAccount } from '@/services/userAccountDeletionService';
import { logger } from '@/utils/logger';

interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail: string;
}

export const DeleteAccountDialog: React.FC<DeleteAccountDialogProps> = ({
  open,
  onOpenChange,
  userEmail,
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleConfirm = async () => {
    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }

    setError('');
    setIsProcessing(true);

    try {
      // Verify password by attempting to sign in
      // Note: This is the same user, just re-authenticating to verify password
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: password,
      });

      if (authError) {
        setError('Incorrect password');
        setIsProcessing(false);
        return;
      }

      // Password verified - immediately navigate to prevent race conditions
      // with subscription checks triggered by auth state changes
      navigate('/', { replace: true });

      // Then perform the deletion in the background
      try {
        const result = await deleteUserAccount();
        
        if (!result.success) {
          // User is already navigated away, just log the error
          logger.error('Account deletion failed:', result.error);
        }
      } catch (deleteError) {
        logger.error('Account deletion error:', deleteError);
      }
      
      // Show success toast after navigation (user might see it briefly)
      toast({
        title: 'Account Deleted',
        description: 'Your account has been permanently deleted.',
      });
      
    } catch (err) {
      setError('An error occurred. Please try again.');
      setIsProcessing(false);
    }
  };

  const handleClose = (newOpen: boolean) => {
    if (!isProcessing) {
      setPassword('');
      setError('');
      onOpenChange(newOpen);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Account
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 pt-2">
              <p>This action cannot be undone. This will:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Permanently delete your profile and personal data</li>
                <li>Remove you from all teams and companies</li>
                <li>Anonymize your name from content you created</li>
                <li>Delete your personal tasks and preferences</li>
              </ul>
              <p className="mt-2 font-semibold text-foreground">
                Company data (goals, metrics, meetings) will be preserved.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="password">Enter your password to confirm</Label>
            <Input
              id="password"
              type="password"
              placeholder="Your password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              disabled={isProcessing}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isProcessing) {
                  handleConfirm();
                }
              }}
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isProcessing || !password.trim()}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete My Account'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
