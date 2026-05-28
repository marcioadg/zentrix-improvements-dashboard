
import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Users } from 'lucide-react';
import { TeamsList } from '../TeamsList';
import { useUserTeams } from '@/hooks/useUserTeams';
import { useUserCapabilities } from '@/hooks/useUserCapabilities';

interface TeamsTabProps {
  onAddMember: () => void;
  onCreateTeam: () => void;
  onUpdateTeam: (teamId: string, updates: { name?: string; description?: string }) => Promise<void>;
  onEditTeam: (team: any) => void;
  onDeleteTeam: (team: any) => void;
  onDataChange?: () => void; // Add callback for data changes
}

export const TeamsTab: React.FC<TeamsTabProps> = ({
  onAddMember,
  onCreateTeam,
  onUpdateTeam,
  onEditTeam,
  onDeleteTeam,
  onDataChange
}) => {
  const { teams } = useUserTeams();
  const { hasCapability } = useUserCapabilities();

  return (
    <div className="space-y-6">
      {/* Header with Create Team button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[16px] font-semibold text-foreground">Teams</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Organize your company into teams
          </p>
        </div>
        {hasCapability('create_teams') && (
          <Button onClick={onCreateTeam} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Create Team
          </Button>
        )}
      </div>

      <TeamsList
        onAddMember={onAddMember}
        onCreateTeam={onCreateTeam}
        onUpdateTeam={onUpdateTeam}
        onEditTeam={onEditTeam}
        onDeleteTeam={onDeleteTeam}
        onDataChange={onDataChange}
      />
    </div>
  );
};
