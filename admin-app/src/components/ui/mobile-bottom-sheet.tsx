import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThumbButton } from './thumb-button';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  snapPoints?: number[]; // Percentage heights [50, 90]
  defaultSnap?: number;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  snapPoints = [90],
  defaultSnap = 0,
}) => {
  const height = snapPoints[defaultSnap];

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 animate-in fade-in-0"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50',
          'bg-background rounded-t-3xl',
          'shadow-2xl',
          'animate-in slide-in-from-bottom-0',
          'safe-area-bottom'
        )}
        style={{ height: `${height}vh` }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-muted-foreground/30 rounded-full" />
        </div>

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 py-3 border-b border-border">
            <h3 className="text-lg font-semibold">{title}</h3>
            <ThumbButton
              variant="ghost"
              thumbSize="sm"
              onClick={onClose}
              className="rounded-full"
            >
              <X className="h-5 w-5" />
            </ThumbButton>
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto px-6 py-4" style={{ height: title ? 'calc(100% - 100px)' : 'calc(100% - 40px)' }}>
          {children}
        </div>
      </div>
    </>
  );
};

// Bottom Sheet Option Item
interface BottomSheetOptionProps {
  icon?: React.ReactNode;
  label: string;
  description?: string;
  onClick: () => void;
  variant?: 'default' | 'destructive';
  selected?: boolean;
}

export const BottomSheetOption: React.FC<BottomSheetOptionProps> = ({
  icon,
  label,
  description,
  onClick,
  variant = 'default',
  selected = false,
}) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-4 p-4 rounded-xl',
        'transition-colors duration-200',
        'touch-target',
        selected ? 'bg-primary/10 border-2 border-primary' : 'hover:bg-muted/50',
        variant === 'destructive' && 'text-destructive'
      )}
    >
      {icon && <div className="flex-shrink-0">{icon}</div>}
      <div className="flex-1 text-left">
        <div className="font-medium">{label}</div>
        {description && (
          <div className="text-sm text-muted-foreground">{description}</div>
        )}
      </div>
      {selected && (
        <div className="flex-shrink-0 w-2 h-2 rounded-full bg-primary" />
      )}
    </button>
  );
};
