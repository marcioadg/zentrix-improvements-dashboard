
import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { UserTeamSelector } from '../shared/UserTeamSelector';
import { useUserTeams } from '@/hooks/useUserTeams';
import { useMetricsPermissions } from '@/hooks/useMetricsPermissions';

interface MetricsHeaderProps {
  metricsCount: number;
  timePeriod: string;
  onTimePeriodChange: (value: string) => void;
  customDateRange: {
    start: Date;
    end: Date;
  } | null;
  onDateRangeChange: (range: {
    start: Date;
    end: Date;
  } | null) => void;
  highlightCurrentWeek: boolean;
  onHighlightCurrentWeekChange: (highlight: boolean) => void;
  showCurrentWeek: boolean;
  onShowCurrentWeekChange: (show: boolean) => void;
  weekStartDay: 'monday' | 'sunday';
  onWeekStartDayChange: (day: 'monday' | 'sunday') => void;
  onAddMetric?: () => void;
  managementMode?: boolean;
  onManagementModeChange?: (mode: boolean) => void;
  selectedMetrics?: string[];
  onBulkDelete?: (metricIds: string[]) => void;
  selectedTeam?: string;
  onTeamChange?: (teamId: string) => void;
  isLoading?: boolean;
}

export const MetricsHeader: React.FC<MetricsHeaderProps> = ({
  metricsCount,
  timePeriod,
  onTimePeriodChange,
  customDateRange,
  onDateRangeChange,
  highlightCurrentWeek,
  onHighlightCurrentWeekChange,
  showCurrentWeek,
  onShowCurrentWeekChange,
  weekStartDay,
  onWeekStartDayChange,
  onAddMetric,
  managementMode,
  onManagementModeChange,
  selectedMetrics,
  onBulkDelete,
  selectedTeam,
  onTeamChange,
  isLoading = false
}) => {
  const { teams } = useUserTeams();
  const { canManageMetrics } = useMetricsPermissions(selectedTeam);
  const currentTeam = teams.find(team => team.id === selectedTeam);

  const handleBulkDelete = () => {
    if (onBulkDelete && selectedMetrics && selectedMetrics.length > 0) {
      onBulkDelete(selectedMetrics);
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <UserTeamSelector 
            selectedTeamId={selectedTeam || ''} 
            onTeamChange={onTeamChange || (() => {})} 
          />

          {/* Only show management mode toggle for team admins */}
          {canManageMetrics && onManagementModeChange && (
            <Button 
              variant={managementMode ? "default" : "outline"} 
              size="sm" 
              onClick={() => onManagementModeChange(!managementMode)}
            >
              {managementMode ? 'Exit Management' : 'Management Mode'}
            </Button>
          )}

          <div>
            <p className="text-muted-foreground">
              {metricsCount} metrics tracked
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Only show bulk delete if user has management permissions and is in management mode */}
          {canManageMetrics && managementMode && selectedMetrics && selectedMetrics.length > 0 && (
            <Button 
              variant="destructive" 
              size="default" 
              onClick={handleBulkDelete} 
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete Selected ({selectedMetrics.length})
            </Button>
          )}

          {onAddMetric && (
            <Button 
              onClick={onAddMetric} 
              size="default" 
              className="flex items-center gap-2 px-[15px] mx-[27px]"
            >
              <Plus className="h-4 w-4" />
              Add Metric
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
