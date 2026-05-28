import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
} from '@/components/ui/responsive-dialog';

interface ChangeEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentEmail: string;
}

export const ChangeEmailModal: React.FC<ChangeEmailModalProps> = ({
  open,
  onOpenChange,
  currentEmail,
}) => {
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'verify' | 'change' | 'done'>('verify');

  const resetState = () => {
    setCurrentPassword('');
    setNewEmail('');
    setShowPassword(false);
    setStep('verify');
    setLoading(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) resetState();
    onOpenChange(open);
  };

  const handleVerify = async () => {
    if (!currentPassword.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: currentEmail,
        password: currentPassword,
      });
      if (error) {
        toast({
          title: 'Incorrect password',
          description: 'The current password you entered is incorrect.',
          variant: 'destructive',
        });
      } else {
        setStep('change');
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Could not verify your password. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim());
  const emailChanged = newEmail.trim().toLowerCase() !== currentEmail.toLowerCase();

  const handleChangeEmail = async () => {
    if (!emailValid || !emailChanged) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
      if (error) {
        toast({
          title: 'Failed to update email',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        setStep('done');
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={handleOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-[420px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Change Email
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {step === 'verify'
              ? 'For security, please verify your current password first.'
              : step === 'change'
              ? 'Enter the new email address for your account.'
              : 'Check your inbox to confirm the change.'}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="space-y-4 pt-2">
          {step === 'verify' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="currentPassword" className="text-sm font-medium">
                  Current Password
                </Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter your current password"
                    className="pr-10 h-9"
                    onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" size="sm" onClick={() => handleOpenChange(false)} className="h-9">
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleVerify}
                  disabled={!currentPassword.trim() || loading}
                  className="h-9"
                >
                  {loading ? 'Verifying...' : 'Continue'}
                </Button>
              </div>
            </>
          )}

          {step === 'change' && (
            <>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Current Email</Label>
                <Input value={currentEmail} disabled className="h-9" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newEmail" className="text-sm font-medium">
                  New Email Address
                </Label>
                <Input
                  id="newEmail"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Enter your new email"
                  className="h-9"
                  onKeyDown={(e) => e.key === 'Enter' && handleChangeEmail()}
                  autoFocus
                />
                {newEmail.length > 0 && !emailValid && (
                  <p className="text-xs text-destructive">Please enter a valid email address.</p>
                )}
                {newEmail.length > 0 && emailValid && !emailChanged && (
                  <p className="text-xs text-destructive">New email must be different from your current email.</p>
                )}
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" size="sm" onClick={() => setStep('verify')} className="h-9">
                  Back
                </Button>
                <Button
                  size="sm"
                  onClick={handleChangeEmail}
                  disabled={!emailValid || !emailChanged || loading}
                  className="h-9"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  {loading ? 'Sending...' : 'Send Verification'}
                </Button>
              </div>
            </>
          )}

          {step === 'done' && (
            <>
              <div className="py-4 text-center space-y-2">
                <div className="flex justify-center">
                  <div className="rounded-full bg-primary/10 p-3">
                    <Mail className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <p className="text-sm font-medium">Verification email sent</p>
                <p className="text-xs text-muted-foreground">
                  We've sent a confirmation link to <span className="font-medium">{newEmail}</span>.
                  Click the link in that email to complete the change.
                </p>
                <p className="text-xs text-muted-foreground">
                  Your email will remain <span className="font-medium">{currentEmail}</span> until you confirm.
                </p>
              </div>
              <div className="flex justify-end pt-2">
                <Button size="sm" onClick={() => handleOpenChange(false)} className="h-9">
                  Done
                </Button>
              </div>
            </>
          )}
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};
