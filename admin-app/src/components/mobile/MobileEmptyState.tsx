import React, { useState } from 'react';
import { LucideIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MobileEmptyStateProps {
  icon: LucideIcon;
  iconClassName?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionLoading?: boolean;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  variant?: 'default' | 'success';
}

/**
 * Premium mobile empty state - Linear/Notion inspired
 * - Gradient icon background
 * - Ghost skeleton context behind
 * - Secondary action as text link
 */
export const MobileEmptyState: React.FC<MobileEmptyStateProps> = ({
  icon: Icon,
  iconClassName,
  title,
  description,
  actionLabel,
  onAction,
  actionLoading = false,
  secondaryActionLabel,
  onSecondaryAction,
  variant = 'default',
}) => {
  const [isButtonPressed, setIsButtonPressed] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      
      {/* Icon container with gradient */}
      <div
        className={cn(
          "relative w-20 h-20 rounded-[6px] flex items-center justify-center mb-5",
          "transition-transform duration-300",
          variant === 'success'
            ? "bg-gradient-to-br from-[var(--success)]/15 to-[var(--success)]/5"
            : "bg-gradient-to-br from-primary/15 to-primary/5"
        )}
      >
        <Icon className={cn(
          "h-10 w-10",
          variant === 'success' ? "text-[var(--success)]" : "text-primary/80",
          iconClassName
        )} />
      </div>
      
      <h3 className="text-lg font-bold text-foreground mb-1">
        {title}
      </h3>
      
      {description && (
        <p className="text-sm text-muted-foreground max-w-[240px] mb-5">
          {description}
        </p>
      )}
      
      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          disabled={actionLoading}
          onMouseDown={() => setIsButtonPressed(true)}
          onMouseUp={() => setIsButtonPressed(false)}
          onMouseLeave={() => setIsButtonPressed(false)}
          onTouchStart={() => setIsButtonPressed(true)}
          onTouchEnd={() => setIsButtonPressed(false)}
          size="lg"
          className={cn(
            "h-12 px-6 rounded-[6px] font-semibold",
            "bg-gradient-to-r from-primary to-primary/90",
            "shadow-md shadow-primary/20",
            "transition-all duration-100",
            isButtonPressed && "scale-[0.96] shadow-sm"
          )}
        >
          {actionLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Loading...
            </>
          ) : (
            actionLabel
          )}
        </Button>
      )}
      
      {secondaryActionLabel && onSecondaryAction && (
        <button
          onClick={onSecondaryAction}
          className="mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
        >
          {secondaryActionLabel}
        </button>
      )}
    </div>
  );
};
