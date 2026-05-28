
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Settings2 } from 'lucide-react';
import { MetricsSettingsContent } from './MetricsSettingsContent';

interface MetricsSettingsProps {
  showCurrentWeek: boolean;
  highlightCurrentWeek: boolean;
  weekStartDay: 'monday' | 'sunday';
  onShowCurrentWeekChange: (show: boolean) => void;
  onHighlightCurrentWeekChange: (highlight: boolean) => void;
  onWeekStartDayChange: (weekStartDay: 'monday' | 'sunday') => void;
}

export const MetricsSettings: React.FC<MetricsSettingsProps> = ({
  showCurrentWeek,
  highlightCurrentWeek,
  weekStartDay,
  onShowCurrentWeekChange,
  onHighlightCurrentWeekChange,
  onWeekStartDayChange,
}) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Settings2 className="w-4 h-4" />
          View Settings
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="end">
        <MetricsSettingsContent
          showCurrentWeek={showCurrentWeek}
          highlightCurrentWeek={highlightCurrentWeek}
          weekStartDay={weekStartDay}
          onShowCurrentWeekChange={onShowCurrentWeekChange}
          onHighlightCurrentWeekChange={onHighlightCurrentWeekChange}
          onWeekStartDayChange={onWeekStartDayChange}
        />
      </PopoverContent>
    </Popover>
  );
};
