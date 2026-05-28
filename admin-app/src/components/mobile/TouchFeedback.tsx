import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface TouchFeedbackProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'scale' | 'opacity' | 'both';
}

/**
 * TouchFeedback wrapper for instant tactile response
 * - Scale down on press
 * - Opacity change
 * - Loading state support
 */
export const TouchFeedback: React.FC<TouchFeedbackProps> = ({
  children,
  className,
  onClick,
  disabled = false,
  loading = false,
  variant = 'both',
}) => {
  const feedbackStyles = {
    scale: 'active:scale-[0.97]',
    opacity: 'active:opacity-80',
    both: 'active:scale-[0.97] active:opacity-90',
  };

  return (
    <div
      onClick={disabled || loading ? undefined : onClick}
      className={cn(
        "transition-all duration-100 ease-out",
        "touch-manipulation select-none",
        !disabled && !loading && [
          "cursor-pointer",
          feedbackStyles[variant],
        ],
        (disabled || loading) && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {loading ? (
        <div className="flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : (
        children
      )}
    </div>
  );
};
