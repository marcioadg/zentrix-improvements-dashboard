
import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { TooltipProvider } from '@/components/ui/tooltip';
import { MetricNameCell } from './MetricNameCell';
import { MetricChartCell } from './MetricChartCell';
import { MetricOwnerCell } from './MetricOwnerCell';
import { MetricActionsCell } from './MetricActionsCell';
import { MetricTargetCell } from './MetricTargetCell';
import { MetricWeekCell } from './MetricWeekCell';

interface MetricRowProps {
  metric: any;
  weekStarts: string[];
  editingCell: string | null;
  editValue: string;
  onCellEdit: (metricId: string, weekStart: string, currentValue: number | null) => void;
  onCellSave: (metricId: string, weekStart: string) => void;
  onCellCancel: () => void;
  onEditValueChange: (value: string) => void;
  onMetricConfiguration: (metric: any) => void;
  formatValue: (value: number | null, unit: string) => string;
  formatWeekDate: (weekStart: string) => string;
  getValueColor: (value: number | null, metric: any, weekStart?: string) => string;
  getOwnerInitials: (fullName: string) => string;
  selectedTeam?: string;
  showCurrentWeek: boolean;
  highlightCurrentWeek: boolean;
  weekStartDay: 'monday' | 'sunday';
  highlightedWeek: string | null;
  managementMode: boolean;
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
  onDelete: () => void;
  periodMapping?: { [periodLabel: string]: string[] };
}

export const MetricRow: React.FC<MetricRowProps> = ({
  metric,
  weekStarts,
  editingCell,
  editValue,
  onCellEdit,
  onCellSave,
  onCellCancel,
  onEditValueChange,
  onMetricConfiguration,
  formatValue,
  formatWeekDate,
  getValueColor,
  getOwnerInitials,
  selectedTeam,
  highlightedWeek,
  weekStartDay,
  managementMode,
  isSelected,
  onSelect,
  onDelete,
  periodMapping,
}) => {
  const getMostRecentWeekValue = () => {
    // Filter out future weeks and only consider past/current weeks with actual data
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const pastWeeks = weekStarts.filter(weekStart => {
      const weekDate = new Date(weekStart);
      weekDate.setHours(0, 0, 0, 0);
      return weekDate <= today;
    });
    
    // Get most recent past week (weekStarts is ordered newest to oldest)
    // ✅ SAFETY: Use optional chaining to handle undefined weeklyValues (newly created metrics)
    for (let i = 0; i < pastWeeks.length; i++) {
      const weekStart = pastWeeks[i];
      const value = metric.weeklyValues?.[weekStart] ?? null;
      if (value !== null && value !== undefined) {
        return { weekStart, value };
      }
    }
    
    return { weekStart: pastWeeks[0] || null, value: null };
  };

  const { weekStart: mostRecentWeek, value: recentValue } = getMostRecentWeekValue();
  const valueColor = getValueColor(recentValue, metric, mostRecentWeek);

  return (
    <TooltipProvider>
      <tr className={`border-b border-border/20 hover:bg-muted/10 transition-colors ${isSelected ? 'bg-muted/20' : ''}`}>
        {managementMode && (
          <td 
            className="sticky left-0 bg-background z-10 border-r border-border/30 py-2 px-3"
            style={{ width: '50px', minWidth: '50px' }}
          >
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelect}
            />
          </td>
        )}
        
        {!managementMode && (
          <td 
            className="sticky left-0 bg-background z-10 border-r border-border/30 py-2 px-3 text-center"
            style={{ width: '50px', minWidth: '50px' }}
          >
            <span className="text-xs text-muted-foreground">{metric.display_order || '-'}</span>
          </td>
        )}
        
        <td 
          className="sticky bg-background z-10 border-r border-border/30 py-2 px-3"
          style={{ 
            width: '350px', 
            minWidth: '350px',
            left: '50px'
          }}
        >
          <MetricNameCell
            metric={metric}
            onMetricConfiguration={onMetricConfiguration}
          />
        </td>
        
        <td 
          className="sticky bg-background z-10 border-r border-border/30 py-2 px-2 text-center"
          style={{ 
            width: '50px', 
            minWidth: '50px',
            left: '310px'
          }}
        >
          <MetricChartCell
            metric={metric}
            weekStarts={weekStarts}
            periodMapping={periodMapping}
          />
        </td>
        
        <td 
          className="sticky bg-background z-10 border-r border-border/30 py-2 px-3"
          style={{ 
            width: '100px', 
            minWidth: '100px',
            left: '360px'
          }}
        >
          <MetricOwnerCell
            metric={metric}
            getOwnerInitials={getOwnerInitials}
          />
        </td>
        
        <td 
          className="sticky bg-background z-10 border-r border-border/30 py-2 px-3"
          style={{ 
            width: '100px', 
            minWidth: '100px',
            left: '460px'
          }}
        >
          <MetricActionsCell
            managementMode={managementMode}
            metric={metric}
            recentValue={recentValue}
            valueColor={valueColor}
            selectedTeam={selectedTeam}
            weekStarts={weekStarts}
            onDelete={onDelete}
          />
        </td>
        
        <td 
          className="sticky bg-background z-10 border-r border-border/30 py-2 px-3"
          style={{ 
            width: '100px', 
            minWidth: '100px',
            left: '560px'
          }}
        >
          <MetricTargetCell
            metric={metric}
            formatValue={formatValue}
            weekStarts={weekStarts}
            selectedTeam={selectedTeam}
            managementMode={managementMode}
            formatWeekDate={formatWeekDate}
          />
        </td>
        
        {weekStarts.map((weekStart) => (
          <MetricWeekCell
            key={weekStart}
            weekStart={weekStart}
            metric={metric}
            editingCell={editingCell}
            editValue={editValue}
            highlightedWeek={highlightedWeek}
            formatValue={formatValue}
            getValueColor={getValueColor}
            onCellEdit={onCellEdit}
            onCellSave={onCellSave}
            onCellCancel={onCellCancel}
            onEditValueChange={onEditValueChange}
          />
        ))}
      </tr>
    </TooltipProvider>
  );
};
