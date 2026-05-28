
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUserTeams } from '@/hooks/useUserTeams';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { logger } from '@/utils/logger';

interface UserTeam {
  id: string;
  name: string;
  company_id: string;
  description?: string;
  role?: string;
}

interface UserTeamSelectorProps {
  selectedTeamId: string;
  onTeamChange: (teamId: string) => void;
  placeholder?: string;
  className?: string;
  // Optional props to override internal hook usage
  teams?: UserTeam[];
  loading?: boolean;
}

export const UserTeamSelector: React.FC<UserTeamSelectorProps> = ({
  selectedTeamId,
  onTeamChange,
  placeholder = "Select team",
  className = "w-48",
  teams: propsTeams,
  loading: propsLoading
}) => {
  const { teams: hookTeams, loading: hookLoading } = useUserTeams(); // Now returns current company teams by default
  const { currentCompany } = useMultiCompanyAccess();
  
  // Use props if provided, otherwise fall back to hooks
  const teams = propsTeams || hookTeams;
  const loading = propsLoading !== undefined ? propsLoading : hookLoading;

  logger.debug('UserTeamSelector: Current company:', currentCompany?.name);
  logger.debug('UserTeamSelector: Current company teams:', teams);
  logger.debug('UserTeamSelector: Selected team ID:', selectedTeamId);

  // Reset selection if current team is not in the current company teams list
  React.useEffect(() => {
    if (teams.length > 0 && selectedTeamId) {
      const teamExists = teams.find(team => team.id === selectedTeamId);
      if (!teamExists) {
        logger.debug('UserTeamSelector: Selected team not found in current company teams, clearing selection');
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

  if (!currentCompany) {
    return (
      <Select disabled>
        <SelectTrigger className={className}>
          <SelectValue placeholder="No company selected" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="no-company">No company selected</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  if (teams.length === 0) {
    return (
      <Select disabled>
        <SelectTrigger className={className}>
          <SelectValue placeholder={`No teams in ${currentCompany?.name}`} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="no-teams">No teams available</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  return (
    <Select value={selectedTeamId} onValueChange={onTeamChange}>
      <SelectTrigger className={`${className} border-border/50 h-9 text-sm bg-background hover:bg-muted/50 transition-colors`}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {teams.map((team) => (
          <SelectItem key={team.id} value={team.id} className="text-sm">
            {team.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
