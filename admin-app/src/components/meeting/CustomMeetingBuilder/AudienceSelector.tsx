import React from 'react';
import { Users, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TeamSelector } from '@/components/TeamSelector';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface Team {
  id: string;
  name: string;
}

interface AudienceSelectorProps {
  audienceType: 'team' | 'members';
  onAudienceTypeChange: (type: 'team' | 'members') => void;
  selectedTeamId: string;
  onTeamSelect: (teamId: string) => void;
  teams: Team[];
  selectedMemberIds: string[];
  onOpenMemberSelector: () => void;
  teamsLoading?: boolean;
}

export const AudienceSelector: React.FC<AudienceSelectorProps> = ({
  audienceType,
  onAudienceTypeChange,
  selectedTeamId,
  onTeamSelect,
  teams,
  selectedMemberIds,
  onOpenMemberSelector,
  teamsLoading = false,
}) => {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <Label className="text-sm text-muted-foreground flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" />
          Team
        </Label>
        <Switch
          checked={audienceType === 'members'}
          onCheckedChange={(checked) => onAudienceTypeChange(checked ? 'members' : 'team')}
          className="data-[state=checked]:bg-primary"
        />
        <Label className="text-sm text-muted-foreground flex items-center gap-1.5">
          <User className="h-3.5 w-3.5" />
          Members
        </Label>
      </div>

      <div className="h-6 w-px bg-border" />

      {audienceType === 'team' ? (
        <div className="w-[200px]">
          <TeamSelector
            selectedTeamId={selectedTeamId}
            onTeamSelect={onTeamSelect}
            teams={teams}
            placeholder="Select team"
            disabled={teamsLoading}
          />
        </div>
      ) : (
        <Button
          variant="outline"
          onClick={onOpenMemberSelector}
          className="w-[200px] h-9 justify-between text-sm"
        >
          <span>
            {selectedMemberIds.length > 0
              ? `${selectedMemberIds.length} selected`
              : 'Select members'}
          </span>
          {selectedMemberIds.length > 0 && (
            <Badge variant="secondary" className="ml-2 h-5 px-1.5">
              {selectedMemberIds.length}
            </Badge>
          )}
        </Button>
      )}
    </div>
  );
};
