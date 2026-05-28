import React, { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ChevronDown, X } from 'lucide-react';
import { useUserTeams } from '@/hooks/useUserTeams';
import { cn } from '@/lib/utils';

interface TeamMultiSelectProps {
  selectedTeamIds: string[];
  onSelectionChange: (teamIds: string[]) => void;
  label?: string;
  placeholder?: string;
  showError?: boolean;
  disabled?: boolean;
  excludeTeamIds?: string[];
  required?: boolean;
}

/**
 * Multi-select dropdown for teams.
 * First selected team is considered the "primary" team.
 * Additional selected teams are secondary assignments.
 */
export const TeamMultiSelect: React.FC<TeamMultiSelectProps> = ({
  selectedTeamIds,
  onSelectionChange,
  label = "Teams",
  placeholder = "Select teams",
  showError = false,
  disabled = false,
  excludeTeamIds = [],
  required = false,
}) => {
  const { teams = [] } = useUserTeams();
  const [open, setOpen] = React.useState(false);

  // Filter out excluded teams
  const availableTeams = useMemo(() => {
    const excludeSet = new Set(excludeTeamIds);
    return teams.filter(team => !excludeSet.has(team.id));
  }, [teams, excludeTeamIds]);

  // Get selected team objects for display
  const selectedTeams = useMemo(() => {
    return selectedTeamIds
      .map(id => teams.find(t => t.id === id))
      .filter(Boolean);
  }, [selectedTeamIds, teams]);

  const handleTeamToggle = (teamId: string, checked: boolean) => {
    if (disabled) return;
    
    let newSelection: string[];
    
    if (checked) {
      // Add team to selections
      newSelection = [...selectedTeamIds, teamId];
    } else {
      // Remove team from selections
      newSelection = selectedTeamIds.filter(id => id !== teamId);
    }
    
    onSelectionChange(newSelection);
  };

  const handleRemoveTeam = (teamId: string) => {
    if (disabled) return;
    onSelectionChange(selectedTeamIds.filter(id => id !== teamId));
  };

  // If only one team available, show simple display
  if (availableTeams.length === 1) {
    const singleTeam = availableTeams[0];
    // Auto-select if not selected
    if (!selectedTeamIds.includes(singleTeam.id)) {
      onSelectionChange([singleTeam.id]);
    }
    return (
      <div className="space-y-2">
        {label && (
          <Label className={cn(showError && "text-destructive")}>
            {label} {required && '*'}
          </Label>
        )}
        <div className="px-3 py-2 border rounded-md bg-muted text-sm">
          {singleTeam.name}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {label && (
        <Label className={cn(showError && "text-destructive")}>
          {label} {required && '*'}
        </Label>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "w-full justify-between font-normal",
              showError && "border-destructive focus-visible:ring-destructive/30",
              selectedTeamIds.length === 0 && "text-muted-foreground"
            )}
          >
            {selectedTeamIds.length === 0 ? (
              placeholder
            ) : selectedTeamIds.length === 1 ? (
              selectedTeams[0]?.name || 'Selected team'
            ) : (
              `${selectedTeamIds.length} teams selected`
            )}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <ScrollArea className="h-[200px]">
            <div className="p-2 space-y-1">
              {availableTeams.map((team, index) => {
                const isSelected = selectedTeamIds.includes(team.id);
                const isPrimary = selectedTeamIds[0] === team.id;
                return (
                  <div
                    key={team.id}
                    className={cn(
                      "flex items-center space-x-2 p-2 rounded hover:bg-muted/50 transition-colors cursor-pointer",
                      disabled && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!disabled) handleTeamToggle(team.id, !isSelected);
                    }}
                  >
                    <Checkbox
                      id={`team-multi-${team.id}`}
                      checked={isSelected}
                      disabled={disabled}
                      // No onCheckedChange - parent div handles all toggle logic
                      // stopPropagation prevents double-firing when clicking checkbox directly
                      onClick={(e) => e.stopPropagation()}
                    />
                    <label 
                      htmlFor={`team-multi-${team.id}`}
                      className={cn(
                        "text-sm cursor-pointer flex-1",
                        disabled && "cursor-not-allowed"
                      )}
                    >
                      {team.name}
                      {isPrimary && isSelected && (
                        <span className="text-xs text-primary ml-2">(Primary)</span>
                      )}
                    </label>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>

      {/* Selected teams as badges */}
      {selectedTeamIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedTeams.map((team, index) => (
            team && (
              <Badge 
                key={team.id} 
                variant={index === 0 ? "default" : "secondary"}
                className="text-xs"
              >
                {team.name}
                {index === 0 && selectedTeamIds.length > 1 && (
                  <span className="ml-1 opacity-70">(Primary)</span>
                )}
                {!disabled && (
                  <button
                    type="button"
                    className="ml-1 hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveTeam(team.id);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </Badge>
            )
          ))}
        </div>
      )}

      {selectedTeamIds.length > 1 && (
        <p className="text-xs text-muted-foreground">
          Metric values are shared across all {selectedTeamIds.length} teams
        </p>
      )}
    </div>
  );
};
