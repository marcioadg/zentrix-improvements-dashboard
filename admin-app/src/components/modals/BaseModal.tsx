import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ModalErrorBoundary } from '@/components/modals/ModalErrorBoundary';

interface BaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  onSubmit?: () => void;
  onCancel?: () => void;
  submitText?: string | React.ReactNode;
  cancelText?: string;
  submitDisabled?: boolean;
  cancelDisabled?: boolean;
  loading?: boolean;
  hideActions?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  headerContent?: React.ReactNode;
  onDisabledClick?: () => void;
  /** @deprecated Use mobile-specific modals for mobile keyboard handling */
  mobileKeyboardAware?: boolean;
}

export const BaseModal: React.FC<BaseModalProps> = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  onSubmit,
  onCancel,
  submitText = 'Save',
  cancelText = 'Cancel',
  submitDisabled = false,
  cancelDisabled = false,
  loading = false,
  hideActions = false,
  size = 'md',
  headerContent,
  onDisabledClick,
  // mobileKeyboardAware is deprecated - mobile modals handle this separately
}) => {

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      onOpenChange(false);
    }
  };

  const sizeClasses = {
    sm: 'sm:max-w-md',
    md: 'sm:max-w-lg',
    lg: 'sm:max-w-2xl',
    xl: 'sm:max-w-4xl',
  };

  const heightClasses = {
    sm: 'max-h-[60vh]',
    md: 'max-h-[70vh]',
    lg: 'max-h-[80vh]',
    xl: 'max-h-[85vh]',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`${sizeClasses[size]} ${heightClasses[size]} flex flex-col overflow-visible !bg-popover !text-popover-foreground border border-border`}
        aria-describedby="base-modal-description"
      >
        <DialogHeader className="flex-shrink-0">
          {headerContent ? (
            <div className="flex items-start gap-4 pb-2">
              {headerContent}
              <div className="flex-1 min-w-0 pt-1">
                <DialogTitle className="mb-1">{title}</DialogTitle>
                <DialogDescription id="base-modal-description" className="text-sm">
                  {description || `Configure settings for ${title.toLowerCase()}`}
                </DialogDescription>
              </div>
            </div>
          ) : (
            <>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription id="base-modal-description">
                {description || `Configure settings for ${title.toLowerCase()}`}
              </DialogDescription>
            </>
          )}
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-1 py-4">
          <ModalErrorBoundary>
            {children}
          </ModalErrorBoundary>
        </div>

        {!hideActions && (
          <DialogFooter className="flex-shrink-0">
            <Button variant="outline" onClick={handleCancel} disabled={loading || cancelDisabled}>
              {cancelText}
            </Button>
            {onSubmit && (
              <Button 
                onClick={() => {
                  if (submitDisabled && onDisabledClick) {
                    onDisabledClick();
                  } else if (!submitDisabled) {
                    onSubmit();
                  }
                }} 
                disabled={loading}
                className={`ml-2 ${submitDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {loading ? 'Saving...' : submitText}
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
