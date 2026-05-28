
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Team {
  id: string;
  name: string;
}

interface TeamSelectorProps {
  selectedTeamId: string;
  onTeamSelect: (teamId: string) => void;
  teams: Team[];
  placeholder?: string;
  disabled?: boolean;
}

export const TeamSelector: React.FC<TeamSelectorProps> = ({
  selectedTeamId,
  onTeamSelect,
  teams,
  placeholder = "Select a team",
  disabled = false,
}) => {
  return (
    <Select
      value={selectedTeamId}
      onValueChange={onTeamSelect}
      disabled={disabled}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {teams.map((team) => (
          <SelectItem key={team.id} value={team.id}>
            {team.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
