
import React from 'react';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

interface MetricsManagementToolbarProps {
  selectedMetrics: string[];
  onBulkDelete: () => void;
  onClearSelection: () => void;
}

export const MetricsManagementToolbar: React.FC<MetricsManagementToolbarProps> = ({
  selectedMetrics,
  onBulkDelete,
  onClearSelection
}) => {
  if (selectedMetrics.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-between p-3 bg-primary/10 border border-primary/20 rounded-lg">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-primary">
          {selectedMetrics.length} metric{selectedMetrics.length === 1 ? '' : 's'} selected
        </span>
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onClearSelection}
        >
          Clear Selection
        </Button>
        
        <Button
          variant="destructive"
          size="sm"
          onClick={onBulkDelete}
          className="flex items-center gap-1"
        >
          <Trash2 className="h-4 w-4" />
          Delete Selected
        </Button>
      </div>
    </div>
  );
};
