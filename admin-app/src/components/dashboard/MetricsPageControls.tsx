
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { MetricsSettings } from '@/components/dashboard/MetricsSettings';

interface MetricsPageControlsProps {
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
  onAddMetric: () => void;
}

export const MetricsPageControls: React.FC<MetricsPageControlsProps> = ({
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
    <div className="flex flex-row items-center justify-between gap-4 overflow-x-auto">
      <div className="flex flex-wrap items-center gap-4 min-w-0">
        <Button variant="outline" onClick={onAddMetric}>
          <Plus className="w-4 h-4 mr-2" />
          Add Metric
        </Button>

        <Button variant="outline" onClick={onManagementModeToggle}>
          {managementMode ? 'Disable Management' : 'Enable Management'}
        </Button>

        {managementMode && (
          <Button variant="destructive" onClick={onBulkDelete} disabled={selectedMetrics.length === 0}>
            Delete Selected
          </Button>
        )}

        <div className="flex items-center space-x-2 min-w-0">
          <Label htmlFor="search" className="whitespace-nowrap">Search:</Label>
          <Input
            id="search"
            type="text"
            placeholder="Search metrics..."
            value={searchText}
            onChange={(e) => onSearchChange(e.target.value)}
            className="min-w-[200px]"
          />
        </div>
      </div>
      
      <div className="flex-shrink-0">
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
