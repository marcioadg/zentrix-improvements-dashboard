/**
 * MobileAnalyticsFilterSheet — bottom sheet with Team / Timeframe / Frequency
 * radio groups and a primary Apply button.
 *
 * Controlled component: parent owns open state + the current filter values.
 * On Apply, the sheet calls onApply with the new values and the parent closes
 * the sheet via onOpenChange(false).
 */
import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * AnalyticsTimeframe / AnalyticsFrequency mirror the desktop useAnalyticsData
 * hook signature exactly — these values flow through to the hook unchanged.
 * Keeping them aligned means we don't need a mapping layer between the mobile
 * filter sheet and the data layer.
 */
export type AnalyticsTimeframe = '4weeks' | '3months' | '6months' | '1year' | '2years' | 'alltime';
export type AnalyticsFrequency = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface TeamOption {
  /** Stable team id. Use "all" for the "All teams" sentinel. */
  id: string;
  label: string;
}

export const TIMEFRAME_OPTIONS: Array<{ id: AnalyticsTimeframe; label: string }> = [
  { id: '4weeks', label: 'Last 4 weeks' },
  { id: '3months', label: 'Last 3 months' },
  { id: '6months', label: 'Last 6 months' },
  { id: '1year', label: 'Last year' },
  { id: '2years', label: 'Last 2 years' },
  { id: 'alltime', label: 'All time' },
];

export const FREQUENCY_OPTIONS: Array<{ id: AnalyticsFrequency; label: string }> = [
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'quarterly', label: 'Quarterly' },
  { id: 'yearly', label: 'Yearly' },
];

export interface AnalyticsFilterValues {
  teamId: string;
  timeframe: AnalyticsTimeframe;
  frequency: AnalyticsFrequency;
}

interface MobileAnalyticsFilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** All available teams for selection. "All teams" should be first. */
  teams: TeamOption[];
  /** Current values shown when the sheet opens. */
  values: AnalyticsFilterValues;
  onApply: (next: AnalyticsFilterValues) => void;
}

interface RadioRowProps<T extends string> {
  options: Array<{ id: T; label: string }>;
  selected: T;
  onSelect: (id: T) => void;
}

function RadioRow<T extends string>({ options, selected, onSelect }: RadioRowProps<T>) {
  return (
    <div className="flex flex-col gap-1">
      {options.map((opt) => {
        const active = opt.id === selected;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onSelect(opt.id)}
            className={cn(
              'w-full flex items-center justify-between gap-2 px-3 py-3 rounded-[10px] text-left transition-colors',
              active ? 'bg-primary/10 text-primary' : 'text-foreground active:bg-muted/60',
            )}
          >
            <span className="text-[14px] font-medium">{opt.label}</span>
            {active && <Check className="h-4 w-4" />}
          </button>
        );
      })}
    </div>
  );
}

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">
    {children}
  </div>
);

export const MobileAnalyticsFilterSheet: React.FC<MobileAnalyticsFilterSheetProps> = ({
  open,
  onOpenChange,
  teams,
  values,
  onApply,
}) => {
  // Local draft state — reset whenever the sheet (re-)opens.
  const [draft, setDraft] = useState<AnalyticsFilterValues>(values);
  useEffect(() => {
    if (open) setDraft(values);
  }, [open, values]);

  const handleApply = () => {
    onApply(draft);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="z-[101] rounded-t-[22px] max-h-[85vh] p-5 pb-[max(env(safe-area-inset-bottom,16px),20px)] overflow-y-auto"
      >
        <SheetHeader className="text-left mb-3">
          <SheetTitle className="text-[17px] font-bold tracking-[-0.01em]">
            Filters
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-5">
          <div>
            <SectionLabel>Team</SectionLabel>
            <RadioRow
              options={teams.map((t) => ({ id: t.id, label: t.label }))}
              selected={draft.teamId}
              onSelect={(id) => setDraft((d) => ({ ...d, teamId: id }))}
            />
          </div>

          <div>
            <SectionLabel>Timeframe</SectionLabel>
            <RadioRow<AnalyticsTimeframe>
              options={TIMEFRAME_OPTIONS}
              selected={draft.timeframe}
              onSelect={(id) => setDraft((d) => ({ ...d, timeframe: id }))}
            />
          </div>

          <div>
            <SectionLabel>Frequency</SectionLabel>
            <RadioRow<AnalyticsFrequency>
              options={FREQUENCY_OPTIONS}
              selected={draft.frequency}
              onSelect={(id) => setDraft((d) => ({ ...d, frequency: id }))}
            />
          </div>
        </div>

        <Button
          type="button"
          onClick={handleApply}
          className="w-full mt-5 h-11 text-[14px] font-semibold"
        >
          Apply
        </Button>
      </SheetContent>
    </Sheet>
  );
};

export default MobileAnalyticsFilterSheet;
