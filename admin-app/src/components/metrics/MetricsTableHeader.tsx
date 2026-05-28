
import React from 'react';
import { TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, addDays } from 'date-fns';

interface MetricsTableHeaderProps {
  weekStarts: string[];
  formatWeekDate: (dateString: string) => string;
  highlightedWeek: string | null;
  weekStartDay?: 'monday' | 'sunday';
}

export const MetricsTableHeader: React.FC<MetricsTableHeaderProps> = ({
  weekStarts,
  formatWeekDate,
  highlightedWeek,
  weekStartDay = 'sunday',
}) => {
  const formatVerticalDate = (weekStart: string) => {
    let startDate = new Date(weekStart);
    
    // If weekStartDay is Monday and the provided date is Sunday, add 1 day
    if (weekStartDay === 'monday' && startDate.getDay() === 0) {
      startDate = addDays(startDate, 1);
    }
    
    // If weekStartDay is Sunday and the provided date is Saturday, add 1 day
    if (weekStartDay === 'sunday' && startDate.getDay() === 6) {
      startDate = addDays(startDate, 1);
    }
    
    const endDate = addDays(startDate, 6);
    
    const startFormatted = format(startDate, 'MMM d');
    const endFormatted = format(endDate, 'MMM d');
    
    return {
      start: `${startFormatted} -`,
      end: endFormatted
    };
  };

  return (
    <TableHeader className="sticky top-0 bg-background z-10">
      <TableRow>
        <TableHead className="w-48 sticky left-0 bg-background z-20 border-r">
          Metric
        </TableHead>
        <TableHead className="w-40 sticky left-48 bg-background z-20 border-r">
          Owner
        </TableHead>
        <TableHead className="w-32 sticky left-88 bg-background z-20 border-r">
          Target
        </TableHead>
        {weekStarts.map((weekStart) => {
          const dates = formatVerticalDate(weekStart);
          return (
            <TableHead 
              key={weekStart} 
              className={`text-center w-32 ${
                highlightedWeek === weekStart ? 'bg-muted' : ''
              }`}
            >
              <div className="flex flex-col">
                <span className="text-xs">{dates.start}</span>
                <span className="text-xs text-muted-foreground">{dates.end}</span>
              </div>
            </TableHead>
          );
        })}
      </TableRow>
    </TableHeader>
  );
};
