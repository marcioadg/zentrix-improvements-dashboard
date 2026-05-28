
import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useMetricIssueCreation } from '@/hooks/useMetricIssueCreation';
import { MetricValueNoteButton } from '@/components/metrics/MetricValueNoteButton';
import { MetricCustomTargetButton } from '@/components/metrics/MetricCustomTargetButton';

interface MetricWeekCellProps {
  weekStart: string;
  metric: any;
  editingCell: string | null;
  editValue: string;
  highlightedWeek: string | null;
  formatValue: (value: number | null, unit: string) => string;
  getValueColor: (value: number | null, metric: any, weekStart?: string) => string;
  onCellEdit: (metricId: string, weekStart: string, currentValue: number | null) => void;
  onCellSave: (metricId: string, weekStart: string) => void;
  onCellCancel: () => void;
  onEditValueChange: (value: string) => void;
  onCreateIssue?: (title: string, description: string) => void;
}

export const MetricWeekCell: React.FC<MetricWeekCellProps> = ({
  weekStart,
  metric,
  editingCell,
  editValue,
  highlightedWeek,
  formatValue,
  getValueColor,
  onCellEdit,
  onCellSave,
  onCellCancel,
  onEditValueChange,
  onCreateIssue,
}) => {
  const { isMetricOffTrack, createIssueFromMetric } = useMetricIssueCreation();
  
  const cellKey = `${metric.id}-${weekStart}`;
  const value = metric.weeklyValues?.[weekStart] ?? null;
  const isEditing = editingCell === cellKey;
  const isOffTrack = isMetricOffTrack(metric, weekStart);

  const handleDoubleClick = () => {
    onCellEdit(metric.id, weekStart, value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onCellSave(metric.id, weekStart);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCellCancel();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onEditValueChange(e.target.value);
  };

  const handleCellKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onCellEdit(metric.id, weekStart, value);
    }
  };

  const handleCreateIssue = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    createIssueFromMetric(metric, weekStart, onCreateIssue);
  };

  return (
    <td 
      key={weekStart} 
      className={`text-center w-32 py-1.5 px-1 ${
        highlightedWeek === weekStart ? 'bg-muted/20' : ''
      }`}
    >
      {isEditing ? (
        <div className="flex justify-center">
          <input
            value={editValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className="h-8 w-24 text-sm border border-border/40 rounded-sm px-2 text-center focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40"
            type="number"
            inputMode="decimal"
            step="any"
            placeholder="Enter value"
            autoComplete="off"
            autoFocus
          />
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          aria-label={`Edit ${metric.name} value for week of ${weekStart}`}
          className={`group/cell cursor-pointer font-medium hover:bg-muted/30 focus-visible:bg-muted/30 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary/40 outline-none px-2 py-1 rounded-sm min-h-[1.5rem] flex items-center justify-center text-sm transition-colors border border-transparent hover:border-border/40 relative ${getValueColor(value, metric, weekStart)}`}
          onDoubleClick={handleDoubleClick}
          onKeyDown={handleCellKeyDown}
        >
          {formatValue(value, metric.unit)}
          {isOffTrack && onCreateIssue && (
            <button
              type="button"
              className="absolute top-0 right-0 cursor-pointer hover:text-destructive focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-sm transform translate-x-1 -translate-y-1"
              onClick={handleCreateIssue}
              aria-label="Create issue for off-track metric"
              title="Create issue for off-track metric"
            >
              <AlertTriangle className="h-3 w-3 text-destructive" />
            </button>
          )}
          <div className="absolute top-0 left-0 -translate-x-1 -translate-y-1 transition-opacity duration-200">
            <MetricCustomTargetButton 
              metricId={metric.id} 
              teamId={metric.team_id} 
              weekStart={weekStart}
              defaultTarget={metric.target_value}
              defaultLogic={metric.target_logic}
              metric={metric}
            />
          </div>
          <div className="absolute top-0 right-0 translate-x-1 -translate-y-1 transition-opacity duration-200">
            <MetricValueNoteButton 
              metricId={metric.id}
              teamId={metric.team_id}
              weekStart={weekStart}
              metric={metric}
            />
          </div>
        </div>
      )}
    </td>
  );
};
