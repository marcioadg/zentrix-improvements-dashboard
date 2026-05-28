
export const filterMetrics = (metrics: any[], searchText: string) => {
  return metrics.filter(metric =>
    metric.metric_name.toLowerCase().includes(searchText.toLowerCase()) ||
    metric.owner.toLowerCase().includes(searchText.toLowerCase())
  );
};

export const formatCellKey = (metricId: string, weekStart: string) => {
  return `${metricId}-${weekStart}`;
};

export const clearTransientState = (
  setEditingCell: (cell: string | null) => void,
  setEditValue: (value: string) => void,
  setSelectedMetrics: (metrics: string[]) => void
) => {
  setEditingCell(null);
  setEditValue('');
  setSelectedMetrics([]);
};
