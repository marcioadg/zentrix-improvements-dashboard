
import React, { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DateRangePickerProps {
  onDateRangeChange: (range: { start: Date; end: Date } | null) => void;
  selectedRange?: { start: Date; end: Date } | null;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  onDateRangeChange,
  selectedRange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempRange, setTempRange] = useState<{ start?: Date; end?: Date }>({});

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;

    if (!tempRange.start || (tempRange.start && tempRange.end)) {
      // Start new selection
      setTempRange({ start: date });
    } else if (tempRange.start && !tempRange.end) {
      // Complete the range
      const start = tempRange.start;
      const end = date;
      
      if (start <= end) {
        const finalRange = { start, end };
        setTempRange(finalRange);
        onDateRangeChange(finalRange);
        setIsOpen(false);
      } else {
        // If end is before start, swap them
        const finalRange = { start: end, end: start };
        setTempRange(finalRange);
        onDateRangeChange(finalRange);
        setIsOpen(false);
      }
    }
  };

  const formatDateDisplay = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const formatDisplayRange = () => {
    if (selectedRange?.start && selectedRange?.end) {
      return `${formatDateDisplay(selectedRange.start)} - ${formatDateDisplay(selectedRange.end)}`;
    }
    return 'Select date range';
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !selectedRange && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {formatDisplayRange()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={tempRange.start}
          onSelect={handleDateSelect}
          initialFocus
        />
        {tempRange.start && !tempRange.end && (
          <div className="p-3 border-t">
            <p className="text-sm text-muted-foreground">
              Start: {formatDateDisplay(tempRange.start)}
            </p>
            <p className="text-sm text-muted-foreground">
              Select end date
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
