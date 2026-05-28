import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface MobileCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  interactive?: boolean;
  loading?: boolean;
  variant?: 'default' | 'elevated' | 'outlined';
  statusColor?: 'blue' | 'green' | 'orange' | 'red' | 'gray';
}

/**
 * Premium mobile card - Linear/Notion inspired
 * - Three-layer depth system
 * - More dramatic press feedback (0.96)
 * - Optional status indicator edge
 * - Shadow reduction on press
 */
export const MobileCard: React.FC<MobileCardProps> = ({
  children,
  className,
  onClick,
  interactive = false,
  loading = false,
  variant = 'default',
  statusColor,
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const isClickable = onClick || interactive;
  
  const variantStyles = {
    default: 'bg-card border border-border/40 shadow-sm',
    elevated: 'bg-card shadow-md border border-border/20',
    outlined: 'bg-transparent border border-border/60',
  };

  const statusColors = {
    blue: 'bg-[var(--active)]',
    green: 'bg-[var(--success)]',
    orange: 'bg-[var(--warning)]',
    red: 'bg-destructive',
    gray: 'bg-muted-foreground/30',
  };

  return (
    <div
      onClick={loading ? undefined : onClick}
      onTouchStart={() => isClickable && setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      onTouchCancel={() => setIsPressed(false)}
      onMouseDown={() => isClickable && setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      className={cn(
        "rounded-[6px] p-4 relative overflow-hidden",
        "transition-all duration-100 ease-out",
        variantStyles[variant],
        isClickable && [
          "cursor-pointer select-none touch-manipulation",
          "hover:border-border hover:shadow-sm",
        ],
        isPressed && isClickable && "scale-[0.96] opacity-90 shadow-none",
        loading && "opacity-60 pointer-events-none",
        className
      )}
    >
      {/* Status indicator edge */}
      {statusColor && (
        <div className={cn(
          "absolute left-0 top-3 bottom-3 w-1 rounded-r-full",
          statusColors[statusColor]
        )} />
      )}
      
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      )}
      
      {children}
    </div>
  );
};
