
import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

export const EnhancedSkeleton: React.FC<SkeletonProps> = ({
  className,
  variant = 'rectangular',
  size = 'md',
  width,
  height,
  lines = 1,
  ...props
}) => {
  const baseClasses = "relative overflow-hidden bg-gradient-to-r from-muted via-muted/80 to-muted animate-shimmer bg-[length:200%_100%]";
  
  const sizeClasses = {
    sm: 'h-3',
    md: 'h-4',
    lg: 'h-5',
    xl: 'h-6'
  };

  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full aspect-square',
    rectangular: 'rounded-md',
    card: 'rounded-2xl'
  };

  const getStyles = () => {
    const styles: React.CSSProperties = {};
    if (width) styles.width = typeof width === 'number' ? `${width}px` : width;
    if (height) styles.height = typeof height === 'number' ? `${height}px` : height;
    return styles;
  };

  if (variant === 'text' && lines > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }, (_, i) => (
          <div
            key={i}
            className={cn(
              baseClasses,
              sizeClasses[size],
              variantClasses[variant],
              i === lines - 1 && "w-3/4", // Last line is shorter
              className
            )}
            style={getStyles()}
            {...props}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        baseClasses,
        !height && sizeClasses[size],
        variantClasses[variant],
        className
      )}
      style={getStyles()}
      {...props}
    />
  );
};

// Predefined skeleton components for common use cases
export const SkeletonText: React.FC<Omit<SkeletonProps, 'variant'>> = (props) => (
  <EnhancedSkeleton variant="text" {...props} />
);

export const SkeletonCircle: React.FC<Omit<SkeletonProps, 'variant'>> = (props) => (
  <EnhancedSkeleton variant="circular" {...props} />
);

export const SkeletonCard: React.FC<Omit<SkeletonProps, 'variant'>> = (props) => (
  <EnhancedSkeleton variant="card" {...props} />
);
