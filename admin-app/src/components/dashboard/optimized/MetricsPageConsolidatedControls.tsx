
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RefreshCw } from 'lucide-react';
import { MetricsSettings } from '@/components/dashboard/MetricsSettings';
import { Team } from '@/lib/supabase';

interface MetricsPageConsolidatedControlsProps {
  teams: Team[];
  selectedTeam: string;
  onTeamChange: (teamId: string) => void;
  timePeriod: string;
  onTimePeriodChange: (newTimePeriod: string) => void;
  onRefresh: () => void;
  loading: boolean;
  metricsCount: number;
  managementMode: boolean;
  onManagementModeToggle: () => void;
  selectedMetrics: string[];
  onBulkDelete: () => void;
  searchText: string;
  onSearchChange: (text: string) => void;
  showCurrentWeek: boolean;
  highlightCurrentWeek: boolean;
  weekStartDay: 'monday' | 'sunday';
  onShowCurrentWeekChange: (show: boolean) => void;
  onHighlightCurrentWeekChange: (highlight: boolean) => void;
  onWeekStartDayChange: (weekStartDay: 'monday' | 'sunday') => void;
}

export const MetricsPageConsolidatedControls: React.FC<MetricsPageConsolidatedControlsProps> = ({
  teams,
  selectedTeam,
  onTeamChange,
  timePeriod,
  onTimePeriodChange,
  onRefresh,
  loading,
  metricsCount,
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
}) => {
  return (
    <div className="flex items-center justify-between gap-3 min-w-0">
      <div className="flex items-center gap-3 min-w-0 overflow-x-auto">
        <Select value={selectedTeam} onValueChange={onTeamChange}>
          <SelectTrigger className="w-[200px] flex-shrink-0">
            <SelectValue placeholder="Select a team" />
          </SelectTrigger>
          <SelectContent>
            {teams.map((team) => (
              <SelectItem key={team.id} value={team.id}>
                {team.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={timePeriod} onValueChange={onTimePeriodChange}>
          <SelectTrigger className="w-[160px] flex-shrink-0">
            <SelectValue placeholder="Select time period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="last_4_weeks">Last 4 Weeks</SelectItem>
            <SelectItem value="last_13_weeks">Last 13 Weeks</SelectItem>
            <SelectItem value="current_quarter">Current Quarter</SelectItem>
            <SelectItem value="current_year">Current Year</SelectItem>
            <SelectItem value="last_year">Last Year</SelectItem>
            <SelectItem value="last_30_days">Last 30 Days</SelectItem>
            <SelectItem value="last_90_days">Last 90 Days</SelectItem>
            <SelectItem value="last_365_days">Last 365 Days</SelectItem>
            <SelectItem value="all_time">All Time</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={onManagementModeToggle} className="flex-shrink-0">
          {managementMode ? 'Disable Management' : 'Enable Management'}
        </Button>

        {managementMode && (
          <Button variant="destructive" onClick={onBulkDelete} disabled={selectedMetrics.length === 0} className="flex-shrink-0">
            Delete Selected
          </Button>
        )}

        <div className="flex items-center space-x-2 flex-shrink-0">
          <Input
            type="text"
            placeholder="Search metrics..."
            value={searchText}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-[160px]"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <Button variant="outline" size="icon" aria-label="Refresh metrics" onClick={onRefresh} disabled={loading}>
          {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>

        <MetricsSettings
          showCurrentWeek={showCurrentWeek}
          highlightCurrentWeek={highlightCurrentWeek}
          weekStartDay={weekStartDay}
          onShowCurrentWeekChange={onShowCurrentWeekChange}
          onHighlightCurrentWeekChange={onHighlightCurrentWeekChange}
          onWeekStartDayChange={onWeekStartDayChange}
        />
      </div>
    </div>
  );
};
