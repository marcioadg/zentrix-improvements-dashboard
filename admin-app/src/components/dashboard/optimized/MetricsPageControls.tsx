
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Settings, Trash2 } from 'lucide-react';
import { MetricsSettings } from '@/components/dashboard/MetricsSettings';
import { TeamSelector } from '@/components/shared/TeamSelector';
import { TimePeriodSelector } from '@/components/dashboard/TimePeriodSelector';

// Local interface that matches the Team type structure
interface TeamData {
  id: string;
  name: string;
  description?: string;
  company_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  member_count?: number;
  is_leadership?: boolean;
}

interface MetricsPageControlsProps {
  // Team controls
  teams: TeamData[];
  selectedTeam: string;
  onTeamChange: (teamId: string) => void;
  
  // Date controls
  timePeriod: string;
  onTimePeriodChange: (period: string) => void;
  
  // Management controls
  managementMode: boolean;
  onManagementModeToggle: () => void;
  selectedMetrics: string[];
  onBulkDelete: () => void;
  
  // Search controls
  searchText: string;
  onSearchChange: (text: string) => void;
  
  // View settings
  showCurrentWeek: boolean;
  highlightCurrentWeek: boolean;
  weekStartDay: 'monday' | 'sunday';
  onShowCurrentWeekChange: (show: boolean) => void;
  onHighlightCurrentWeekChange: (highlight: boolean) => void;
  onWeekStartDayChange: (weekStartDay: 'monday' | 'sunday') => void;
  
  // Actions
  onAddMetric: () => void;
}

export const MetricsPageControls: React.FC<MetricsPageControlsProps> = ({
  teams,
  selectedTeam,
  onTeamChange,
  timePeriod,
  onTimePeriodChange,
  managementMode,
  onManagementModeToggle,
  selectedMetrics,
  onBulkDelete,
  searchText,
  onSearchChange,
  showCurrentWeek,
  highlightCurrentWeek,
  weekStartDay,
  onShowCurrentWeekChange,
  onHighlightCurrentWeekChange,
  onWeekStartDayChange,
  onAddMetric,
}) => {
  return (
    <div className="bg-card border rounded-lg p-4 space-y-4">
      {/* Single line with all controls */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* TEAM */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Team:</span>
          <TeamSelector
            teams={teams}
            selectedTeamId={selectedTeam}
            onTeamChange={onTeamChange}
            placeholder="Select team"
          />
        </div>

        {/* DATE SELECTOR */}
        <div className="flex items-center gap-2">
          <TimePeriodSelector
            selectedPeriod={timePeriod}
            onPeriodChange={onTimePeriodChange}
            customDateRange={null}
            onDateRangeChange={() => {}}
          />
        </div>

        {/* SEARCH */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Search:</span>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search metrics..."
              value={searchText}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* METRIC MANAGEMENT */}
        <Button
          variant="outline"
          onClick={onAddMetric}
          className="flex items-center gap-2"
        >
          <Settings className="w-4 h-4" />
          Metric Management
        </Button>

        {/* SETTINGS */}
        <MetricsSettings
          showCurrentWeek={showCurrentWeek}
          highlightCurrentWeek={highlightCurrentWeek}
          weekStartDay={weekStartDay}
          onShowCurrentWeekChange={onShowCurrentWeekChange}
          onHighlightCurrentWeekChange={onHighlightCurrentWeekChange}
          onWeekStartDayChange={onWeekStartDayChange}
        />
      </div>

      {/* Bulk actions row (shown when in management mode and metrics selected) */}
      {managementMode && selectedMetrics.length > 0 && (
        <div className="flex items-center justify-between p-3 bg-primary/10 dark:bg-primary/5 border border-primary/30 dark:border-primary/20 rounded-lg">
          <span className="text-sm font-medium text-primary">
            {selectedMetrics.length} metric{selectedMetrics.length !== 1 ? 's' : ''} selected
          </span>
          
          <Button 
            variant="destructive" 
            size="sm"
            onClick={onBulkDelete} 
            disabled={selectedMetrics.length === 0}
            className="flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete Selected
          </Button>
        </div>
      )}
    </div>
  );
};
