
import React, { useRef, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';

interface TableHeaderProps {
  managementMode: boolean;
  weekStarts: string[];
  formatWeekDate: (weekStart: string) => string;
  highlightedWeek: string | null;
  allSelected: boolean;
  someSelected: boolean;
  onSelectAll: (selected: boolean) => void;
}

export const TableHeader: React.FC<TableHeaderProps> = ({
  managementMode,
  weekStarts,
  formatWeekDate,
  highlightedWeek,
  allSelected,
  someSelected,
  onSelectAll,
}) => {
  const selectAllCheckboxRef = useRef<any>(null);

  const isHighlightedWeek = (weekStart: string) => {
    return highlightedWeek === weekStart;
  };

  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  return (
    <thead className="sticky top-0 bg-background z-20 border-b border-border/40">
      <tr>
        {managementMode && (
          <th 
            className="sticky left-0 bg-background z-30 border-r border-border/30 px-3 py-2.5 text-left align-middle font-medium text-muted-foreground/70"
            style={{ width: '50px', minWidth: '50px' }}
          >
            <Checkbox
              ref={selectAllCheckboxRef}
              checked={allSelected}
              onCheckedChange={onSelectAll}
            />
          </th>
        )}
        {!managementMode && (
          <th 
            className="sticky left-0 bg-background z-30 border-r border-border/30 px-3 py-2.5 text-center align-middle font-medium text-muted-foreground/70"
            style={{ width: '50px', minWidth: '50px' }}
          >
            <span className="text-xs font-normal">Order</span>
          </th>
        )}
        <th 
          className="sticky bg-background z-30 border-r border-border/30 px-3 py-2.5 text-left align-middle font-medium text-muted-foreground/70"
          style={{ 
            width: '350px', 
            minWidth: '350px',
            left: '50px'
          }}
        >
          <span className="text-sm font-normal">Metric Name</span>
        </th>
        <th 
          className="sticky bg-background z-30 border-r border-border/30 px-3 py-2.5 text-center align-middle font-medium text-muted-foreground/70"
          style={{ 
            width: '50px', 
            minWidth: '50px',
            left: '310px'
          }}
        >
          <span className="text-xs font-normal">Chart</span>
        </th>
        <th 
          className="sticky bg-background z-30 border-r border-border/30 px-3 py-2.5 text-center align-middle font-medium text-muted-foreground/70"
          style={{ 
            width: '100px', 
            minWidth: '100px',
            left: '360px'
          }}
        >
          <span className="text-xs font-normal">Owner</span>
        </th>
        <th 
          className="sticky bg-background z-30 border-r border-border/30 px-3 py-2.5 text-center align-middle font-medium text-muted-foreground/70"
          style={{ 
            width: '100px', 
            minWidth: '100px',
            left: '460px'
          }}
        >
          <span className="text-xs font-normal">Actions</span>
        </th>
        <th 
          className="sticky bg-background z-30 border-r border-border/30 px-3 py-2.5 text-center align-middle font-medium text-muted-foreground/70"
          style={{ 
            width: '100px', 
            minWidth: '100px',
            left: '560px'
          }}
        >
          <span className="text-xs font-normal">Target</span>
        </th>
        {weekStarts.map((weekStart) => (
          <th 
            key={weekStart} 
            className={`px-3 py-2.5 text-center align-middle font-medium text-muted-foreground/70 border-r border-border/30 ${
              isHighlightedWeek(weekStart) ? 'bg-muted/20' : ''
            }`}
            style={{ width: '140px', minWidth: '140px' }}
          >
            <div className="whitespace-nowrap text-xs font-normal">
              {formatWeekDate(weekStart)}
            </div>
          </th>
        ))}
      </tr>
    </thead>
  );
};
