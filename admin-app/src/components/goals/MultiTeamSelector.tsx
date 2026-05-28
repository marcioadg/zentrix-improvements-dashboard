
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronDown, Users } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { logger } from '@/utils/logger';

interface Team {
  id: string;
  name: string;
}

interface MultiTeamSelectorProps {
  teams: Team[];
  selectedTeamIds: string[];
  onSelectionChange: (teamIds: string[]) => void;
  placeholder?: string;
  className?: string;
  disabledTeamIds?: string[];
  disabledReasons?: Record<string, string>;
  disabled?: boolean;
}

export const MultiTeamSelector: React.FC<MultiTeamSelectorProps> = ({
  teams,
  selectedTeamIds,
  onSelectionChange,
  placeholder = "Select teams",
  className = '',
  disabledTeamIds = [],
  disabledReasons = {},
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  
  // Ensure selectedTeamIds is always an array and properly initialized
  const safeSelectedTeamIds = Array.isArray(selectedTeamIds) ? selectedTeamIds : [];

  logger.log('🔍 MultiTeamSelector - Render state:', {
    teamsCount: teams.length,
    selectedTeamIds: safeSelectedTeamIds,
    placeholder,
    hasOnSelectionChange: !!onSelectionChange
  });

  useEffect(() => {
    logger.log('🔍 MultiTeamSelector - Selection effect triggered:', { 
      selectedCount: safeSelectedTeamIds.length,
      selectedTeamIds: safeSelectedTeamIds
    });
  }, [safeSelectedTeamIds]);

  const handleTeamToggle = (teamId: string, checked: boolean) => {
    logger.log('🔍 MultiTeamSelector - Team selection toggled:', { 
      teamId, 
      checked, 
      currentSelection: safeSelectedTeamIds,
      teamName: teams.find(t => t.id === teamId)?.name 
    });
    
    if (checked) {
      // Add team to selection (avoid duplicates)
      const newSelection = safeSelectedTeamIds.includes(teamId) 
        ? safeSelectedTeamIds 
        : [...safeSelectedTeamIds, teamId];
      logger.log('🔍 MultiTeamSelector - Adding team, new selection:', newSelection);
      onSelectionChange(newSelection);
    } else {
      // Remove team from selection
      const newSelection = safeSelectedTeamIds.filter(id => id !== teamId);
      logger.log('🔍 MultiTeamSelector - Removing team, new selection:', newSelection);
      onSelectionChange(newSelection);
    }
  };

  const getDisplayText = () => {
    if (safeSelectedTeamIds.length === 0) {
      return placeholder;
    }
    
    if (safeSelectedTeamIds.length === 1) {
      const team = teams.find(t => t.id === safeSelectedTeamIds[0]);
      return team?.name || 'Unknown Team';
    }
    
    return `${safeSelectedTeamIds.length} teams selected`;
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <TooltipProvider>
        <Popover open={open} onOpenChange={setOpen}>
          {disabled ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-block">
                  <Button
                    variant="outline"
                    className="justify-between min-w-[200px]"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                  >
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      {getDisplayText()}
                    </div>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="z-[60]">
                <p className="text-xs">Uncheck 'Make this a company goal' to change teams</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="justify-between min-w-[200px]"
                role="combobox"
                aria-expanded={open}
              >
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {getDisplayText()}
                </div>
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
          )}
          <PopoverContent className="w-64 p-0 pointer-events-auto">
            <TooltipProvider>
            <div className="p-4 max-h-64 overflow-y-auto">
              <div className="space-y-3">
                {teams.map((team) => {
                  const isChecked = safeSelectedTeamIds.includes(team.id);
                  const isDisabled = disabledTeamIds.includes(team.id);
                  const disabledReason = disabledReasons[team.id];
                  
                  const teamItem = (
                    <div className={`flex items-center space-x-2 ${isDisabled ? 'opacity-50' : ''}`}>
                      <Checkbox
                        id={team.id}
                        checked={isChecked}
                        onCheckedChange={(checked) => handleTeamToggle(team.id, checked === true)}
                        disabled={isDisabled}
                      />
                      <Label 
                        htmlFor={team.id} 
                        className={`flex-1 ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        {team.name}
                      </Label>
                    </div>
                  );

                  if (isDisabled && disabledReason) {
                    return (
                      <Tooltip key={team.id}>
                        <TooltipTrigger asChild>
                          {teamItem}
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-[200px]">
                          <p className="text-xs">{disabledReason}</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  }

                  return <div key={team.id}>{teamItem}</div>;
                })}
                
                {teams.length === 0 && (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    No teams available
                  </div>
                )}
              </div>
            </div>
              </TooltipProvider>
            </PopoverContent>
          </Popover>
        </TooltipProvider>
      </div>
    );
  };
