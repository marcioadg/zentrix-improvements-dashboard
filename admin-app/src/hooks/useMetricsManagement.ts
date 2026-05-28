
import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export const useMetricsManagement = (
  selectedMetrics: string[],
  setSelectedMetrics: (metrics: string[]) => void,
  editingCell: string | null,
  setEditingCell: (cell: string | null) => void,
  setEditValue: (value: string) => void,
  removeMetric: (metricId: string) => Promise<void>,
  bulkRemoveMetrics: (metricIds: string[]) => Promise<void>,
  metrics: any[]
) => {
  const { toast } = useToast();

  const handleMetricSelect = useCallback((metricId: string, selected: boolean) => {
    if (selected) {
      setSelectedMetrics([...selectedMetrics, metricId]);
    } else {
      setSelectedMetrics(selectedMetrics.filter(id => id !== metricId));
    }
  }, [selectedMetrics, setSelectedMetrics]);

  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected) {
      setSelectedMetrics(metrics.map(m => m.id));
    } else {
      setSelectedMetrics([]);
    }
  }, [metrics, setSelectedMetrics]);

  const handleDeleteMetric = useCallback(async (metric: any) => {
    // Clear editing state if we're deleting the metric being edited
    if (editingCell?.startsWith(metric.id)) {
      setEditingCell(null);
      setEditValue('');
    }
    
    // Remove from selected metrics if it was selected
    setSelectedMetrics(selectedMetrics.filter(id => id !== metric.id));
    
    // Call the optimistic delete function (no need to await since it's optimistic)
    await removeMetric(metric.id);
  }, [editingCell, setEditingCell, setEditValue, selectedMetrics, setSelectedMetrics, removeMetric]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedMetrics.length === 0) return;
    
    // Clear editing state if we're deleting the metric being edited
    const editingMetricId = editingCell?.split('-')[0];
    if (editingMetricId && selectedMetrics.includes(editingMetricId)) {
      setEditingCell(null);
      setEditValue('');
    }
    
    // Call the optimistic bulk delete function (no need to await since it's optimistic)
    await bulkRemoveMetrics(selectedMetrics);
    
    // Clear selected metrics (this will happen automatically via optimistic update, but let's be explicit)
    setSelectedMetrics([]);
  }, [selectedMetrics, editingCell, setEditingCell, setEditValue, bulkRemoveMetrics, setSelectedMetrics]);

  return {
    handleMetricSelect,
    handleSelectAll,
    handleDeleteMetric,
    handleBulkDelete,
  };
};
