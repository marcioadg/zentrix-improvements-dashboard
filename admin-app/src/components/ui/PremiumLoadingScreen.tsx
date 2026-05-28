import React from 'react';
import { cn } from '@/lib/utils';

interface PremiumLoadingScreenProps {
  message?: string;
  variant?: 'minimal' | 'detailed' | 'branded';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showProgress?: boolean;
}

export const PremiumLoadingScreen: React.FC<PremiumLoadingScreenProps> = ({
  message = "Loading...",
  variant = 'minimal',
  size = 'md',
  className,
  showProgress = false
}) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  };

  const containerClasses = cn(
    "flex flex-col items-center justify-center min-h-screen bg-background",
    "animate-fade-in",
    className
  );

  return (
    <div className={containerClasses}>
      {/* Premium Loading Spinner */}
      <div className="relative mb-8">
        <div
          className={cn("rounded-full flex items-center justify-center", sizeClasses[size])}
          style={{ background: "var(--btn-bg, hsl(var(--primary)))" }}
        >
          <div className="w-1/2 h-1/2 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      </div>

      {/* Content based on variant */}
      {variant === 'detailed' && (
        <div className="text-center space-y-4 max-w-sm">
          <h3 className="text-lg font-medium text-foreground">
            Getting things ready
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We're preparing your workspace with the latest updates
          </p>
        </div>
      )}

      {variant === 'branded' && (
        <div className="text-center space-y-6 max-w-md">
          <div className="space-y-2">
            <h2 className="text-2xl font-normal text-foreground tracking-wide">
              TaskFlow
            </h2>
            <div className="h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          </div>
          <p className="text-sm text-muted-foreground font-normal">
            Organizing your productivity
          </p>
        </div>
      )}

      {variant === 'minimal' && (
        <div className="text-center space-y-3">
          <p className="text-sm font-medium text-foreground">
            {message}
          </p>
          <div className="flex items-center justify-center space-x-1">
            <div className="h-1 w-1 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
            <div className="h-1 w-1 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
            <div className="h-1 w-1 bg-primary rounded-full animate-bounce" />
          </div>
        </div>
      )}

      {/* Progress indicator */}
      {showProgress && (
        <div className="mt-8 w-48">
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full animate-[loading-progress_2s_ease-in-out_infinite]" />
          </div>
        </div>
      )}

      {/* Accessibility */}
      <div className="sr-only" aria-live="polite" role="status">
        Loading content, please wait
      </div>
    </div>
  );
};

// Compact version for inline use
export const PremiumLoadingSpinner: React.FC<{
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ size = 'md', className }) => {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10'
  };

  return (
    <div
      className={cn("rounded-full flex items-center justify-center", sizeClasses[size], className)}
      style={{ background: "var(--btn-bg, hsl(var(--primary)))" }}
    >
      <div className="w-1/2 h-1/2 border-2 border-white border-t-transparent rounded-full animate-spin" />
    </div>
  );
};