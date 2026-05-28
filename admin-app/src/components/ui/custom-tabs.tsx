import React, { createContext, useContext, useState, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CustomTabsContextType {
  value: string;
  onValueChange: (value: string) => void;
}

const CustomTabsContext = createContext<CustomTabsContextType | undefined>(undefined);

interface CustomTabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
  className?: string;
  defaultValue?: string;
}

export const CustomTabs: React.FC<CustomTabsProps> = ({
  value,
  onValueChange,
  children,
  className,
}) => {
  return (
    <CustomTabsContext.Provider value={{ value, onValueChange }}>
      <div className={cn('w-full', className)}>{children}</div>
    </CustomTabsContext.Provider>
  );
};

interface CustomTabsListProps {
  children: ReactNode;
  className?: string;
}

export const CustomTabsList: React.FC<CustomTabsListProps> = ({
  children,
  className,
}) => {
  return (
    <nav className={cn('flex items-center border-b border-border', className)}>
      <div className="flex space-x-8">{children}</div>
    </nav>
  );
};

interface CustomTabsTriggerProps {
  value: string;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}

export const CustomTabsTrigger: React.FC<CustomTabsTriggerProps> = ({
  value,
  children,
  className,
  disabled = false,
}) => {
  const context = useContext(CustomTabsContext);
  if (!context) {
    throw new Error('CustomTabsTrigger must be used within CustomTabs');
  }

  const { value: selectedValue, onValueChange } = context;
  const isActive = selectedValue === value;

  return (
    <button
      onClick={() => !disabled && onValueChange(value)}
      disabled={disabled}
      className={cn(
        'py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap',
        isActive
          ? 'border-primary text-primary'
          : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {children}
    </button>
  );
};

interface CustomTabsContentProps {
  value: string;
  children: ReactNode;
  className?: string;
}

export const CustomTabsContent: React.FC<CustomTabsContentProps> = ({
  value,
  children,
  className,
}) => {
  const context = useContext(CustomTabsContext);
  if (!context) {
    throw new Error('CustomTabsContent must be used within CustomTabs');
  }

  const { value: selectedValue } = context;

  if (selectedValue !== value) {
    return null;
  }

  return <div className={cn('mt-6', className)}>{children}</div>;
};
