import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export interface PeriodGrouping {
  value: string;
  label: string;
  description: string;
}

const PERIOD_GROUPINGS: PeriodGrouping[] = [
  {
    value: 'weekly',
    label: 'Weekly',
    description: 'Show individual weekly data'
  },
  {
    value: '4-week',
    label: '4-Week',
    description: 'Group data into 4-week periods'
  },
  {
    value: '13-week',
    label: '13-Week',
    description: 'Group data into 13-week periods'
  }
];

interface MetricsPeriodSelectorProps {
  selectedPeriod: string;
  onPeriodChange: (period: string) => void;
  className?: string;
}

export const MetricsPeriodSelector: React.FC<MetricsPeriodSelectorProps> = ({
  selectedPeriod,
  onPeriodChange,
  className = ''
}) => {
  const selectedGrouping = PERIOD_GROUPINGS.find(p => p.value === selectedPeriod) || PERIOD_GROUPINGS[0];

  return (
    <Select value={selectedPeriod} onValueChange={onPeriodChange}>
      <SelectTrigger className="w-[140px]">
        <SelectValue placeholder="Data Grouping" />
      </SelectTrigger>
      <SelectContent>
        {PERIOD_GROUPINGS.map((period) => (
          <SelectItem key={period.value} value={period.value}>
            {period.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};