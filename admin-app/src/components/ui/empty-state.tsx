import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'secondary';
  };
  illustration?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  illustration,
  className,
}) => {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center py-16 px-4 animate-fade-in', className)}>
      {illustration ? (
        <div className="mb-6 animate-scale-in">{illustration}</div>
      ) : (
        <div className="mb-6 relative">
          <div className="absolute inset-0 bg-primary/5 rounded-full blur-2xl animate-pulse" />
          <div className="relative bg-primary/10 backdrop-blur-sm rounded-full p-6 ring-1 ring-primary/10 animate-scale-in">
            <Icon className="h-12 w-12 text-primary/60 animate-icon-bounce" strokeWidth={2} />
          </div>
        </div>
      )}
      
      <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6 leading-relaxed">
        {description}
      </p>
      
      {action && (
        <Button
          onClick={action.onClick}
          variant={action.variant || 'default'}
          className="hover:-translate-y-0.5 active:scale-[0.98]"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
};
