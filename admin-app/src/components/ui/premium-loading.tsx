import React from 'react';
import { cn } from '@/lib/utils';

interface PremiumLoadingProps {
  fullScreen?: boolean;
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const PremiumLoading: React.FC<PremiumLoadingProps> = ({
  fullScreen = false,
  message,
  size = 'md'
}) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4',
        fullScreen && 'min-h-screen bg-background',
        !fullScreen && 'py-12'
      )}
    >
      <div className="relative">
        {/* Outer ring */}
        <div
          className={cn(
            'animate-spin rounded-full border-2 border-border dark:border-gray-800',
            sizeClasses[size]
          )}
        />
        {/* Inner spinning gradient */}
        <div
          className={cn(
            'absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-primary border-r-primary',
            sizeClasses[size]
          )}
          style={{ animationDuration: '0.8s' }}
        />
        {/* Center dot */}
        <div
          className={cn(
            'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary animate-pulse',
            size === 'sm' && 'h-2 w-2',
            size === 'md' && 'h-3 w-3',
            size === 'lg' && 'h-4 w-4'
          )}
        />
      </div>
      {message && (
        <p className="text-sm text-muted-foreground animate-pulse">
          {message}
        </p>
      )}
    </div>
  );
};

interface PremiumLoadingOverlayProps {
  show: boolean;
  message?: string;
}

export const PremiumLoadingOverlay: React.FC<PremiumLoadingOverlayProps> = ({
  show,
  message
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
      <PremiumLoading message={message} size="lg" />
    </div>
  );
};
