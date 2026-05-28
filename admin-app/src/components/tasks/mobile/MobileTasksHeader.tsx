import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Search, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MobileTasksHeaderProps {
  selectedTeamNames: string;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onTeamSelectorOpen: () => void;
}

export const MobileTasksHeader: React.FC<MobileTasksHeaderProps> = ({
  selectedTeamNames,
  searchQuery,
  onSearchChange,
  onTeamSelectorOpen,
}) => {
  const [isTeamButtonPressed, setIsTeamButtonPressed] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  return (
    <header className="bg-background/95 backdrop-blur-md border-b border-border/40 px-4 pt-3 pb-3">
      {/* Title Row */}
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-[20px] font-bold tracking-tight text-foreground">Tasks</h1>
        
        {/* Team selector with press feedback */}
        <Button
          variant="outline"
          size="sm"
          onClick={onTeamSelectorOpen}
          onTouchStart={() => setIsTeamButtonPressed(true)}
          onTouchEnd={() => setIsTeamButtonPressed(false)}
          onTouchCancel={() => setIsTeamButtonPressed(false)}
          onMouseDown={() => setIsTeamButtonPressed(true)}
          onMouseUp={() => setIsTeamButtonPressed(false)}
          onMouseLeave={() => setIsTeamButtonPressed(false)}
          className={cn(
            "h-9 px-3 gap-1.5 font-medium border-border/60 rounded-xl",
            "transition-all duration-100 ease-out",
            isTeamButtonPressed && "scale-[0.97] opacity-90"
          )}
        >
          <span className="max-w-[100px] truncate text-sm">{selectedTeamNames}</span>
          <ChevronDown className={cn(
            "h-4 w-4 opacity-60 transition-transform duration-200",
            isTeamButtonPressed && "rotate-180"
          )} />
        </Button>
      </div>

      {/* Search with focus state */}
      <div className={cn(
        "relative transition-all duration-200",
        isSearchFocused && "scale-[1.01]"
      )}>
        <Search className={cn(
          "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-150",
          isSearchFocused ? "text-primary" : "text-muted-foreground/60"
        )} />
        <Input
          placeholder="Search tasks..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setIsSearchFocused(false)}
          className={cn(
            "pl-9 h-10 bg-muted/40 border-0 rounded-xl text-sm",
            "placeholder:text-muted-foreground/50",
            "transition-all duration-150",
            "focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:bg-muted/60"
          )}
        />
      </div>
    </header>
  );
};
