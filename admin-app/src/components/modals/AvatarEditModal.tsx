import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Trash2 } from 'lucide-react';
import { UserAvatar } from '@/components/UserAvatar';
import { BaseModal } from '@/components/modals/BaseModal';
import { useProfile } from '@/hooks/useProfile';
import { useProfileOperations } from '@/hooks/useProfileOperations';

interface AvatarEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AvatarEditModal: React.FC<AvatarEditModalProps> = ({
  open,
  onOpenChange,
}) => {
  const { profile } = useProfile();
  const { uploadAvatar, removeAvatar, uploading } = useProfileOperations();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const hasAvatar = !!(profile?.avatar_url?.trim());

  return (
    <>
      <BaseModal
        open={open}
        onOpenChange={onOpenChange}
        title="Edit Profile Picture"
        description="Update or remove your profile picture"
        hideActions={true}
        size="sm"
      >
        <div className="space-y-6">
          {/* Current Avatar Display */}
          <div className="flex justify-center">
            <UserAvatar
              userId={profile?.id}
              fullName={profile?.full_name}
              email={profile?.email}
              avatarUrl={profile?.avatar_url}
              size="lg"
            />
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full"
              variant="default"
            >
              <Camera className="h-4 w-4 mr-2" />
              {uploading ? 'Uploading...' : hasAvatar ? 'Change Picture' : 'Upload Picture'}
            </Button>

            {hasAvatar && (
              <Button
                onClick={handleRemoveAvatar}
                variant="outline"
                disabled={uploading}
                className="w-full"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remove Picture
              </Button>
            )}

            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                JPG, PNG or GIF. Max size 3MB.
              </p>
            </div>
          </div>

          {/* Close Button */}
          <Button
            onClick={() => onOpenChange(false)}
            variant="ghost"
            className="w-full"
            disabled={uploading}
          >
            Done
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </BaseModal>
    </>
  );
};