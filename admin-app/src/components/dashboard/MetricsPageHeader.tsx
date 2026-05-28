
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Team } from '@/lib/supabase';

interface MetricsPageHeaderProps {
  teams?: Team[];
  selectedTeam?: string;
  onTeamChange?: (teamId: string) => void;
  timePeriod?: string;
  onTimePeriodChange?: (newTimePeriod: string) => void;
  onRefresh?: () => void;
  loading?: boolean;
}

export const MetricsPageHeader: React.FC<MetricsPageHeaderProps> = ({
  teams = [],
  selectedTeam = '',
  onTeamChange = () => {},
  timePeriod = 'last_13_weeks',
  onTimePeriodChange = () => {},
  onRefresh = () => {},
  loading = false,
}) => {
  return (
    <div className="flex items-center justify-between">
      <Select value={selectedTeam} onValueChange={onTeamChange} disabled={teams.length === 0}>
        <SelectTrigger className="w-[280px]">
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

      <div className="flex items-center gap-4">
        <Select value={timePeriod} onValueChange={onTimePeriodChange} disabled={teams.length === 0}>
          <SelectTrigger className="w-[220px]">
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
          </SelectContent>
        </Select>

        <Button variant="outline" size="icon" aria-label="Refresh metrics" onClick={onRefresh} disabled={loading || teams.length === 0}>
          {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
};
