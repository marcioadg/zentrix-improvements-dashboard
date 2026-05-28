import React, { HTMLAttributes, forwardRef, useState } from 'react';
import { cn } from '@/lib/utils';

export interface InstantListItemProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean; // Enable hover/press effects
  selectable?: boolean; // Enable selection state
  selected?: boolean;
  success?: boolean; // Show success pulse
  error?: boolean; // Show error shake
  onSelect?: () => void;
}

/**
 * Enhanced list item with instant hover/press feedback
 * Provides rich micro-interactions for list items (goals, tasks, metrics, issues)
 */
export const InstantListItem = forwardRef<HTMLDivElement, InstantListItemProps>(
  (
    {
      children,
      className,
      interactive = true,
      selectable = false,
      selected = false,
      success = false,
      error = false,
      onSelect,
      onClick,
      ...props
    },
    ref
  ) => {
    const [isPressed, setIsPressed] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    const handleMouseDown = () => {
      if (interactive) {
        setIsPressed(true);
      }
    };

    const handleMouseUp = () => {
      setIsPressed(false);
    };

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (onSelect && selectable) {
        onSelect();
      }
      if (onClick) {
        onClick(e);
      }
    };

    return (
      <div
        ref={ref}
        className={cn(
          // Base styles
          'transition-all duration-200',
          'rounded-lg border bg-card',
          
          // Interactive states
          interactive && [
            'cursor-pointer',
            // Hover: Subtle lift + shadow
            'hover:-translate-y-0.5 hover:shadow-md',
            isHovered && 'shadow-md -translate-y-0.5',
          ],
          
          // Press state: Scale down
          isPressed && interactive && 'scale-[0.98] shadow-sm',
          
          // Selection state
          selectable && [
            'border-2',
            selected 
              ? 'border-primary bg-primary/5 shadow-md' 
              : 'border-border',
          ],
          
          // Success feedback: Green pulse
          success && 'animate-success-pulse ring-2 ring-green-500/50',
          
          // Error feedback: Red shake
          error && 'animate-error-shake ring-2 ring-destructive/50',
          
          // Ensure smooth GPU acceleration
          'will-change-transform',
          
          className
        )}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          setIsPressed(false);
        }}
        {...props}
      >
        {children}
      </div>
    );
  }
);

InstantListItem.displayName = 'InstantListItem';
