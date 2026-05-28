import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Check, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Team {
  id: string;
  name: string;
}

interface TeamFilterDropdownProps {
  teams: Team[];
  selectedTeamId: string | 'all' | 'personal';
  onTeamSelect: (teamId: string | 'all' | 'personal') => void;
  taskCount: number;
  isActive: boolean;
  teamTaskCounts?: Record<string, number>;
  onFilterChange: () => void;
  personalTaskCount?: number;
}

export const TeamFilterDropdown: React.FC<TeamFilterDropdownProps> = ({
  teams,
  selectedTeamId,
  onTeamSelect,
  taskCount,
  isActive,
  teamTaskCounts = {},
  onFilterChange,
  personalTaskCount = 0,
}) => {
  const [open, setOpen] = useState(false);

  const getDisplayText = () => {
    if (selectedTeamId === 'all') {
      return 'All Tasks';
    }
    if (selectedTeamId === 'personal') {
      return 'Personal';
    }
    const team = teams.find(t => t.id === selectedTeamId);
    return team ? team.name : 'All Tasks';
  };

  const getTotalCount = () => {
    if (selectedTeamId === 'all') {
      return taskCount;
    }
    if (selectedTeamId === 'personal') {
      return personalTaskCount;
    }
    return teamTaskCounts[selectedTeamId] || 0;
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant={isActive ? "default" : "outline"}
          size="sm"
          className="gap-1.5 min-w-[120px] justify-between rounded-[5px]"
        >
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            <span>{getDisplayText()}</span>
            <span className="text-xs opacity-70">({getTotalCount()})</span>
          </div>
          <ChevronDown className={cn("h-3.5 w-3.5 opacity-50 transition-transform duration-200", open && "rotate-180")} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="start" 
        className="bg-background border shadow-lg z-50 min-w-[220px] max-h-[340px] overflow-y-auto p-1"
      >
        <DropdownMenuItem
          onClick={() => {
            onTeamSelect('all');
            setOpen(false);
          }}
          className={cn(
            "cursor-pointer rounded-md px-3 py-2.5 transition-colors",
            "hover:bg-accent focus:bg-accent",
            selectedTeamId === 'all' && "bg-accent/50"
          )}
        >
          <div className="flex items-center justify-between w-full gap-3">
            <div className="flex items-center gap-2">
              {selectedTeamId === 'all' && (
                <Check className="h-4 w-4 text-primary" />
              )}
              <span className={cn(
                "font-medium",
                selectedTeamId === 'all' && "text-primary"
              )}>
                All Tasks
              </span>
            </div>
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full bg-muted",
              selectedTeamId === 'all' && "bg-primary/10 text-primary font-medium"
            )}>
              {taskCount}
            </span>
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuItem
          onClick={() => {
            onTeamSelect('personal');
            setOpen(false);
          }}
          className={cn(
            "cursor-pointer rounded-md px-3 py-2.5 transition-colors",
            "hover:bg-accent focus:bg-accent",
            selectedTeamId === 'personal' && "bg-accent/50"
          )}
        >
          <div className="flex items-center justify-between w-full gap-3">
            <div className="flex items-center gap-2">
              {selectedTeamId === 'personal' && (
                <Check className="h-4 w-4 text-primary" />
              )}
              <span className={cn(
                "font-medium",
                selectedTeamId === 'personal' && "text-primary"
              )}>
                Personal
              </span>
            </div>
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full bg-muted",
              selectedTeamId === 'personal' && "bg-primary/10 text-primary font-medium"
            )}>
              {personalTaskCount}
            </span>
          </div>
        </DropdownMenuItem>
        
        {teams.length > 0 && (
          <>
            <DropdownMenuSeparator className="my-1" />
            {teams.map((team) => {
              const count = teamTaskCounts[team.id] || 0;
              const isSelected = selectedTeamId === team.id;
              
              return (
                <DropdownMenuItem
                  key={team.id}
                  onClick={() => {
                    onTeamSelect(team.id);
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
                      {isSelected && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                      <span className={cn(
                        "truncate max-w-[140px]",
                        isSelected && "text-primary font-medium"
                      )}>
                        {team.name}
                      </span>
                    </div>
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full bg-muted flex-shrink-0",
                      isSelected && "bg-primary/10 text-primary font-medium"
                    )}>
                      {count}
                    </span>
                  </div>
                </DropdownMenuItem>
              );
            })}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
