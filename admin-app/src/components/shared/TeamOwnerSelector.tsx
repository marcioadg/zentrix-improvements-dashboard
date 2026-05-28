
import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUserTeams } from '@/hooks/useUserTeams';
import { useTeamMemberSelector } from '@/hooks/useTeamMemberSelector';
import { MultiUserSelector } from '@/components/shared/MultiUserSelector';
import { logger } from '@/utils/logger';

interface TeamOwnerSelectorProps {
  selectedTeamId: string;
  onTeamChange: (teamId: string) => void;
  selectedOwnerIds: string[];
  onOwnerChange: (ownerIds: string[]) => void;
  allowPersonal?: boolean;
  multipleOwners?: boolean;
  teamLabel?: string;
  ownerLabel?: string;
  teamPlaceholder?: string;
  ownerPlaceholder?: string;
  showTeamError?: boolean;
  showOwnerError?: boolean;
}

export const TeamOwnerSelector: React.FC<TeamOwnerSelectorProps> = ({
  selectedTeamId,
  onTeamChange,
  selectedOwnerIds = [],
  onOwnerChange,
  allowPersonal = false,
  multipleOwners = false,
  teamLabel = "Team",
  ownerLabel = "Owner",
  teamPlaceholder = "Select team",
  ownerPlaceholder = "Select owner",
  showTeamError = false,
  showOwnerError = false,
}) => {
  const { teams = [] } = useUserTeams();
  const { users: teamMembers = [], loading: loadingMembers, error: membersError } = useTeamMemberSelector(
    selectedTeamId === 'personal' ? null : selectedTeamId
  );

  // Enhanced debugging for team selection visibility
  React.useEffect(() => {
    logger.log('🎯 TeamOwnerSelector Component State:', {
      selectedTeamId,
      teamsCount: teams.length,
      teamsData: teams.map(t => ({ id: t.id, name: t.name })),
      teamMembersCount: teamMembers.length,
      shouldShowOwnerSelection: selectedTeamId && selectedTeamId !== 'personal' && Array.isArray(teamMembers),
      loadingMembers,
      membersError,
      selectedOwnerIds
    });
  }, [selectedTeamId, teams, teamMembers, loadingMembers, membersError, selectedOwnerIds]);

  const handleTeamChange = (newTeamId: string) => {
    logger.log('TeamOwnerSelector: Team changed from', selectedTeamId, 'to', newTeamId);
    onTeamChange(newTeamId);
    // Reset owner selection when team changes
    onOwnerChange([]);
  };

  const handleOwnerSelectionChange = (userIds: string[]) => {
    logger.log('TeamOwnerSelector: Owner selection changed:', userIds);
    onOwnerChange(userIds || []);
  };

  const handleSingleOwnerChange = (ownerId: string) => {
    logger.log('TeamOwnerSelector: Single owner changed to:', ownerId);
    onOwnerChange([ownerId]);
  };

  // Don't render owner selection if teamMembers is null or undefined
  const shouldShowOwnerSelection = selectedTeamId && selectedTeamId !== 'personal' && Array.isArray(teamMembers);

  return (
    <div className="space-y-4">
      {/* Team Selection */}
      <div className="space-y-2">
        <Label htmlFor="team-selector" className={showTeamError && !selectedTeamId ? 'text-destructive' : ''}>
          {teamLabel}
        </Label>
        <Select value={selectedTeamId} onValueChange={handleTeamChange}>
          <SelectTrigger className={showTeamError && !selectedTeamId ? 'border-destructive focus-visible:ring-destructive/30' : ''}>
            <SelectValue placeholder={teamPlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {allowPersonal && (
              <SelectItem value="personal">Personal</SelectItem>
            )}
            {teams.map((team) => (
              <SelectItem key={team.id} value={team.id}>
                {team.name}
                {team.name?.toLowerCase().includes('leadership') && (
                  <span className="text-xs text-primary ml-2">(Leadership)</span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Owner Selection */}
      {shouldShowOwnerSelection && (
        <div className="space-y-2">
          <Label htmlFor="owner-selector" className={showOwnerError && selectedOwnerIds.length === 0 ? 'text-destructive' : ''}>
            {ownerLabel}
            {teamMembers.length > 0 && (
              <span className="text-xs text-muted-foreground ml-2">
                ({teamMembers.length} members available)
              </span>
            )}
          </Label>
          
          {loadingMembers ? (
            <div className="p-3 border rounded-lg bg-muted/50">
              <span className="text-sm text-muted-foreground">Loading team members...</span>
            </div>
          ) : membersError ? (
            <div className="p-3 border rounded-lg bg-destructive/5 border-red-200">
              <span className="text-sm text-destructive">Error: {membersError}</span>
            </div>
          ) : teamMembers.length === 0 ? (
            <div className="p-3 border rounded-lg bg-warning/5 border-yellow-200">
              <span className="text-sm text-yellow-700">No team members found</span>
            </div>
          ) : multipleOwners ? (
            <MultiUserSelector
              users={teamMembers}
              selectedUserIds={selectedOwnerIds}
              onSelectionChange={handleOwnerSelectionChange}
              placeholder={ownerPlaceholder}
              headerInfo={{
                title: `Select ${ownerLabel}`,
                description: "Choose team members to assign"
              }}
            />
          ) : (
            <Select 
              value={selectedOwnerIds[0] || ''} 
              onValueChange={handleSingleOwnerChange}
              disabled={loadingMembers}
            >
              <SelectTrigger className={showOwnerError && selectedOwnerIds.length === 0 ? 'border-destructive focus-visible:ring-destructive/30' : ''}>
                <SelectValue placeholder={loadingMembers ? "Loading..." : ownerPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {teamMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.full_name}
                    <span className="text-xs text-muted-foreground ml-2">
                      ({member.email})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}
    </div>
  );
};
