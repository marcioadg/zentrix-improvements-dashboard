import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, User } from 'lucide-react';

interface MobileTeamSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teams: Array<{ id: string; name: string }>;
  selectedTeamIds: string[];
  onSelectionChange: (teamIds: string[]) => void;
}

export const MobileTeamSelector: React.FC<MobileTeamSelectorProps> = ({
  open,
  onOpenChange,
  teams,
  selectedTeamIds,
  onSelectionChange,
}) => {
  const handleTeamToggle = (teamId: string) => {
    const newSelection = selectedTeamIds.includes(teamId)
      ? selectedTeamIds.filter(id => id !== teamId)
      : [...selectedTeamIds, teamId];
    onSelectionChange(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedTeamIds.length === teams.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(teams.map(team => team.id));
    }
  };

  const isAllSelected = selectedTeamIds.length === teams.length;
  const isSomeSelected = selectedTeamIds.length > 0 && selectedTeamIds.length < teams.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Select Teams
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Select All Option */}
          <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/30">
            <Checkbox
              id="select-all"
              checked={isAllSelected}
              onCheckedChange={handleSelectAll}
              className={isSomeSelected ? "data-[state=checked]:bg-primary/60" : ""}
            />
            <label htmlFor="select-all" className="text-sm font-medium cursor-pointer flex-1">
              {isAllSelected ? 'Deselect All' : 'Select All'}
            </label>
          </div>

          {/* Team List */}
          <ScrollArea className="max-h-64">
            <div className="space-y-2">
              {teams.map(team => (
                <div key={team.id} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <Checkbox
                    id={team.id}
                    checked={selectedTeamIds.includes(team.id)}
                    onCheckedChange={() => handleTeamToggle(team.id)}
                  />
                  <label
                    htmlFor={team.id}
                    className="text-sm cursor-pointer flex-1 flex items-center gap-2"
                  >
                    {team.id === 'personal' ? (
                      <User className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Users className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span>{team.name}</span>
                  </label>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Selection Summary */}
          <div className="text-xs text-muted-foreground text-center py-2">
            {selectedTeamIds.length} of {teams.length} teams selected
          </div>

          {/* Close Button */}
          <Button onClick={() => onOpenChange(false)} className="w-full">
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};