
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDirectTeams } from '@/hooks/useDirectTeams';
import { usePeopleDirectCompanies } from '@/hooks/usePeopleDirectCompanies';

interface DirectUserTeamSelectorProps {
  selectedTeamId: string;
  onTeamChange: (teamId: string) => void;
  placeholder?: string;
  className?: string;
}

export const DirectUserTeamSelector: React.FC<DirectUserTeamSelectorProps> = ({
  selectedTeamId,
  onTeamChange,
  placeholder = "Select team",
  className = "w-48"
}) => {
  const { teams, loading } = useDirectTeams();
  const { currentCompany } = usePeopleDirectCompanies();

  // Reset selection if current team is not in the new teams list
  React.useEffect(() => {
    if (teams.length > 0 && selectedTeamId) {
      const teamExists = teams.find(team => team.id === selectedTeamId);
      if (!teamExists) {
        onTeamChange('');
      }
    }
  }, [teams, selectedTeamId, onTeamChange]);

  if (loading) {
    return (
      <Select disabled>
        <SelectTrigger className={className}>
          <SelectValue placeholder="Loading teams..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="loading">Loading...</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  if (teams.length === 0) {
    return (
      <Select disabled>
        <SelectTrigger className={className}>
          <SelectValue placeholder={currentCompany ? `No teams in ${currentCompany?.name}` : "No teams available"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="no-teams">No teams available</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  return (
    <Select value={selectedTeamId} onValueChange={onTeamChange}>
      <SelectTrigger className={className}>
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
