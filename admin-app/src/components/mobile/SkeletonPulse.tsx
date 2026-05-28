import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonPulseProps {
  className?: string;
  variant?: 'card' | 'text' | 'circle' | 'button';
  count?: number;
}

/**
 * SkeletonPulse for loading states
 * Smooth pulse animation with proper sizing
 */
export const SkeletonPulse: React.FC<SkeletonPulseProps> = ({
  className,
  variant = 'card',
  count = 1,
}) => {
  const variantStyles = {
    card: 'h-20 rounded-[6px]',
    text: 'h-4 rounded-md',
    circle: 'h-10 w-10 rounded-full',
    button: 'h-10 w-24 rounded-[6px]',
  };

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "bg-muted/60 animate-pulse",
            variantStyles[variant],
            className
          )}
        />
      ))}
    </>
  );
};
