
export const formatUnit = (unit: string): string => {
  if (!unit) return '';
  
  const unitMap: Record<string, string> = {
    'percentage': '%',
    'currency': '$',
    'number': '#',
    'time': 'time',
    'yes/no': 'Y/N'
  };

  const lowerUnit = unit.toLowerCase().trim();
  return unitMap[lowerUnit] || unit;
};
