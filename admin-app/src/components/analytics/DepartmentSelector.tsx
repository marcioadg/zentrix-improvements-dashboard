import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUserTeams } from '@/hooks/useUserTeams';

interface DepartmentSelectorProps {
  selectedTeamId: string | null;
  onTeamChange: (teamId: string | null) => void;
  filterByMembership?: boolean;
}

export const DepartmentSelector: React.FC<DepartmentSelectorProps> = ({
  selectedTeamId,
  onTeamChange,
  filterByMembership = true
}) => {
  const { teams, loading } = useUserTeams(filterByMembership);

  if (loading) {
    return (
      <Select disabled>
        <SelectTrigger className="w-64">
          <SelectValue placeholder="Loading..." />
        </SelectTrigger>
      </Select>
    );
  }

  return (
    <Select
      value={selectedTeamId || 'all'}
      onValueChange={(value) => onTeamChange(value === 'all' ? null : value)}
    >
      <SelectTrigger className="w-64">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Departments</SelectItem>
        {teams.map((team) => (
          <SelectItem key={team.id} value={team.id}>
            {team.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
