import React, { useState } from 'react';
import { ChevronDown, Check, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface TeamOption {
  value: string;
  label: string;
  count?: number;
}

interface MobileTeamDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: TeamOption[];
  className?: string;
  showIcon?: boolean;
}

/**
 * Premium mobile team dropdown - matches /m/tasks style
 * - Dropdown menu with check icons
 * - Shows counts per option
 * - Solid background, high z-index
 */
export const MobileTeamDropdown: React.FC<MobileTeamDropdownProps> = ({
  value,
  onChange,
  options,
  className,
  showIcon = true,
}) => {
  const [open, setOpen] = useState(false);
  
  const selectedOption = options.find(opt => opt.value === value);
  const displayText = selectedOption?.label || 'Select...';
  const displayCount = selectedOption?.count;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "gap-1.5 min-w-[130px] justify-between h-11",
            className
          )}
        >
          <div className="flex items-center gap-1.5">
            {showIcon && <Users className="h-4 w-4" />}
            <span className="truncate max-w-[100px]">{displayText}</span>
            {displayCount !== undefined && (
              <span className="text-xs opacity-70">({displayCount})</span>
            )}
          </div>
          <ChevronDown className={cn(
            "h-3.5 w-3.5 opacity-50 transition-transform duration-200",
            open && "rotate-180"
          )} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="start" 
        className="bg-background border shadow-lg z-50 min-w-[200px] max-h-[340px] overflow-y-auto p-1"
      >
        {options.map((option) => {
          const isSelected = value === option.value;
          
          return (
            <DropdownMenuItem
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={cn(
                "cursor-pointer rounded-md px-3 py-2.5 transition-colors",
                "hover:bg-accent focus:bg-accent",
                isSelected && "bg-accent/50"
              )}
            >
              <div className="flex items-center justify-between w-full gap-3">
                <div className="flex items-center gap-2">
                  {isSelected && <Check className="h-4 w-4 text-primary" />}
                  <span className={cn(
                    "truncate max-w-[120px]",
                    isSelected && "text-primary font-medium"
                  )}>
                    {option.label}
                  </span>
                </div>
                {option.count !== undefined && (
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full bg-muted flex-shrink-0",
                    isSelected && "bg-primary/10 text-primary font-medium"
                  )}>
                    {option.count}
                  </span>
                )}
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
