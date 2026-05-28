import React, { useRef, useState, useEffect } from 'react';
import { Camera, Loader2, Trash2 } from 'lucide-react';
import { MobileBaseModal, useMobileModalInputFocus } from '@/components/mobile/modals/MobileBaseModal';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useProfileOperations } from '@/hooks/useProfileOperations';

interface MobileEditProfileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialFullName: string;
  email: string;
  avatarUrl?: string | null;
}

const getInitials = (name: string, email: string): string => {
  const source = (name?.trim() || email?.split('@')[0] || '').trim();
  if (!source) return '?';
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const MobileEditProfileSheet: React.FC<MobileEditProfileSheetProps> = ({
  open,
  onOpenChange,
  initialFullName,
  email,
  avatarUrl,
}) => {
  const { updateProfile, uploadAvatar, removeAvatar, uploading } = useProfileOperations();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleInputFocus = useMobileModalInputFocus();
  const [name, setName] = useState(initialFullName);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setName(initialFullName);
  }, [open, initialFullName]);

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await uploadAvatar(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === initialFullName.trim()) {
      onOpenChange(false);
      return;
    }
    setSaving(true);
    const ok = await updateProfile({ full_name: trimmed });
    setSaving(false);
    if (ok) onOpenChange(false);
  };

  const busy = saving || uploading;

  return (
    <MobileBaseModal
      open={open}
      onOpenChange={onOpenChange}
      title="Edit profile"
      description="Update your name and profile picture."
      onSubmit={handleSave}
      submitText={busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
      submitDisabled={busy || !name.trim()}
      loading={busy}
      cancelText="Cancel"
    >
      <div className="space-y-5 py-1">
        <div className="flex flex-col items-center gap-3">
          <Avatar className="h-20 w-20 border border-border/40">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={name || email} />}
            <AvatarFallback className="text-[18px] font-semibold bg-primary/10 text-primary">
              {getInitials(name, email)}
            </AvatarFallback>
          </Avatar>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-muted text-foreground text-[13px] font-medium active:bg-muted/70 disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Camera className="h-3.5 w-3.5" />
              )}
              {avatarUrl ? 'Change photo' : 'Add photo'}
            </button>
            {avatarUrl && (
              <button
                type="button"
                onClick={() => removeAvatar()}
                disabled={uploading}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-destructive text-[13px] font-medium active:bg-destructive/10 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="mobile-edit-name" className="text-[13px]">
            Full name
          </Label>
          <Input
            id="mobile-edit-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onFocus={handleInputFocus}
            placeholder="Your full name"
            autoComplete="name"
            maxLength={80}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-[13px]">Email</Label>
          <Input value={email} disabled readOnly />
          <p className="text-[11.5px] text-muted-foreground">
            Email can&apos;t be changed here.
          </p>
        </div>
      </div>
    </MobileBaseModal>
  );
};
