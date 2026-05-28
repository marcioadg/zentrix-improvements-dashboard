import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface MetricsSettingsContentProps {
  showCurrentWeek: boolean;
  highlightCurrentWeek: boolean;
  weekStartDay: 'monday' | 'sunday';
  onShowCurrentWeekChange: (show: boolean) => void;
  onHighlightCurrentWeekChange: (highlight: boolean) => void;
  onWeekStartDayChange: (weekStartDay: 'monday' | 'sunday') => void;
}

export const MetricsSettingsContent: React.FC<MetricsSettingsContentProps> = ({
  showCurrentWeek,
  highlightCurrentWeek,
  weekStartDay,
  onShowCurrentWeekChange,
  onHighlightCurrentWeekChange,
  onWeekStartDayChange,
}) => {
  return (
    <div className="space-y-4">
      <div className="font-medium text-sm text-foreground mb-3">Display Options</div>
      
      <div className="flex items-center justify-between">
        <Label htmlFor="show-current-week" className="text-sm">
          Show Current Week Column
        </Label>
        <Switch
          id="show-current-week"
          checked={showCurrentWeek}
          onCheckedChange={onShowCurrentWeekChange}
        />
      </div>
      
      <div className="flex items-center justify-between">
        <Label htmlFor="highlight-current-week" className="text-sm">
          Highlight Current Week
        </Label>
        <Switch
          id="highlight-current-week"
          checked={highlightCurrentWeek}
          onCheckedChange={onHighlightCurrentWeekChange}
        />
      </div>
      
      <div className="flex items-center justify-between opacity-50">
        <div className="text-sm text-muted-foreground">
          <Label htmlFor="week-start-day" className="text-sm text-muted-foreground">
            Week Start Day
          </Label>
          <div className="text-xs text-muted-foreground/70 mt-1">Coming Soon</div>
        </div>
        <Select value={weekStartDay} onValueChange={() => {}} disabled>
          <SelectTrigger className="w-24 cursor-not-allowed opacity-50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sunday">Sunday</SelectItem>
            <SelectItem value="monday">Monday</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
