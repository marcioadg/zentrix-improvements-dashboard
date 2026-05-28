
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Key, AlertCircle, CheckCircle } from 'lucide-react';
import { type UnifiedUser } from '@/hooks/useUserManagement';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface PasswordUpdateSectionProps {
  user: UnifiedUser;
  canUpdatePassword: boolean;
  isOwnProfile: boolean;
  loading?: boolean;
}

export const PasswordUpdateSection: React.FC<PasswordUpdateSectionProps> = ({
  user,
  canUpdatePassword,
  isOwnProfile,
  loading = false
}) => {
  const { updatePassword } = useAuth();
  const { toast } = useToast();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState('');

  if (!canUpdatePassword) {
    return null;
  }

  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    return errors;
  };

  const handleAdminPasswordUpdate = async (targetUserId: string, newPassword: string) => {
    logger.log('🔐 PasswordUpdateSection: Admin password update for user:', targetUserId);
    
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.access_token) {
      throw new Error('No valid session found');
    }

    const { data, error } = await supabase.functions.invoke('os-admin-update-password', {
      body: {
        targetUserId,
        newPassword
      },
      headers: {
        Authorization: `Bearer ${session.session.access_token}`,
      }
    });

    if (error) {
      logger.error('❌ PasswordUpdateSection: Admin password update failed:', error);
      throw new Error(error.message || 'Failed to update password');
    }

    if (!data?.success) {
      logger.error('❌ PasswordUpdateSection: Admin password update unsuccessful:', data);
      throw new Error(data?.error || 'Failed to update password');
    }

    logger.log('✅ PasswordUpdateSection: Admin password update successful');
    return data;
  };

  const handlePasswordUpdate = async () => {
    setError('');
    setIsUpdating(true);

    try {
      // Validation
      if (isOwnProfile && !currentPassword.trim()) {
        throw new Error('Current password is required');
      }

      if (!newPassword.trim()) {
        throw new Error('New password is required');
      }

      if (newPassword !== confirmPassword) {
        throw new Error('New passwords do not match');
      }

      const passwordErrors = validatePassword(newPassword);
      if (passwordErrors.length > 0) {
        throw new Error(passwordErrors[0]);
      }

      logger.log('🔐 PasswordUpdateSection: Updating password for user:', {
        userName: user.full_name,
        userId: user.user_id,
        isOwnProfile,
        timestamp: new Date().toISOString()
      });

      if (isOwnProfile) {
        // Self password update using Auth context
        const { error: updateError } = await updatePassword(newPassword);
        
        if (updateError) {
          logger.error('❌ PasswordUpdateSection: Self password update failed:', updateError);
          throw new Error(updateError.message || 'Failed to update password');
        }

        logger.log('✅ PasswordUpdateSection: Self password updated successfully');
      } else {
        // Admin password update using edge function
        await handleAdminPasswordUpdate(user.user_id, newPassword);
      }
      
      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      toast({
        title: "Password Updated",
        description: isOwnProfile 
          ? "Your password has been updated successfully." 
          : `Password for ${user.full_name} has been updated successfully.`,
      });

    } catch (error) {
      logger.error('❌ PasswordUpdateSection: Error updating password:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update password';
      setError(errorMessage);
      
      toast({
        title: "Password Update Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const isFormValid = () => {
    if (isOwnProfile && !currentPassword.trim()) return false;
    if (!newPassword.trim() || !confirmPassword.trim()) return false;
    if (newPassword !== confirmPassword) return false;
    return validatePassword(newPassword).length === 0;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b">
        <Key className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-semibold">
          {isOwnProfile ? 'Update Your Password' : `Update ${user.full_name}'s Password`}
        </h3>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        {isOwnProfile && (
          <div className="space-y-2">
            <Label htmlFor="current-password">Current Password</Label>
            <div className="relative">
              <Input
                id="current-password"
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter your current password"
                disabled={isUpdating || loading}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                disabled={isUpdating || loading}
              >
                {showCurrentPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="new-password">New Password</Label>
          <div className="relative">
            <Input
              id="new-password"
              type={showNewPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              disabled={isUpdating || loading}
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowNewPassword(!showNewPassword)}
              disabled={isUpdating || loading}
            >
              {showNewPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm New Password</Label>
          <div className="relative">
            <Input
              id="confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              disabled={isUpdating || loading}
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              disabled={isUpdating || loading}
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {newPassword && (
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Password Requirements</Label>
            <div className="space-y-1">
              {[
                { rule: 'At least 8 characters', valid: newPassword.length >= 8 },
                { rule: 'One uppercase letter', valid: /[A-Z]/.test(newPassword) },
                { rule: 'One lowercase letter', valid: /[a-z]/.test(newPassword) },
                { rule: 'One number', valid: /[0-9]/.test(newPassword) },
              ].map(({ rule, valid }) => (
                <div key={rule} className="flex items-center gap-2 text-sm">
                  <CheckCircle className={`h-3 w-3 ${valid ? 'text-green-500' : 'text-muted-foreground'}`} />
                  <span className={valid ? 'text-success' : 'text-muted-foreground'}>
                    {rule}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Button
          onClick={handlePasswordUpdate}
          disabled={!isFormValid() || isUpdating || loading}
          className="w-full"
        >
          {isUpdating ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-b-transparent border-white" />
              Updating Password...
            </>
          ) : (
            "Update Password"
          )}
        </Button>
      </div>

      <div className="p-3 bg-muted/30 rounded-lg">
        <p className="text-xs text-muted-foreground">
          <strong>Security Notice:</strong> {isOwnProfile 
            ? 'After updating your password, you will need to sign in again on all devices.' 
            : `${user.full_name} will need to sign in again on all devices after this password update.`}
        </p>
      </div>
    </div>
  );
};
