
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from './DateRangePicker';
import { Calendar } from 'lucide-react';

interface TimePeriodSelectorProps {
  selectedPeriod: string;
  onPeriodChange: (period: string) => void;
  customDateRange?: { start: Date; end: Date } | null;
  onDateRangeChange: (range: { start: Date; end: Date } | null) => void;
}

const TIME_PERIOD_OPTIONS = [
  { value: 'last_4_weeks', label: 'Last 4 weeks' },
  { value: 'last_13_weeks', label: 'Last 13 weeks' },
  { value: 'last_30_days', label: 'Last 30 days' },
  { value: 'last_90_days', label: 'Last 90 days' },
  { value: 'current_quarter', label: 'This quarter' },
  { value: 'last_52_weeks', label: 'Last 52 weeks' },
  { value: 'current_year', label: 'This year' },
  { value: 'last_year', label: 'Last year' },
  { value: 'last_365_days', label: 'Last 365 days' },
  { value: 'all_time', label: 'All time' },
  { value: 'custom', label: 'Custom range' },
];

export const TimePeriodSelector: React.FC<TimePeriodSelectorProps> = ({
  selectedPeriod,
  onPeriodChange,
  customDateRange,
  onDateRangeChange,
}) => {
  return (
    <div className="flex items-center gap-2">
      <Select value={selectedPeriod} onValueChange={onPeriodChange}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Select time period" />
        </SelectTrigger>
        <SelectContent>
          {TIME_PERIOD_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {selectedPeriod === 'custom' && (
        <DateRangePicker
          selectedRange={customDateRange}
          onDateRangeChange={onDateRangeChange}
        />
      )}
    </div>
  );
};
