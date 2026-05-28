
export const METRIC_UNIT_OPTIONS = [
  { value: 'Number', label: 'Number' },
  { value: 'Percentage', label: 'Percentage (%)' },
  { value: 'Currency', label: 'Currency ($)' },
  { value: 'Time', label: 'Time' },
  { value: 'Yes/No', label: 'Yes/No' }
] as const;

export const DEFAULT_METRIC_UNIT = 'Number';

// Helper to get display label for a unit
export const getUnitDisplayLabel = (unit: string): string => {
  const option = METRIC_UNIT_OPTIONS.find(opt => opt.value.toLowerCase() === unit.toLowerCase());
  return option?.label || unit;
};
