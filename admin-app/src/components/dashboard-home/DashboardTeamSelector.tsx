import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users } from 'lucide-react';
import { useSimpleTeams } from '@/hooks/useSimpleTeams';
import { useTranslation } from 'react-i18next';

interface DashboardTeamSelectorProps {
  selectedTeamId: string | null;
  onTeamChange: (teamId: string | null) => void;
}

export const DashboardTeamSelector: React.FC<DashboardTeamSelectorProps> = ({
  selectedTeamId,
  onTeamChange,
}) => {
  const { teams, loading } = useSimpleTeams();
  const { t } = useTranslation('navigation');

  if (loading) {
    return (
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Users className="h-3.5 w-3.5" />
        <span className="text-[13px]">{t('dashboard.loadingTeams')}</span>
      </div>
    );
  }

  if (teams.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5">
      <Users className="h-3.5 w-3.5 text-muted-foreground" />
      <Select
        value={selectedTeamId || 'all'}
        onValueChange={(value) => onTeamChange(value === 'all' ? null : value)}
      >
        <SelectTrigger className="h-auto border-0 bg-transparent p-0 text-[13px] text-muted-foreground hover:text-foreground focus:ring-0 focus:ring-offset-0 gap-1 font-medium [&>svg]:h-3 [&>svg]:w-3">
          <SelectValue placeholder={t('dashboard.allTeams')} />
        </SelectTrigger>
        <SelectContent className="bg-popover border border-border shadow-lg z-50">
          <SelectItem value="all" className="text-[13px]">
            {t('dashboard.allTeams')}
          </SelectItem>
          {teams.map((team) => (
            <SelectItem key={team.id} value={team.id} className="text-[13px]">
              {team.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
