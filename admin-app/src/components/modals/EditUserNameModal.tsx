
import React, { useState, useEffect } from 'react';
import { BaseModal } from './BaseModal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface EditUserNameModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentName: string;
  onSave: (newName: string) => Promise<boolean>;
}

export const EditUserNameModal: React.FC<EditUserNameModalProps> = ({
  open,
  onOpenChange,
  currentName,
  onSave,
}) => {
  const [name, setName] = useState(currentName);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(currentName);
  }, [currentName, open]);

  const handleSave = async () => {
    if (!name.trim()) return;
    
    setSaving(true);
    const success = await onSave(name.trim());
    setSaving(false);
    
    if (success) {
      onOpenChange(false);
    }
  };

  return (
    <BaseModal
      open={open}
      onOpenChange={onOpenChange}
      title="Edit User Name"
      description="Update the user's display name"
      onSubmit={handleSave}
      submitText="Save"
      submitDisabled={!name.trim() || name.trim() === currentName}
      loading={saving}
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Full Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter full name"
            disabled={saving}
          />
        </div>
      </div>
    </BaseModal>
  );
};
