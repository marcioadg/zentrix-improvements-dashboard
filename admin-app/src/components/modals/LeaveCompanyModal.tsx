import React, { useState } from 'react';
import { BaseModal } from './BaseModal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';

interface LeaveCompanyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyName: string;
  onConfirm: () => Promise<void>;
  loading: boolean;
}

export const LeaveCompanyModal: React.FC<LeaveCompanyModalProps> = ({
  open,
  onOpenChange,
  companyName,
  onConfirm,
  loading,
}) => {
  const [confirmText, setConfirmText] = useState('');

  const isConfirmMatch = confirmText.trim() === companyName.trim();

  const handleSubmit = async () => {
    if (isConfirmMatch) {
      await onConfirm();
      setConfirmText('');
    }
  };

  const handleCancel = () => {
    setConfirmText('');
    onOpenChange(false);
  };

  return (
    <BaseModal
      open={open}
      onOpenChange={onOpenChange}
      title={`Leave ${companyName}?`}
      description="This action cannot be undone"
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      submitText="Leave Company"
      submitDisabled={!isConfirmMatch || loading}
      loading={loading}
      size="md"
    >
      <div className="space-y-4">
        {/* Warning Message */}
        <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-md">
          <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
          <div className="space-y-2 text-sm">
            <p className="font-semibold text-destructive">Warning: You will lose access to:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>All teams in this company</li>
              <li>All tasks, issues, and metrics</li>
              <li>All company strategic plans</li>
              <li>All meeting history and data</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              Your data will remain with the company but you will no longer have access to it.
            </p>
          </div>
        </div>

        {/* Confirmation Input */}
        <div className="space-y-2">
          <Label htmlFor="confirm-company-name">
            Type <span className="font-semibold">{companyName}</span> to confirm
          </Label>
          <Input
            id="confirm-company-name"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={companyName}
            className="font-mono"
            autoComplete="off"
          />
        </div>

        {/* Additional Info */}
        <p className="text-xs text-muted-foreground">
          After leaving, you can only rejoin if invited by a company director or owner.
        </p>
      </div>
    </BaseModal>
  );
};
