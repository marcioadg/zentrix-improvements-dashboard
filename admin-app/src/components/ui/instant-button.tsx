import React, { ButtonHTMLAttributes, forwardRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Loader2, Check, X } from 'lucide-react';

export interface InstantButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  isLoading?: boolean;
  loadingText?: string;
  showFeedback?: boolean; // Show success/error feedback
  feedbackDuration?: number; // How long to show feedback (ms)
}

/**
 * Enhanced button with instant press feedback and optional loading/success states
 * Provides tactile feedback (<50ms) for better perceived performance
 */
export const InstantButton = forwardRef<HTMLButtonElement, InstantButtonProps>(
  (
    {
      children,
      className,
      variant = 'default',
      size = 'default',
      isLoading = false,
      loadingText,
      showFeedback = false,
      feedbackDuration = 1000,
      onClick,
      disabled,
      ...props
    },
    ref
  ) => {
    const [feedback, setFeedback] = useState<'success' | 'error' | null>(null);
    const [isPressed, setIsPressed] = useState(false);

    const handleMouseDown = () => {
      if (!disabled && !isLoading) {
        setIsPressed(true);
      }
    };

    const handleMouseUp = () => {
      setIsPressed(false);
    };

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!onClick || disabled || isLoading) return;

      try {
        const result = onClick(e);
        
        // Check if result is a promise-like object
        if (showFeedback && result !== undefined && result !== null) {
          const resultObj = result as any;
          if (typeof resultObj === 'object' && 'then' in resultObj && typeof resultObj.then === 'function') {
            resultObj
              .then(() => {
                setFeedback('success');
                setTimeout(() => setFeedback(null), feedbackDuration);
              })
              .catch(() => {
                setFeedback('error');
                setTimeout(() => setFeedback(null), feedbackDuration);
              });
          }
        }
      } catch (error) {
        if (showFeedback) {
          setFeedback('error');
          setTimeout(() => setFeedback(null), feedbackDuration);
        }
      }
    };

    const getFeedbackIcon = () => {
      if (isLoading) return <Loader2 className="h-4 w-4 animate-spin" />;
      if (feedback === 'success') return <Check className="h-4 w-4" />;
      if (feedback === 'error') return <X className="h-4 w-4" />;
      return null;
    };

    const getContent = () => {
      const icon = getFeedbackIcon();
      
      if (icon) {
        return (
          <span className="flex items-center gap-2">
            {icon}
            {isLoading && loadingText ? loadingText : children}
          </span>
        );
      }
      
      return children;
    };

    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        className={cn(
          // Base instant feedback
          'transition-all duration-100',
          'active:scale-[0.98]',
          
          // Pressed state (visual feedback)
          isPressed && !disabled && !isLoading && 'scale-[0.98] brightness-95',
          
          // Feedback states
          feedback === 'success' && 'bg-green-500 hover:bg-green-600 text-white',
          feedback === 'error' && 'bg-destructive hover:bg-destructive text-white',
          
          // Ensure smooth transitions
          'will-change-transform',
          
          className
        )}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        disabled={disabled || isLoading || feedback !== null}
        {...props}
      >
        {getContent()}
      </Button>
    );
  }
);

InstantButton.displayName = 'InstantButton';
