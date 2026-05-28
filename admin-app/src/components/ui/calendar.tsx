import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { setMonth, setYear, getDaysInMonth, addDays, subDays, addMonths, subMonths, addYears, subYears } from "date-fns";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  onDropdownSelect?: (date: Date) => void;
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// Context to pass props to CalendarCaption without recreating the component
// This is critical: the Caption component identity must stay stable so dropdowns don't unmount
interface CalendarCaptionContextValue {
  onMonthChange?: (date: Date) => void;
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
}

const CalendarCaptionContext = React.createContext<CalendarCaptionContextValue>({});

function CalendarCaptionInner({
  displayMonth,
}: {
  displayMonth: Date;
}) {
  const { onMonthChange, selectedDate, onDateSelect } = React.useContext(CalendarCaptionContext);
  
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 21 }, (_, i) => currentYear - 10 + i);

  const handleMonthSelect = React.useCallback((monthIndex: string) => {
    const newMonthIndex = parseInt(monthIndex);
    const newMonth = setMonth(displayMonth, newMonthIndex);
    
    if (onMonthChange) {
      onMonthChange(newMonth);
    }
    
    // Auto-select the date when month changes
    if (onDateSelect && selectedDate) {
      const currentDay = selectedDate.getDate();
      const daysInNewMonth = getDaysInMonth(new Date(displayMonth.getFullYear(), newMonthIndex));
      const adjustedDay = Math.min(currentDay, daysInNewMonth);
      const newDate = new Date(displayMonth.getFullYear(), newMonthIndex, adjustedDay);
      onDateSelect(newDate);
    } else if (onDateSelect) {
      // If no date selected yet, select the 1st of the new month
      const newDate = new Date(displayMonth.getFullYear(), newMonthIndex, 1);
      onDateSelect(newDate);
    }
  }, [displayMonth, onMonthChange, onDateSelect, selectedDate]);

  const handleYearSelect = React.useCallback((year: string) => {
    const newYear = parseInt(year);
    const newMonth = setYear(displayMonth, newYear);
    
    if (onMonthChange) {
      onMonthChange(newMonth);
    }
    
    // Auto-select the date when year changes
    if (onDateSelect && selectedDate) {
      const currentDay = selectedDate.getDate();
      const currentMonthIndex = selectedDate.getMonth();
      const daysInNewMonth = getDaysInMonth(new Date(newYear, currentMonthIndex));
      const adjustedDay = Math.min(currentDay, daysInNewMonth);
      const newDate = new Date(newYear, currentMonthIndex, adjustedDay);
      onDateSelect(newDate);
    } else if (onDateSelect) {
      // If no date selected yet, select the 1st of the current month in new year
      const newDate = new Date(newYear, displayMonth.getMonth(), 1);
      onDateSelect(newDate);
    }
  }, [displayMonth, onMonthChange, onDateSelect, selectedDate]);

  const stepDay = React.useCallback((direction: 1 | -1) => {
    if (!onDateSelect) return;
    const base = selectedDate || new Date(displayMonth.getFullYear(), displayMonth.getMonth(), 1);
    const newDate = direction === 1 ? addDays(base, 1) : subDays(base, 1);
    onDateSelect(newDate);
    if (onMonthChange && (newDate.getMonth() !== displayMonth.getMonth() || newDate.getFullYear() !== displayMonth.getFullYear())) {
      onMonthChange(newDate);
    }
  }, [selectedDate, displayMonth, onDateSelect, onMonthChange]);

  const stepMonth = React.useCallback((direction: 1 | -1) => {
    const newMonth = direction === 1 ? addMonths(displayMonth, 1) : subMonths(displayMonth, 1);
    if (onMonthChange) onMonthChange(newMonth);
    if (onDateSelect && selectedDate) {
      const daysInNew = getDaysInMonth(newMonth);
      const adjustedDay = Math.min(selectedDate.getDate(), daysInNew);
      onDateSelect(new Date(newMonth.getFullYear(), newMonth.getMonth(), adjustedDay));
    }
  }, [displayMonth, selectedDate, onMonthChange, onDateSelect]);

  const stepYear = React.useCallback((direction: 1 | -1) => {
    const newDate = direction === 1 ? addYears(displayMonth, 1) : subYears(displayMonth, 1);
    if (onMonthChange) onMonthChange(newDate);
    if (onDateSelect && selectedDate) {
      const daysInNew = getDaysInMonth(new Date(newDate.getFullYear(), selectedDate.getMonth()));
      const adjustedDay = Math.min(selectedDate.getDate(), daysInNew);
      onDateSelect(new Date(newDate.getFullYear(), selectedDate.getMonth(), adjustedDay));
    }
  }, [displayMonth, selectedDate, onMonthChange, onDateSelect]);

  return (
    <div className="flex items-center justify-center gap-1 pt-1">
      <div className="flex items-center">
        <button type="button" onClick={() => stepDay(-1)} onPointerDown={(e) => e.stopPropagation()} className="h-6 w-6 flex items-center justify-center rounded hover:bg-accent">
          <ChevronLeft className="h-3 w-3" />
        </button>
        <span className="text-sm font-medium min-w-[20px] text-center">
          {selectedDate ? selectedDate.getDate() : "—"}
        </span>
        <button type="button" onClick={() => stepDay(1)} onPointerDown={(e) => e.stopPropagation()} className="h-6 w-6 flex items-center justify-center rounded hover:bg-accent">
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>
      <div className="flex items-center">
        <button type="button" onClick={() => stepMonth(-1)} onPointerDown={(e) => e.stopPropagation()} className="h-6 w-6 flex items-center justify-center rounded hover:bg-accent">
          <ChevronLeft className="h-3 w-3" />
        </button>
        <Select
          value={displayMonth.getMonth().toString()}
          onValueChange={handleMonthSelect}
        >
          <SelectTrigger
            className="h-7 w-auto text-sm font-medium border-none shadow-none focus:ring-0 px-1 [&>svg]:hidden justify-center"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <SelectValue>{MONTHS[displayMonth.getMonth()]}</SelectValue>
          </SelectTrigger>
          <SelectContent className="bg-popover">
            {MONTHS.map((month, index) => (
              <SelectItem key={month} value={index.toString()}>
                {month}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <button type="button" onClick={() => stepMonth(1)} onPointerDown={(e) => e.stopPropagation()} className="h-6 w-6 flex items-center justify-center rounded hover:bg-accent">
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>
      <div className="flex items-center">
        <button type="button" onClick={() => stepYear(-1)} onPointerDown={(e) => e.stopPropagation()} className="h-6 w-6 flex items-center justify-center rounded hover:bg-accent">
          <ChevronLeft className="h-3 w-3" />
        </button>
        <Select
          value={displayMonth.getFullYear().toString()}
          onValueChange={handleYearSelect}
        >
          <SelectTrigger
            className="h-7 w-auto text-sm font-medium border-none shadow-none focus:ring-0 px-1 [&>svg]:hidden"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <SelectValue>{displayMonth.getFullYear()}</SelectValue>
          </SelectTrigger>
          <SelectContent className="bg-popover max-h-[200px]">
            {years.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <button type="button" onClick={() => stepYear(1)} onPointerDown={(e) => e.stopPropagation()} className="h-6 w-6 flex items-center justify-center rounded hover:bg-accent">
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

// Caption wrapper function - this is a stable function reference
// It reads current props from context, so it re-renders with new values but doesn't remount
function StableCaption({ displayMonth }: { displayMonth: Date }): React.ReactElement {
  return <CalendarCaptionInner displayMonth={displayMonth} />;
}

// Static components object - defined at module level so it NEVER changes
// This is the key fix: DayPicker won't remount Caption because this object reference is stable
const STATIC_COMPONENTS = {
  IconLeft: (): React.ReactElement => <ChevronLeft className="h-4 w-4" />,
  IconRight: (): React.ReactElement => <ChevronRight className="h-4 w-4" />,
  Caption: StableCaption,
};

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  selected,
  month,
  onMonthChange,
  onDropdownSelect,
  ...props
}: CalendarProps) {
  const [internalMonth, setInternalMonth] = React.useState<Date>(month || new Date());

  React.useEffect(() => {
    if (month) {
      setInternalMonth(month);
    }
  }, [month]);

  const handleMonthChange = React.useCallback((newMonth: Date) => {
    setInternalMonth(newMonth);
    onMonthChange?.(newMonth);
  }, [onMonthChange]);

  const selectedDate = selected instanceof Date ? selected : undefined;
  
  // Context value passes current props to CalendarCaption
  // When this changes, Caption re-renders (good) but doesn't remount (key fix)
  const captionContextValue = React.useMemo<CalendarCaptionContextValue>(() => ({
    onMonthChange: handleMonthChange,
    selectedDate,
    onDateSelect: onDropdownSelect,
  }), [handleMonthChange, selectedDate, onDropdownSelect]);

  return (
    <CalendarCaptionContext.Provider value={captionContextValue}>
      <DayPicker
        showOutsideDays={showOutsideDays}
        selected={selectedDate}
        month={internalMonth}
        onMonthChange={handleMonthChange}
        className={cn("p-3", className)}
        classNames={{
          months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
          month: "space-y-4",
          caption: "flex justify-center pt-1 relative items-center",
          caption_label: "hidden",
          nav: "hidden",
          nav_button: "hidden",
          nav_button_previous: "hidden",
          nav_button_next: "hidden",
          table: "w-full border-collapse space-y-1",
          head_row: "flex",
          head_cell:
            "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
          row: "flex w-full mt-2",
          cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
          day: cn(
            buttonVariants({ variant: "ghost" }),
            "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
          ),
          day_range_end: "day-range-end",
          day_selected:
            "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
          day_today: "bg-accent text-accent-foreground",
          day_outside:
            "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
          day_disabled: "text-muted-foreground opacity-50",
          day_range_middle:
            "aria-selected:bg-accent aria-selected:text-accent-foreground",
          day_hidden: "invisible",
          ...classNames,
        }}
        components={STATIC_COMPONENTS}
        {...props}
      />
    </CalendarCaptionContext.Provider>
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
