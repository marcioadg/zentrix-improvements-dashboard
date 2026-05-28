import React from 'react';
import { BaseModal } from './BaseModal';
import { AlertTriangle, Loader2 } from 'lucide-react';
interface ConfirmDeleteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
  itemCount?: number;
  warningText?: string;
  isLoading?: boolean;
  actionText?: string;
}
export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  itemCount,
  warningText,
  isLoading = false,
  actionText
}) => {
  const handleConfirm = () => {
    if (isLoading) return;
    onConfirm();
  };
  return <BaseModal open={open} onOpenChange={onOpenChange} title={title} description={description} onSubmit={handleConfirm} onCancel={() => onOpenChange(false)} submitText={isLoading ? <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Deleting...
          </div> : actionText || (itemCount ? `Delete ${itemCount}` : 'Delete')} cancelText="Cancel" submitDisabled={isLoading} cancelDisabled={isLoading}>
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-destructive/5 border border-red-200 rounded-md">
          <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
          <div className="text-sm">
            
            {warningText && <p className="text-red-700 mt-1">{warningText}</p>}
          </div>
        </div>
        
        {itemCount && itemCount > 1 && <div className="text-sm text-muted-foreground">
            Deleting {itemCount} items and all data.
          </div>}
      </div>
    </BaseModal>;
};