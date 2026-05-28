import React, { InputHTMLAttributes, forwardRef, useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Check, Loader2, AlertCircle } from 'lucide-react';

export interface InstantInputProps extends InputHTMLAttributes<HTMLInputElement> {
  isSaving?: boolean;
  saveSuccess?: boolean;
  saveError?: string | null;
  showFeedback?: boolean;
  feedbackDuration?: number;
}

/**
 * Enhanced input with instant visual feedback for save states
 * Shows saving indicator, success checkmark, or error shake
 */
export const InstantInput = forwardRef<HTMLInputElement, InstantInputProps>(
  (
    {
      className,
      isSaving = false,
      saveSuccess = false,
      saveError = null,
      showFeedback = true,
      feedbackDuration = 2000,
      ...props
    },
    ref
  ) => {
    const [showSuccess, setShowSuccess] = useState(false);
    const [showError, setShowError] = useState(false);

    // Handle success feedback
    useEffect(() => {
      if (saveSuccess && showFeedback) {
        setShowSuccess(true);
        const timer = setTimeout(() => setShowSuccess(false), feedbackDuration);
        return () => clearTimeout(timer);
      }
    }, [saveSuccess, showFeedback, feedbackDuration]);

    // Handle error feedback
    useEffect(() => {
      if (saveError && showFeedback) {
        setShowError(true);
        const timer = setTimeout(() => setShowError(false), feedbackDuration);
        return () => clearTimeout(timer);
      }
    }, [saveError, showFeedback, feedbackDuration]);

    const getFeedbackIcon = () => {
      if (isSaving) {
        return (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        );
      }
      
      if (showSuccess) {
        return (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Check className="h-4 w-4 text-green-500 animate-in zoom-in duration-200" />
          </div>
        );
      }
      
      if (showError) {
        return (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <AlertCircle className="h-4 w-4 text-destructive animate-in zoom-in duration-200" />
          </div>
        );
      }
      
      return null;
    };

    return (
      <div className="relative">
        <Input
          ref={ref}
          className={cn(
            'transition-all duration-200',
            
            // Saving state - subtle pulse
            isSaving && 'ring-2 ring-primary/30 animate-pulse',
            
            // Success state - green glow
            showSuccess && 'ring-2 ring-green-500/50',
            
            // Error state - red shake
            showError && 'ring-2 ring-destructive/50 animate-shake',
            
            // Add padding for icon
            (isSaving || showSuccess || showError) && 'pr-10',
            
            className
          )}
          disabled={isSaving}
          {...props}
        />
        {showFeedback && getFeedbackIcon()}
      </div>
    );
  }
);

InstantInput.displayName = 'InstantInput';
