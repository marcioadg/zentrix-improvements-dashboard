import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Key, Smartphone, Clock, AlertTriangle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { DeleteAccountDialog } from '@/components/settings/DeleteAccountDialog';

const SecuritySettings: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Delete account state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleChangePassword = async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      toast({
        title: 'Error',
        description: newPassword !== confirmPassword
          ? 'Passwords do not match.'
          : 'Please enter a new password.',
        variant: 'destructive',
      });
      return;
    }
    if (newPassword.length < 8) {
      toast({
        title: 'Error',
        description: 'Password must be at least 8 characters.',
        variant: 'destructive',
      });
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Password updated', description: 'Your password has been changed successfully.' });
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch {
      toast({ title: 'Error', description: 'An unexpected error occurred.', variant: 'destructive' });
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h2 className="text-[16px] font-semibold">Security & Privacy</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your account security settings and privacy preferences
        </p>
      </div>

      {/* Change Password */}
      <div>
        <h3 className="text-[13px] font-semibold mb-4 flex items-center gap-2">
          <Key className="h-4 w-4 text-primary" />
          Change Password
        </h3>
        <div className="space-y-4">
          <div className="space-y-2 max-w-sm">
            <Label htmlFor="new-password">New Password</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2 max-w-sm">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Password Requirements</Label>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Minimum 8 characters</li>
              <li>At least one uppercase letter</li>
              <li>At least one number</li>
              <li>At least one special character</li>
            </ul>
          </div>
          <Button
            onClick={handleChangePassword}
            disabled={changingPassword || !newPassword || !confirmPassword}
          >
            {changingPassword && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Update Password
          </Button>
        </div>
      </div>

      <Separator className="my-6" />

      {/* Two-Factor Authentication */}
      <div>
        <h3 className="text-[13px] font-semibold mb-4 flex items-center gap-2">
          <Smartphone className="h-4 w-4 text-primary" />
          Two-Factor Authentication
        </h3>
        <div className="flex items-center justify-between py-3 border-b border-border/40">
          <div className="space-y-0.5">
            <Label>Enable 2FA</Label>
            <p className="text-sm text-muted-foreground">
              Require a verification code when signing in
            </p>
          </div>
          <Switch disabled />
        </div>
        <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md mt-3">
          Two-factor authentication is coming soon. You'll be able to use an authenticator app for added security.
        </p>
      </div>

      <Separator className="my-6" />

      {/* Session Management */}
      <div>
        <h3 className="text-[13px] font-semibold mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          Session Management
        </h3>
        <div className="flex items-center justify-between py-3">
          <div className="space-y-0.5">
            <Label>Current Session</Label>
            <p className="text-sm text-muted-foreground">
              You're currently signed in on this device
            </p>
          </div>
          <span className="text-sm text-success bg-success/5 dark:bg-green-900/20 dark:text-green-400 px-2 py-1 rounded">
            Active
          </span>
        </div>
      </div>

      <Separator className="my-6" />

      {/* Danger Zone */}
      <div>
        <h3 className="text-[13px] font-semibold mb-4 flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-4 w-4" />
          Danger Zone
        </h3>
        <div className="flex items-center justify-between py-3">
          <div className="space-y-0.5">
            <Label>Delete Account</Label>
            <p className="text-sm text-muted-foreground">
              Permanently delete your account and anonymize your organizational data
            </p>
          </div>
          <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
            Delete Account
          </Button>
        </div>
      </div>

      <DeleteAccountDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        userEmail={user?.email || ''}
      />
    </div>
  );
};

export default SecuritySettings;
