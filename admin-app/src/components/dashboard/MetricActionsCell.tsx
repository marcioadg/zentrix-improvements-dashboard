
import React from 'react';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { MetricActions } from './MetricActions';

interface MetricActionsCellProps {
  managementMode: boolean;
  metric: any;
  recentValue: number | null;
  valueColor: string;
  selectedTeam?: string;
  weekStarts?: string[];
  onDelete: () => void;
}

export const MetricActionsCell: React.FC<MetricActionsCellProps> = ({
  managementMode,
  metric,
  recentValue,
  valueColor,
  selectedTeam,
  weekStarts = [],
  onDelete,
}) => {
  return (
    <div className="flex justify-center">
      {managementMode ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="h-8 w-8 p-0 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
          title="Delete metric"
          aria-label="Delete metric"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ) : (
        <MetricActions
          metric={{
            ...metric,
            owner_id: metric.owner_id
          }}
          currentValue={recentValue}
          onCreateIssue={() => {}}
          valueColor={valueColor}
          selectedTeam={selectedTeam}
        />
      )}
    </div>
  );
};
