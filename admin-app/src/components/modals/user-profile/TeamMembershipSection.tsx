
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Info } from 'lucide-react';
import { logger } from '@/utils/logger';

interface Team {
  id: string;
  name: string;
}

interface TeamMembership {
  team_id: string;
  teams?: {
    name: string;
  };
}

interface TeamMembershipSectionProps {
  isEditing: boolean;
  availableTeams: Team[];
  displayUserTeams: TeamMembership[];
  selectedTeamIds: string[];
  onTeamToggle: (teamId: string) => void;
  loading: boolean;
  currentCompanyName?: string;
}

export const TeamMembershipSection: React.FC<TeamMembershipSectionProps> = ({
  isEditing,
  availableTeams,
  displayUserTeams,
  selectedTeamIds,
  onTeamToggle,
  loading,
  currentCompanyName
}) => {
  logger.log('🔍 TeamMembershipSection: Rendering with props:', {
    isEditing,
    availableTeamsCount: availableTeams.length,
    displayUserTeamsCount: displayUserTeams.length,
    selectedTeamIdsCount: selectedTeamIds.length,
    loading,
    currentCompanyName,
    availableTeams: availableTeams.map(t => ({ id: t.id, name: t.name })),
    displayUserTeams: displayUserTeams.map(t => ({ teamId: t.team_id, teamName: t.teams?.name })),
    selectedTeamIds
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4" />
          Team Memberships
          {isEditing && (
            <Badge variant="outline" className="text-xs">
              Editing
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!isEditing && (
          <div className="flex items-center gap-2 p-3 bg-primary/5 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <Info className="h-4 w-4 text-primary dark:text-blue-400" />
            <span className="text-sm text-primary dark:text-blue-300">
              You need manager permissions to edit team memberships
            </span>
          </div>
        )}

        {isEditing ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Toggle team memberships for this user:
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto border-2 border-dashed border-primary/30 rounded-lg p-4 bg-background/50">
              {availableTeams.map((team) => {
                const isSelected = selectedTeamIds.includes(team.id);
                return (
                  <div key={team.id} className="flex items-center space-x-3 p-2 hover:bg-muted/70 rounded-md transition-colors">
                    <Checkbox
                      id={`team-${team.id}`}
                      checked={isSelected}
                      onCheckedChange={() => {
                        logger.log('🔍 TeamMembershipSection: Team checkbox clicked:', {
                          teamId: team.id,
                          teamName: team.name,
                          currentlySelected: isSelected,
                          willBeSelected: !isSelected
                        });
                        onTeamToggle(team.id);
                      }}
                      disabled={loading}
                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <Label 
                      htmlFor={`team-${team.id}`}
                      className="text-sm cursor-pointer flex-1 font-medium hover:text-primary transition-colors"
                    >
                      {team.name}
                    </Label>
                    {isSelected && (
                      <Badge variant="default" className="text-xs bg-primary text-primary-foreground">
                        ✓ Selected
                      </Badge>
                    )}
                  </div>
                );
              })}
              {availableTeams.length === 0 && (
                <div className="text-center py-6">
                  <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    No teams available in {currentCompanyName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Create teams in the Teams tab to assign users
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {displayUserTeams.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {displayUserTeams.map((teamMembership) => (
                  <Badge key={teamMembership.team_id} variant="secondary" className="text-xs">
                    {teamMembership.teams?.name || 'Unknown Team'}
                  </Badge>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 border-2 border-dashed border-muted rounded-lg">
                <Users className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Not a member of any teams
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
