import React from 'react';
import { HelpCircle } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

interface ContextualHelpProps {
  trigger?: React.ReactNode;
  title: string;
  content: React.ReactNode;
  className?: string;
}

export const ContextualHelp: React.FC<ContextualHelpProps> = ({
  trigger,
  title,
  content,
  className
}) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="h-auto p-1 rounded-full hover:bg-accent">
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className={className} align="start">
        <div className="space-y-2">
          <h4 className="font-semibold text-sm text-foreground">{title}</h4>
          <div className="text-sm text-muted-foreground">
            {content}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
