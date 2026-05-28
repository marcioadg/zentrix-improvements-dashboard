
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Team } from '@/lib/supabase';

const teamSelectItemClassName = [
  'font-normal text-popover-foreground',
  'hover:bg-accent hover:text-accent-foreground',
  'focus:bg-accent focus:text-accent-foreground',
  'data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground',
  'data-[state=checked]:bg-state-active data-[state=checked]:font-medium data-[state=checked]:text-foreground',
  '[&[data-state=checked]>span]:text-accent',
  'data-[state=checked]:data-[highlighted]:bg-accent data-[state=checked]:data-[highlighted]:text-accent-foreground',
  '[&[data-state=checked][data-highlighted]>span]:text-accent-foreground',
].join(' ');

interface TeamSelectorProps {
  teams: Team[];
  selectedTeamId: string;
  onTeamChange: (teamId: string) => void;
  placeholder?: string;
  className?: string;
}

export const TeamSelector: React.FC<TeamSelectorProps> = ({
  teams,
  selectedTeamId,
  onTeamChange,
  placeholder = "Select team",
  className = "w-48"
}) => {
  return (
    <Select value={selectedTeamId} onValueChange={onTeamChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-popover border border-border shadow-lg max-h-[300px] overflow-y-auto">
        {teams.map((team) => (
          <SelectItem 
            key={team.id} 
            value={team.id}
            className={teamSelectItemClassName}
          >
            {team.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
