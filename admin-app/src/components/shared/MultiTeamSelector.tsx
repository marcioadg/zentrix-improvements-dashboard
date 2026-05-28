
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ChevronDown, Users, User, Grid } from 'lucide-react';

interface Team {
  id: string;
  name: string;
}

interface TaskCount {
  id: string;
  name: string;
  personalCount: number;
  teamCount: number;
  totalCount: number;
}

interface MultiTeamSelectorProps {
  teams: Team[];
  taskCounts: TaskCount[];
  selectedTeamIds: string[];
  onSelectionChange: (teamIds: string[]) => void;
  className?: string;
}

export const MultiTeamSelector: React.FC<MultiTeamSelectorProps> = ({
  teams,
  taskCounts,
  selectedTeamIds,
  onSelectionChange,
  className = '',
}) => {
  const [open, setOpen] = useState(false);

  const personalCount = taskCounts.find(tc => tc.id === 'personal')?.totalCount || 0;

  // Calculate total count for "All" option
  const totalAllCount = taskCounts.reduce((sum, tc) => sum + tc.totalCount, 0);

  const handleTeamSelect = (teamId: string) => {
    if (teamId === 'all') {
      // When "All" is selected, pass all available team IDs plus personal
      const allTeamIds = ['personal', ...teams.map(t => t.id)];
      onSelectionChange(allTeamIds);
    } else {
      onSelectionChange([teamId]);
    }
    setOpen(false);
  };

  const getDisplayText = () => {
    // Check if "All" is selected (when we have personal + all teams selected)
    const isAllSelected = selectedTeamIds.includes('personal') && 
                         teams.length > 0 && 
                         teams.every(team => selectedTeamIds.includes(team.id)) && 
                         selectedTeamIds.length > 1;
    
    if (isAllSelected) {
      return 'All';
    }
    
    // If only one team selected, show its name
    if (selectedTeamIds.length === 1) {
      const selectedTeamId = selectedTeamIds[0];
      
      if (selectedTeamId === 'personal') {
        return 'Personal';
      }
      
      const team = teams.find(t => t.id === selectedTeamId);
      return team?.name || 'Select Team';
    }
    
    // Default to "All" if multiple or none selected
    return 'All';
  };

  const getDisplayIcon = () => {
    // Check if "All" is selected
    const isAllSelected = selectedTeamIds.includes('personal') && 
                         teams.length > 0 && 
                         teams.every(team => selectedTeamIds.includes(team.id)) && 
                         selectedTeamIds.length > 1;
    
    if (isAllSelected) {
      return <Grid className="h-4 w-4" />;
    }
    
    if (selectedTeamIds.length === 1) {
      const selectedTeamId = selectedTeamIds[0];
      
      if (selectedTeamId === 'personal') {
        return <User className="h-4 w-4" />;
      }
    }
    
    return <Grid className="h-4 w-4" />;
  };

  // Determine current selection for radio group
  const getCurrentSelection = () => {
    const isAllSelected = selectedTeamIds.includes('personal') && 
                         teams.length > 0 && 
                         teams.every(team => selectedTeamIds.includes(team.id)) && 
                         selectedTeamIds.length > 1;
    
    if (isAllSelected) {
      return 'all';
    }
    
    return selectedTeamIds[0] || 'all';
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="justify-between min-w-[180px]"
            role="combobox"
            aria-expanded={open}
          >
            <div className="flex items-center gap-2">
              {getDisplayIcon()}
              {getDisplayText()}
            </div>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0">
          <div className="p-4">
            <RadioGroup value={getCurrentSelection()} onValueChange={handleTeamSelect}>
              {/* All Tasks - Default Option */}
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all" className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <span>All</span>
                    <span className="text-sm text-muted-foreground">
                      ({totalAllCount})
                    </span>
                  </div>
                </Label>
              </div>

              {/* Personal Tasks */}
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="personal" id="personal" />
                <Label htmlFor="personal" className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <span>Personal</span>
                    <span className="text-sm text-muted-foreground">
                      ({personalCount})
                    </span>
                  </div>
                </Label>
              </div>

              {/* Team Tasks */}
              {teams.map((team) => {
                const teamTaskCount = taskCounts.find(tc => tc.id === team.id)?.totalCount || 0;
                return (
                  <div key={team.id} className="flex items-center space-x-2">
                    <RadioGroupItem value={team.id} id={team.id} />
                    <Label htmlFor={team.id} className="flex-1 cursor-pointer">
                      <div className="flex items-center justify-between">
                        <span>{team.name}</span>
                        <span className="text-sm text-muted-foreground">
                          ({teamTaskCount})
                        </span>
                      </div>
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
