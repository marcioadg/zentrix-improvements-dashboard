import React from 'react';
import { cn } from '@/lib/utils';

interface MobileContainerProps {
  children: React.ReactNode;
  className?: string;
  withBottomNav?: boolean;
  withHeader?: boolean;
}

export const MobileContainer: React.FC<MobileContainerProps> = ({
  children,
  className,
  withBottomNav = true,
  withHeader = true,
}) => {
  return (
    <div 
      className={cn(
        "min-h-screen w-full bg-background smooth-scroll",
        className
      )}
      style={{
        // Extend background color into safe area (notch/Dynamic Island region)
        paddingTop: withHeader ? '0px' : 'env(safe-area-inset-top, 0px)',
        paddingBottom: withBottomNav ? 'calc(env(safe-area-inset-bottom) + 80px)' : 'calc(env(safe-area-inset-bottom) + 16px)',
        // Ensure content doesn't get cut off at top
        minHeight: '100dvh',
      }}
    >
      {children}
    </div>
  );
};

interface MobileContentProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const MobileContent: React.FC<MobileContentProps> = ({
  children,
  className,
  padding = 'md',
}) => {
  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  return (
    <div className={cn(paddingClasses[padding], className)}>
      {children}
    </div>
  );
};
