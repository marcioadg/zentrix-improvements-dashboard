
import React from 'react';
import { LoadingSpinner } from './loading-spinner';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  className?: string;
  fullScreen?: boolean;
  overlay?: boolean;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  size = 'md',
  message,
  className,
  fullScreen = false,
  overlay = false
}) => {
  const containerClasses = cn(
    'flex flex-col items-center justify-center',
    fullScreen && 'min-h-screen',
    overlay && 'absolute inset-0 bg-background/80 backdrop-blur-sm z-50',
    !fullScreen && !overlay && 'py-12',
    className
  );

  return (
    <div className={containerClasses}>
      <LoadingSpinner size={size} />
      {message && (
        <p className="mt-4 text-sm text-muted-foreground animate-pulse">
          {message}
        </p>
      )}
    </div>
  );
};

export const InlineLoadingState: React.FC<{ message?: string }> = ({ message }) => (
  <div className="flex items-center justify-center gap-2 py-4">
    <LoadingSpinner size="sm" />
    {message && <span className="text-sm text-muted-foreground">{message}</span>}
  </div>
);

export const ButtonLoadingState: React.FC<{ message?: string }> = ({ message = "Loading..." }) => (
  <div className="flex items-center gap-2">
    <LoadingSpinner size="sm" />
    <span>{message}</span>
  </div>
);
