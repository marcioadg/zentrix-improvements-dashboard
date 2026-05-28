
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { AlertTriangle } from 'lucide-react';
import { useMetricsPermissions } from '@/hooks/useMetricsPermissions';
import { useMetricIssueCreation } from '@/hooks/useMetricIssueCreation';
import { WeeklyMetricWithOwner } from '@/types/weeklyMetrics';
import { logger } from '@/lib/logger';

interface PermissionAwareMetricCellProps {
  metric: WeeklyMetricWithOwner;
  weekStart: string;
  value: number | null;
  onUpdate: (metricId: string, weekStart: string, value: number | null) => void;
  formatValue: (value: number | null, unit: string) => string;
  getValueColor: (value: number | null, metric: any, weekStart?: string) => string;
  isHighlighted?: boolean;
  onCreateIssue?: (title: string, description: string) => void;
  // Optional shared editing state from parent (for proper coordination)
  editingCell?: string | null;
  editValue?: string;
  onCellEdit?: (metricId: string, weekStart: string, currentValue: number | null) => void;
  onCellSave?: (metricId: string, weekStart: string) => void;
  onCellCancel?: () => void;
  onEditValueChange?: (value: string) => void;
}

export const PermissionAwareMetricCell: React.FC<PermissionAwareMetricCellProps> = ({
  metric,
  weekStart,
  value,
  onUpdate,
  formatValue,
  getValueColor,
  isHighlighted = false,
  onCreateIssue,
  editingCell: parentEditingCell,
  editValue: parentEditValue,
  onCellEdit: parentOnCellEdit,
  onCellSave: parentOnCellSave,
  onCellCancel: parentOnCellCancel,
  onEditValueChange: parentOnEditValueChange
}) => {
  // Local state for backward compatibility when parent state not provided
  const [localEditingCell, setLocalEditingCell] = useState<string | null>(null);
  const [localEditValue, setLocalEditValue] = useState('');
  
  const { canEditMetricValue } = useMetricsPermissions(metric.team_id);
  const { isMetricOffTrack, createIssueFromMetric } = useMetricIssueCreation();

  const cellKey = `${metric.id}-${weekStart}`;
  const canEdit = canEditMetricValue(metric);
  const isOffTrack = isMetricOffTrack(metric, weekStart);
  
  // Use parent state if provided, otherwise use local state
  const editingCell = parentEditingCell !== undefined ? parentEditingCell : localEditingCell;
  const editValue = parentEditValue !== undefined ? parentEditValue : localEditValue;
  const isEditing = editingCell === cellKey;

  logger.debug('🔍 PermissionAwareMetricCell:', {
    metricName: metric.metric_name,
    weekStart,
    canEdit,
    isEditing: editingCell === cellKey
  });

  // Local handlers for backward compatibility
  const handleLocalCellEdit = (currentValue: number | null) => {
    logger.debug('🔍 PermissionAwareMetricCell - LOCAL EDIT:', {
      metricName: metric.metric_name,
      currentValue,
      cellKey
    });
    
    setLocalEditingCell(cellKey);
    setLocalEditValue(currentValue === null ? '' : currentValue.toString());
  };

  const handleLocalCellSave = async () => {
    const trimmedValue = localEditValue.trim();
    let newValue: number | null;
    
    if (trimmedValue === '') {
      newValue = null;
    } else {
      const parsedValue = parseFloat(trimmedValue);
      if (isNaN(parsedValue)) {
        logger.error('❌ PermissionAwareMetricCell - Invalid value:', trimmedValue);
        return;
      }
      newValue = parsedValue;
    }

    try {
      await onUpdate(metric.id, weekStart, newValue);
      setLocalEditingCell(null);
      setLocalEditValue('');
    } catch (error) {
      logger.error('❌ PermissionAwareMetricCell - UPDATE FAILED:', error);
      setLocalEditingCell(null);
      setLocalEditValue('');
    }
  };

  const handleLocalCellCancel = () => {
    setLocalEditingCell(null);
    setLocalEditValue('');
  };

  const handleClick = () => {
    logger.debug('🔍 PermissionAwareMetricCell - CELL CLICK EVENT:', {
      metricName: metric.metric_name,
      canEdit
    });
    
    if (!canEdit) {
      logger.warn('⚠️ PermissionAwareMetricCell - CLICK IGNORED: no edit permission', metric.metric_name);
      return;
    }
    
    // Use parent handler if provided, otherwise use local handler
    if (parentOnCellEdit) {
      parentOnCellEdit(metric.id, weekStart, value);
    } else {
      handleLocalCellEdit(value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (parentOnCellSave) {
        parentOnCellSave(metric.id, weekStart);
      } else {
        handleLocalCellSave();
      }
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      if (parentOnCellCancel) {
        parentOnCellCancel();
      } else {
        handleLocalCellCancel();
      }
    }
  };

  const handleEditValueChange = (newValue: string) => {
    if (parentOnEditValueChange) {
      parentOnEditValueChange(newValue);
    } else {
      setLocalEditValue(newValue);
    }
  };

  const handleCreateIssue = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent cell edit from triggering
    createIssueFromMetric(metric, weekStart, onCreateIssue);
  };

  return (
    <div 
      className={`text-center ${isHighlighted ? 'bg-muted' : ''}`}
    >
      {isEditing ? (
        <Input
          value={editValue}
          onChange={(e) => handleEditValueChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-8 w-16 mx-auto"
          type="number"
          inputMode="decimal"
          step="any"
          autoComplete="off"
          autoFocus
        />
      ) : (
        <div
          className={`
            ${canEdit ? 'cursor-pointer hover:bg-muted/50 border-2 border-transparent hover:border-primary/20' : ''}
            px-2 py-1 rounded min-h-[2rem] flex items-center justify-center transition-all duration-200 relative
            ${getValueColor(value, metric, weekStart)}
          `}
          onClick={handleClick}
          title={canEdit ? `Click to edit ${metric.metric_name}` : undefined}
        >
          {formatValue(value, metric.unit)}
          {isOffTrack && onCreateIssue && (
            <div
              className="absolute top-0 right-0 cursor-pointer hover:text-destructive transform translate-x-1 -translate-y-1"
              onClick={handleCreateIssue}
              title="Create issue for off-track metric"
            >
              <AlertTriangle className="h-3 w-3 text-muted-foreground" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
