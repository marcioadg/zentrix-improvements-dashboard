
import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Info } from 'lucide-react';
import { DependentMetric } from '@/services/metricDependencyService';

interface MetricDeleteConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metric: any;
  currentTeamName: string;
  onDeleteFromTeam: () => void;
  onDeleteFromAllTeams: () => void;
  isDeleting: boolean;
  // New props for formula dependency warning
  dependentMetrics?: DependentMetric[];
  isBulkDelete?: boolean;
  bulkCount?: number;
}

export const MetricDeleteConfirmationDialog: React.FC<MetricDeleteConfirmationDialogProps> = ({
  open,
  onOpenChange,
  metric,
  currentTeamName,
  onDeleteFromTeam,
  onDeleteFromAllTeams,
  isDeleting,
  dependentMetrics = [],
  isBulkDelete = false,
  bulkCount = 0,
}) => {
  const hasDependencies = dependentMetrics.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 [color:var(--destructive)]">
            <AlertTriangle className="h-5 w-5" />
            {isBulkDelete ? `Delete ${bulkCount} Metrics` : 'Delete Metric'}
          </DialogTitle>
          <DialogDescription>
            {isBulkDelete 
              ? `Choose how you want to delete ${bulkCount} selected metrics`
              : `Choose how you want to delete the metric "${metric?.metric_name}"`
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* Formula Dependency Warning */}
          {hasDependencies && (
            <div className="border p-3 rounded-md [border-color:color-mix(in_srgb,var(--warning)_40%,transparent)] [background:color-mix(in_srgb,var(--warning)_8%,transparent)]">
              <div className="flex items-start gap-2">
                <Info className="h-5 w-5 flex-shrink-0 mt-0.5 [color:var(--warning)]" />
                <div>
                  <h4 className="font-medium mb-1 [color:var(--warning)]">
                    ⚠️ Used in {dependentMetrics.length} Formula{dependentMetrics.length !== 1 ? 's' : ''}
                  </h4>
                  <p className="text-sm mb-2 [color:color-mix(in_srgb,var(--warning)_80%,var(--foreground))]">
                    {isBulkDelete 
                      ? 'One or more selected metrics are used in formulas. Deleting will cause these formulas to break:'
                      : 'This metric is used in the following formulas. Deleting it will cause them to break:'
                    }
                  </p>
                  <ul className="text-sm space-y-1 max-h-24 overflow-y-auto [color:color-mix(in_srgb,var(--warning)_80%,var(--foreground))]">
                    {dependentMetrics.map((dep) => (
                      <li key={dep.metric_id} className="flex items-center gap-1">
                        <span className="font-medium">{dep.metric_name}</span>
                        <span className="[color:var(--warning)]">({dep.owner_name} - {dep.team_name})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Metric Details - only show for single delete */}
          {!isBulkDelete && (
            <div className="bg-muted p-3 rounded-md">
              <p className="text-sm font-medium">Metric Details:</p>
              <p className="text-sm text-muted-foreground break-words">Name: {metric?.metric_name}</p>
              <p className="text-sm text-muted-foreground break-words">Owner: {metric?.owner}</p>
              <p className="text-sm text-muted-foreground break-words">Current Team: {currentTeamName}</p>
            </div>
          )}

          <div className="space-y-3">
            <div className="border p-3 rounded-md [border-color:color-mix(in_srgb,var(--warning)_30%,transparent)] [background:color-mix(in_srgb,var(--warning)_8%,transparent)]">
              <h4 className="font-medium mb-2 [color:var(--warning)]">Delete from Current Team Only</h4>
              <p className="text-sm [color:color-mix(in_srgb,var(--warning)_80%,var(--foreground))]">
                {isBulkDelete
                  ? `This will remove the metrics only from "${currentTeamName}". The metrics will remain available in other teams where they exist.`
                  : `This will remove the metric only from "${currentTeamName}". The metric will remain available in other teams where it exists.`
                }
              </p>
            </div>

            <div className="border p-3 rounded-md [border-color:color-mix(in_srgb,var(--destructive)_30%,transparent)] [background:color-mix(in_srgb,var(--destructive)_8%,transparent)]">
              <h4 className="font-medium mb-2 [color:var(--destructive)]">Delete from All Teams</h4>
              <p className="text-sm [color:color-mix(in_srgb,var(--destructive)_80%,var(--foreground))]">
                {isBulkDelete
                  ? 'This will permanently remove the metrics from all teams. All historical data for these metrics will be archived.'
                  : 'This will permanently remove the metric from all teams. All historical data for this metric will be archived.'
                }
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
            className="border border-border text-sm px-3 py-1.5 hover:bg-muted"
          >
            Cancel
          </Button>
          <Button 
            variant="outline" 
            onClick={onDeleteFromTeam}
            disabled={isDeleting}
            className="[border-color:var(--warning)] [color:var(--warning)] [&:hover]:bg-[color-mix(in_srgb,var(--warning)_8%,transparent)]"
          >
            {isDeleting ? 'Deleting...' : 'Delete from Team Only'}
          </Button>
          <Button 
            variant="destructive" 
            onClick={onDeleteFromAllTeams}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete from All Teams'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
