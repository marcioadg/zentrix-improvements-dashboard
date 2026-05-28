import React, { useRef, useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useVisualViewportHeight } from '@/hooks/useVisualViewport';

// Context to share focus handler with child components in mobile modals
export const MobileModalInputFocusContext = React.createContext<{
  handleInputFocus: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
} | null>(null);

// Hook for child components to access the mobile focus handler
export const useMobileModalInputFocus = () => {
  const context = React.useContext(MobileModalInputFocusContext);
  return context?.handleInputFocus;
};

// Context to provide a portal host inside the modal for Select dropdowns
export const MobileModalPortalHostContext = React.createContext<HTMLElement | null>(null);

// Hook for Select components to access the modal's portal host
export const useMobileModalPortalHost = () => {
  return React.useContext(MobileModalPortalHostContext);
};

interface MobileBaseModalProps {
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
}

export const MobileBaseModal: React.FC<MobileBaseModalProps> = ({
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
}) => {
  const { viewportHeight, keyboardVisible } = useVisualViewportHeight();
  const scrollableRef = useRef<HTMLDivElement>(null);
  const portalHostRef = useRef<HTMLDivElement>(null);
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);

  // Set portal host after mount so Select dropdowns render inside the dialog
  useEffect(() => {
    if (open && portalHostRef.current) {
      setPortalHost(portalHostRef.current);
    } else {
      setPortalHost(null);
    }
  }, [open]);

  // Mobile-specific focus handler - scrolls input into view within container only
  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    // Wait for keyboard to finish opening, then scroll within our container only
    setTimeout(() => {
      if (scrollableRef.current) {
        const input = e.target;
        const container = scrollableRef.current;
        const inputRect = input.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        // If input is not fully visible within the container, scroll it into view
        if (inputRect.top < containerRect.top || inputRect.bottom > containerRect.bottom) {
          // Use scrollTop manipulation instead of scrollIntoView to avoid affecting parent containers
          const scrollOffset = inputRect.top - containerRect.top - containerRect.height / 3;
          container.scrollTop += scrollOffset;
        }
      }
    }, 100);
  };

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

  // Calculate dynamic max height when mobile keyboard is visible
  const dynamicStyle = keyboardVisible && viewportHeight
    ? { maxHeight: `${viewportHeight - 20}px` }
    : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`${sizeClasses[size]} ${dynamicStyle ? '' : 'max-h-[85vh]'} flex flex-col !bg-popover !text-popover-foreground border border-border z-[101]`}
        style={dynamicStyle}
        aria-describedby="mobile-modal-description"
      >
        <DialogHeader className="flex-shrink-0">
          {headerContent ? (
            <div className="flex items-start gap-4 pb-2">
              {headerContent}
              <div className="flex-1 min-w-0 pt-1">
                <DialogTitle className="mb-1">{title}</DialogTitle>
                <DialogDescription id="mobile-modal-description" className="text-sm">
                  {description || `Configure settings for ${title.toLowerCase()}`}
                </DialogDescription>
              </div>
            </div>
          ) : (
            <>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription id="mobile-modal-description">
                {description || `Configure settings for ${title.toLowerCase()}`}
              </DialogDescription>
            </>
          )}
        </DialogHeader>

        {/* Portal host for Select dropdowns - must be outside scrollable area */}
        <div ref={portalHostRef} className="relative z-[200]" />

        {/* Scrollable Content - overscroll-contain prevents scroll chaining to parent */}
        <div 
          ref={scrollableRef}
          className="flex-1 overflow-y-auto overflow-x-hidden px-1 py-4 overscroll-contain"
        >
          <MobileModalPortalHostContext.Provider value={portalHost}>
            <MobileModalInputFocusContext.Provider value={{ handleInputFocus }}>
              {children}
            </MobileModalInputFocusContext.Provider>
          </MobileModalPortalHostContext.Provider>
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
