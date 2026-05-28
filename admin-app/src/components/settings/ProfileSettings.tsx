import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Camera, Trash2, Lock, Mail } from 'lucide-react';
import { UserAvatar } from '@/components/UserAvatar';
import { useProfile } from '@/hooks/useProfile';
import { useProfileOperations } from '@/hooks/useProfileOperations';
import { ChangePasswordModal } from '@/components/modals/ChangePasswordModal';
import { ChangeEmailModal } from '@/components/modals/ChangeEmailModal';

export const ProfileSettings: React.FC = () => {
  const { profile, loading } = useProfile();
  const { uploadAvatar, removeAvatar, updateProfile, uploading } = useProfileOperations();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (profile?.full_name) {
      setFullName(profile.full_name);
    }
  }, [profile?.full_name]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    await uploadAvatar(file);
    // Clear the input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    await removeAvatar();
  };

  const handleUpdateName = async () => {
    if (fullName.trim() !== profile?.full_name) {
      await updateProfile({ full_name: fullName.trim() });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-[16px] font-semibold">Profile</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This is how others will see you on the platform.
          </p>
        </div>
        <div className="animate-pulse space-y-6">
          <div className="h-20 bg-muted rounded-lg"></div>
          <div className="h-10 bg-muted rounded-lg w-1/2"></div>
        </div>
      </div>
    );
  }

  const hasAvatar = !!(profile?.avatar_url?.trim());

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div>
        <h2 className="text-[16px] font-semibold">Profile</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This is how others will see you on the platform.
        </p>
      </div>

      <Separator />

      {/* Avatar Section */}
      <div className="space-y-4">
        <Label className="text-sm font-medium">Photo</Label>
        <div className="flex items-center gap-6">
          <UserAvatar
            userId={profile?.id}
            fullName={profile?.full_name}
            email={profile?.email}
            avatarUrl={profile?.avatar_url}
            size="lg"
          />
          <div className="space-y-3">
            <div className="flex gap-3">
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                size="sm"
                variant="outline"
                className="h-9"
              >
                <Camera className="h-4 w-4 mr-2" />
                {uploading ? 'Uploading...' : hasAvatar ? 'Change' : 'Upload'}
              </Button>
              {hasAvatar && (
                <Button
                  onClick={handleRemoveAvatar}
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  className="h-9"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              JPG, PNG or GIF. Max size 3MB.
            </p>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Name Section */}
      <div className="space-y-3">
        <Label htmlFor="fullName" className="text-sm font-medium">Full Name</Label>
        <div className="flex gap-3 max-w-md">
          <Input
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Enter your full name"
            className="h-9"
          />
          <Button 
            onClick={handleUpdateName}
            disabled={fullName.trim() === profile?.full_name || !fullName.trim()}
            size="sm"
            className="h-9 shrink-0"
          >
            Update
          </Button>
        </div>
      </div>

      {/* Email Section */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Email</Label>
        <div className="max-w-md">
          <Input value={profile?.email || ''} disabled className="h-9 mb-3" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEmailModalOpen(true)}
            className="h-9"
          >
            <Mail className="h-4 w-4 mr-2" />
            Change Email
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            A verification link will be sent to your new email address.
          </p>
        </div>
      </div>

      {/* Password Section */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Password</Label>
        <div className="max-w-md">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPasswordModalOpen(true)}
            className="h-9"
          >
            <Lock className="h-4 w-4 mr-2" />
            Change Password
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            Update your password to keep your account secure.
          </p>
        </div>
      </div>

      <ChangePasswordModal
        open={isPasswordModalOpen}
        onOpenChange={setIsPasswordModalOpen}
        userEmail={profile?.email || ''}
      />

      <ChangeEmailModal
        open={isEmailModalOpen}
        onOpenChange={setIsEmailModalOpen}
        currentEmail={profile?.email || ''}
      />
    </div>
  );
};