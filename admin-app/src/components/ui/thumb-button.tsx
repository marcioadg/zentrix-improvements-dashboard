import React from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ThumbSize = 'sm' | 'md' | 'lg' | 'xl';

interface ThumbButtonProps extends Omit<ButtonProps, 'size'> {
  thumbSize?: ThumbSize;
  touchFeedback?: boolean;
}

const thumbSizeClasses: Record<ThumbSize, string> = {
  sm: 'min-h-[44px] min-w-[44px] text-sm px-4',
  md: 'min-h-[48px] min-w-[48px] text-base px-5',
  lg: 'min-h-[56px] min-w-[56px] text-base px-6',
  xl: 'min-h-[64px] min-w-[64px] text-lg px-8',
};

export const ThumbButton = React.forwardRef<HTMLButtonElement, ThumbButtonProps>(
  ({ className, thumbSize = 'md', touchFeedback = true, children, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        className={cn(
          thumbSizeClasses[thumbSize],
          'rounded-xl font-medium',
          touchFeedback && 'active:scale-95 transition-transform duration-100',
          className
        )}
        {...props}
      >
        {children}
      </Button>
    );
  }
);

ThumbButton.displayName = 'ThumbButton';

// FAB (Floating Action Button) - specifically designed for bottom-right positioning
interface FABProps extends Omit<ButtonProps, 'size'> {
  position?: 'bottom-right' | 'bottom-center' | 'bottom-left';
  offset?: 'sm' | 'md' | 'lg';
}

export const FAB = React.forwardRef<HTMLButtonElement, FABProps>(
  ({ className, position = 'bottom-right', offset = 'md', children, ...props }, ref) => {
    const positionClasses = {
      'bottom-right': 'right-4',
      'bottom-center': 'left-1/2 -translate-x-1/2',
      'bottom-left': 'left-4',
    };

    const offsetClasses = {
      sm: '16px',
      md: '20px',
      lg: '24px',
    };

    return (
      <Button
        ref={ref}
        size="lg"
        className={cn(
          'fixed z-40 shadow-2xl',
          'min-h-[56px] min-w-[56px] rounded-full',
          'active:scale-90 transition-all duration-200',
          'hover:shadow-2xl hover:scale-105',
          positionClasses[position],
          className
        )}
        style={{
          bottom: `calc(${offsetClasses[offset]} + env(safe-area-inset-bottom) + 72px)`, // Account for bottom nav
        }}
        {...props}
      >
        {children}
      </Button>
    );
  }
);

FAB.displayName = 'FAB';
