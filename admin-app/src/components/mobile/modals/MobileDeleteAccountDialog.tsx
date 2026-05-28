/**
 * MobileDeleteAccountDialog
 * 
 * Mobile-specific version of the delete account dialog.
 * This component is ONLY used on mobile /m pages and should NOT be imported by desktop components.
 * 
 * Uses MobileBaseModal for consistent mobile UX including keyboard handling.
 */
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { MobileBaseModal, useMobileModalInputFocus } from './MobileBaseModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { deleteUserAccount } from '@/services/userAccountDeletionService';
import { logger } from '@/utils/logger';

interface MobileDeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail: string;
}

export const MobileDeleteAccountDialog: React.FC<MobileDeleteAccountDialogProps> = ({
  open,
  onOpenChange,
  userEmail,
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const handleInputFocus = useMobileModalInputFocus();

  const handleConfirm = async () => {
    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }

    setError('');
    setIsProcessing(true);

    try {
      // Verify password by attempting to sign in
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
      navigate('/', { replace: true });

      // Then perform the deletion in the background
      try {
        const result = await deleteUserAccount();
        
        if (!result.success) {
          logger.error('Account deletion failed:', result.error);
        }
      } catch (deleteError) {
        logger.error('Account deletion error:', deleteError);
      }
      
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
    <MobileBaseModal
      open={open}
      onOpenChange={handleClose}
      title="Delete Account"
      hideActions={true}
    >
      <div className="space-y-4">
        {/* Warning Section */}
        <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
          <div className="space-y-2 text-sm">
            <p className="font-semibold text-destructive">This action cannot be undone</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Permanently delete your profile and personal data</li>
              <li>Remove you from all teams and companies</li>
              <li>Anonymize your name from content you created</li>
              <li>Delete your personal tasks and preferences</li>
            </ul>
            <p className="mt-2 font-medium text-foreground">
              Company data (goals, metrics, meetings) will be preserved.
            </p>
          </div>
        </div>

        {/* Password Input */}
        <div className="space-y-2">
          <Label htmlFor="mobile-delete-password">Enter your password to confirm</Label>
          <Input
            id="mobile-delete-password"
            type="password"
            placeholder="Your password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError('');
            }}
            onFocus={handleInputFocus}
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

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={isProcessing}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isProcessing || !password.trim()}
            className="flex-1"
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
        </div>
      </div>
    </MobileBaseModal>
  );
};
