import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface MobileStatCardProps {
  value: string | number;
  label: string;
  valueClassName?: string;
  className?: string;
  onClick?: () => void;
  size?: 'default' | 'large';
}

/**
 * Premium mobile stat card - Linear/Notion inspired
 * - Subtle depth with shadow
 * - Size variants for hierarchy
 * - Press feedback
 */
export const MobileStatCard: React.FC<MobileStatCardProps> = ({
  value,
  label,
  valueClassName,
  className,
  onClick,
  size = 'default',
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const isClickable = !!onClick;

  return (
    <div
      onClick={onClick}
      onTouchStart={() => isClickable && setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      onTouchCancel={() => setIsPressed(false)}
      onMouseDown={() => isClickable && setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      className={cn(
        "bg-card border border-border/30 rounded-xl text-center",
        "shadow-sm",
        "transition-all duration-100 ease-out",
        size === 'large' ? 'p-4' : 'p-3',
        isClickable && "cursor-pointer touch-manipulation select-none",
        isPressed && "scale-[0.96] opacity-90 shadow-none",
        className
      )}
    >
      <p
        className={cn(
          "font-bold tabular-nums leading-none mb-1",
          "transition-all duration-200",
          size === 'large' ? 'text-3xl' : 'text-2xl',
          valueClassName || "text-foreground"
        )}
      >
        {value}
      </p>
      <p className={cn(
        "font-medium text-muted-foreground uppercase tracking-wide",
        size === 'large' ? 'text-xs' : 'text-[10px]'
      )}>
        {label}
      </p>
    </div>
  );
};
