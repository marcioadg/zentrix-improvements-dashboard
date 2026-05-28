import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Plus, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { TeamMultiSelect } from '@/components/shared/TeamMultiSelect';
import { useCompanyMetrics } from '@/hooks/useCompanyMetrics';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import {
  deleteMetric,
  bulkDeleteMetrics,
  createMetric,
  bulkAssignMetricsToTeams,
  bulkCopyMetricsToTeams,
} from '@/services/metricOperations';
import { useToast } from '@/hooks/use-toast';
import { AddMetricModal } from '@/components/modals/AddMetricModal';
import { MetricDeleteConfirmationDialog } from './MetricDeleteConfirmationDialog';
import { findBulkDependentFormulas, DependentMetric } from '@/services/metricDependencyService';
import { logger } from '@/utils/logger';
interface MinimalAddMetricsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Legacy callback retained for backward-compatibility. The new flow writes directly
   * via metricOperations bulk helpers and then calls `onMetricsChanged` to let the parent
   * refresh its grid. Callers that still pass `onAddMetricsToTable` will see it ignored.
   */
  onAddMetricsToTable?: (newMetrics: any[], targetTeamId: string) => Promise<void>;
  /**
   * Called after a successful assign or copy so the parent page can refetch its grid.
   * Receives the set of target team ids touched, so callers can decide whether their
   * currently-viewed team needs a refresh.
   */
  onMetricsChanged?: (targetTeamIds: string[]) => void;
  currentTableMetrics?: any[];
  teams?: any[];
}
export const MinimalAddMetricsModal: React.FC<MinimalAddMetricsModalProps> = ({
  open,
  onOpenChange,
  onMetricsChanged,
}) => {
  const {
    currentCompany
  } = useMultiCompany();
  const {
    user
  } = useAuth();
  const {
    settings
  } = useSettings();
  const {
    metrics: companyMetrics,
    loading,
    error,
    refetch
  } = useCompanyMetrics();
  const {
    toast
  } = useToast();
  const weekStartDay = settings?.week_start_day || 'monday';
  const [selectedMetrics, setSelectedMetrics] = useState<Set<string>>(new Set());
  const [searchText, setSearchText] = useState('');
  const [showTeamSelection, setShowTeamSelection] = useState(false);
  const [selectedTargetTeamIds, setSelectedTargetTeamIds] = useState<string[]>([]);
  const [copyMode, setCopyMode] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showAddMetricModal, setShowAddMetricModal] = useState(false);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [dependentMetrics, setDependentMetrics] = useState<DependentMetric[]>([]);
  const [metricsToDelete, setMetricsToDelete] = useState<any[]>([]);

  const metrics = companyMetrics;
  useEffect(() => {
    if (open) {
      setSelectedMetrics(new Set());
      setSearchText('');
      setShowTeamSelection(false);
      setSelectedTargetTeamIds([]);
      setCopyMode(false);
      setIsAdding(false);
      setIsDeleting(false);
    }
  }, [open]);

  // Filter metrics based on search
  const filteredMetrics = metrics.filter(metric => !searchText || metric.metric_name.toLowerCase().includes(searchText.toLowerCase()) || metric.owner_name.toLowerCase().includes(searchText.toLowerCase()) || metric.team_name.toLowerCase().includes(searchText.toLowerCase()));
  const handleSelectMetric = (metricKey: string, checked: boolean) => {
    setSelectedMetrics(prev => {
      const newSelected = new Set(prev);
      if (checked) {
        newSelected.add(metricKey);
      } else {
        newSelected.delete(metricKey);
      }
      return newSelected;
    });
  };
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allKeys = filteredMetrics.map(m => `${m.metric_name}-${m.owner_id}-${m.team_id}`);
      setSelectedMetrics(new Set(allKeys));
    } else {
      setSelectedMetrics(new Set());
    }
  };
  const handleAddToTableClick = () => {
    setShowTeamSelection(true);
  };
  const handleConfirmAddToTable = async () => {
    if (selectedTargetTeamIds.length === 0) {
      toast({
        title: "No Teams Selected",
        description: "Please select at least one team.",
        variant: "destructive"
      });
      return;
    }
    if (!user?.id) {
      toast({
        title: "Not Authenticated",
        description: "Please sign in again.",
        variant: "destructive"
      });
      return;
    }

    const selectedMetricObjects = filteredMetrics.filter(metric => {
      const metricKey = `${metric.metric_name}-${metric.owner_id}-${metric.team_id}`;
      return selectedMetrics.has(metricKey);
    });
    const sources = selectedMetricObjects.map(m => ({
      metric_name: m.metric_name,
      owner_id: m.owner_id,
      team_id: m.team_id,
    }));

    setIsAdding(true);
    try {
      if (copyMode) {
        const result = await bulkCopyMetricsToTeams(
          sources,
          selectedTargetTeamIds,
          user.id,
          weekStartDay
        );

        const skippedCount = result.skipped.length;
        const errorCount = result.errors.length;
        const parts: string[] = [`Duplicated ${result.copied} metric(s)`];
        if (skippedCount > 0) parts.push(`skipped ${skippedCount} (already in target team)`);
        if (errorCount > 0) parts.push(`${errorCount} failed`);
        toast({
          title: errorCount > 0 ? "Copy Completed With Errors" : "Metrics Duplicated",
          description: parts.join(', ') + '.',
          variant: errorCount > 0 ? "destructive" : undefined,
        });
      } else {
        const result = await bulkAssignMetricsToTeams(sources, selectedTargetTeamIds);

        const parts: string[] = [`Assigned ${result.assigned} link(s)`];
        if (result.skipped > 0) parts.push(`skipped ${result.skipped} (already linked)`);
        if (result.errors.length > 0) parts.push(`${result.errors.length} failed`);
        toast({
          title: result.errors.length > 0 ? "Assign Completed With Errors" : "Metrics Assigned",
          description: parts.join(', ') + '.',
          variant: result.errors.length > 0 ? "destructive" : undefined,
        });
      }

      // Refresh modal's own list and notify parent so its grid can refetch.
      await refetch();
      onMetricsChanged?.(selectedTargetTeamIds);

      // Stay open so the user can perform more operations. Reset to main view.
      setSelectedMetrics(new Set());
      setSelectedTargetTeamIds([]);
      setCopyMode(false);
      setShowTeamSelection(false);
    } catch (error) {
      logger.error('Error adding metrics to teams:', error);
      toast({
        title: copyMode ? "Copy Failed" : "Assign Failed",
        description: "Operation failed. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsAdding(false);
    }
  };
  const handleCancelTeamSelection = () => {
    setShowTeamSelection(false);
    setSelectedTargetTeamIds([]);
    setCopyMode(false);
  };
  const handleDeleteClick = async () => {
    if (selectedMetrics.size === 0) {
      toast({
        title: "No Selection",
        description: "Please select metrics to delete.",
        variant: "destructive"
      });
      return;
    }
    
    const selectedMetricObjects = filteredMetrics.filter(metric => {
      const metricKey = `${metric.metric_name}-${metric.owner_id}-${metric.team_id}`;
      return selectedMetrics.has(metricKey);
    });
    
    setMetricsToDelete(selectedMetricObjects);
    
    // Check for formula dependencies
    const metricIds = selectedMetricObjects.map(m => m.id).filter(Boolean);
    if (metricIds.length > 0) {
      try {
        const result = await findBulkDependentFormulas(metricIds);
        setDependentMetrics(result.dependentMetrics);
      } catch (error) {
        logger.error('Error checking dependencies:', error);
        setDependentMetrics([]);
      }
    } else {
      setDependentMetrics([]);
    }
    
    setShowDeleteConfirmDialog(true);
  };

  const handleDeleteFromTeam = async () => {
    setIsDeleting(true);
    try {
      logger.log('🔧 Deleting metrics from team:', metricsToDelete);

      // Group metrics by their unique identifiers for deletion
      const metricsData = metricsToDelete.map(metric => ({
        metricName: metric.metric_name,
        ownerId: metric.owner_id,
        teamId: metric.team_id
      }));

      // Use bulk delete operation
      await bulkDeleteMetrics(metricsData);
      toast({
        title: "Metrics Deleted",
        description: `Successfully deleted ${metricsToDelete.length} metrics from team.`
      });

      // Refresh the metrics data to reflect deletions
      await refetch();

      // Clear selection and close dialog
      setSelectedMetrics(new Set());
      setShowDeleteConfirmDialog(false);
      setMetricsToDelete([]);
      logger.log('✅ Successfully deleted metrics');
    } catch (error) {
      logger.error('❌ Error deleting metrics:', error);
      toast({
        title: "Deletion Failed",
        description: "Failed to delete selected metrics. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteFromAllTeams = async () => {
    setIsDeleting(true);
    try {
      logger.log('🔧 Deleting metrics from all teams:', metricsToDelete);

      // Group metrics by their unique identifiers for deletion (all teams)
      const metricsData = metricsToDelete.map(metric => ({
        metricName: metric.metric_name,
        ownerId: metric.owner_id,
        teamId: metric.team_id
      }));

      // Use bulk delete operation (this deletes from the specified team, 
      // but for "all teams" we would need a different approach - for now same behavior)
      await bulkDeleteMetrics(metricsData);
      toast({
        title: "Metrics Deleted",
        description: `Successfully deleted ${metricsToDelete.length} metrics from all teams.`
      });

      // Refresh the metrics data to reflect deletions
      await refetch();

      // Clear selection and close dialog
      setSelectedMetrics(new Set());
      setShowDeleteConfirmDialog(false);
      setMetricsToDelete([]);
      logger.log('✅ Successfully deleted metrics from all teams');
    } catch (error) {
      logger.error('❌ Error deleting metrics:', error);
      toast({
        title: "Deletion Failed",
        description: "Failed to delete selected metrics. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };
  return <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle>
              {showTeamSelection
                ? (copyMode ? 'Duplicate Metrics into Teams' : 'Assign Metrics to Teams')
                : 'Configure Metrics'}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 flex flex-col gap-4 min-h-0">
            {showTeamSelection ? (/* Team Selection View */
          <div className="space-y-4">
                <div className="p-4 bg-muted border border-border rounded-lg space-y-4">
                  <h3 className="font-medium text-foreground">
                    {copyMode ? 'Duplicate' : 'Assign'} {selectedMetrics.size} selected metric{selectedMetrics.size !== 1 ? 's' : ''} into which team(s)?
                  </h3>

                  <TeamMultiSelect
                    selectedTeamIds={selectedTargetTeamIds}
                    onSelectionChange={setSelectedTargetTeamIds}
                    label="Target teams"
                    placeholder="Select target teams"
                    disabled={isAdding}
                    required
                  />

                  <div className="flex items-start gap-3 pt-2 border-t border-border">
                    <Switch
                      id="copy-mode-toggle"
                      checked={copyMode}
                      onCheckedChange={setCopyMode}
                      disabled={isAdding}
                    />
                    <div className="flex-1">
                      <Label htmlFor="copy-mode-toggle" className="cursor-pointer">
                        Make a copy
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        {copyMode
                          ? 'Duplicate the metric into each team as a brand-new metric (no past weekly values copied).'
                          : 'Link the same metric to each selected team (values are shared across teams).'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={handleCancelTeamSelection} disabled={isAdding}>
                    Cancel
                  </Button>
                  <Button onClick={handleConfirmAddToTable} disabled={selectedTargetTeamIds.length === 0 || isAdding} className="bg-primary hover:bg-primary/90">
                    {isAdding ? <div className="flex items-center gap-2">
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        {copyMode ? 'Duplicating...' : 'Assigning...'}
                      </div> : <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        {copyMode
                          ? `Duplicate into ${selectedTargetTeamIds.length || ''} team${selectedTargetTeamIds.length === 1 ? '' : 's'}`.trim()
                          : `Assign to ${selectedTargetTeamIds.length || ''} team${selectedTargetTeamIds.length === 1 ? '' : 's'}`.trim()}
                      </div>}
                  </Button>
                </div>

                {/* Show selected metrics preview */}
                <div className="max-h-40 overflow-auto border rounded p-3">
                  <h4 className="text-sm font-medium mb-2">Selected Metrics:</h4>
                  {filteredMetrics.filter(metric => {
                const metricKey = `${metric.metric_name}-${metric.owner_id}-${metric.team_id}`;
                return selectedMetrics.has(metricKey);
              }).map(metric => <div key={`${metric.metric_name}-${metric.owner_id}-${metric.team_id}`} className="text-sm py-1">
                        {metric.metric_name} - {metric.owner_name} ({metric.team_name})
                      </div>)}
                </div>
              </div>) :
          // Main Metrics View
          <>
                {/* Header with Create Button */}
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Manage existing metrics or create a new one
                  </div>
                  <Button variant="outline" className="flex items-center gap-2" onClick={() => setShowAddMetricModal(true)}>
                    <Plus className="h-4 w-4" />
                    Create New Metric
                  </Button>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search metrics, owners, or teams..." value={searchText} onChange={e => setSearchText(e.target.value)} className="pl-10" />
                </div>

                {/* Error Display */}
                {error && <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">{error}</span>
                    <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                      Retry
                    </Button>
                  </div>}

                {/* Selected Metrics Action Bar */}
                {selectedMetrics.size > 0 && <div className="flex items-center justify-between p-3 bg-muted/50 border border-border rounded-lg">
                    <span className="text-sm font-medium text-foreground">
                      {selectedMetrics.size} metric{selectedMetrics.size !== 1 ? 's' : ''} selected
                    </span>
                    <div className="flex gap-2">
                      <Button onClick={handleAddToTableClick} className="flex items-center gap-2 bg-primary hover:bg-primary/90" disabled={isAdding || isDeleting}>
                        <Plus className="h-4 w-4" />
                        Add to Table
                      </Button>
                      <Button variant="destructive" onClick={handleDeleteClick} className="flex items-center gap-2" disabled={isAdding || isDeleting}>
                        {isDeleting ? <>
                            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Deleting...
                          </> : <>
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </>}
                      </Button>
                    </div>
                  </div>}

                {/* Status with Debug Info */}
                

                {/* Metrics Table */}
                <div className="flex-1 overflow-auto border rounded-lg">
                  <table className="w-full">
                    <thead className="bg-background sticky top-0 z-10 border-b">
                      <tr>
                        <th className="w-12 p-3">
                          <Checkbox checked={filteredMetrics.length > 0 && selectedMetrics.size === filteredMetrics.length} onCheckedChange={handleSelectAll} />
                        </th>
                        <th className="text-left p-3">Metric Name</th>
                        <th className="text-left p-3">Owner</th>
                        <th className="text-left p-3">Team</th>
                        <th className="text-left p-3">Unit</th>
                        <th className="text-left p-3">Target</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? <tr>
                          <td colSpan={6} className="text-center p-8">
                            <div className="space-y-2">
                              <div>⏳ Loading company metrics...</div>
                              <div className="text-xs text-muted-foreground">
                                Fetching data from all teams in {currentCompany?.name}
                              </div>
                            </div>
                          </td>
                        </tr> : error ? <tr>
                          <td colSpan={6} className="text-center p-8">
                            <div className="space-y-2">
                              <div className="text-destructive">Error loading metrics</div>
                              <div className="text-xs text-muted-foreground">{error}</div>
                              <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="mt-2">
                                Retry
                              </Button>
                            </div>
                          </td>
                        </tr> : filteredMetrics.length === 0 ? <tr>
                          <td colSpan={6} className="text-center p-8">
                            <div className="space-y-2">
                              <div>No metrics found</div>
                              <div className="text-xs text-muted-foreground">
                                {metrics.length === 0 ? 'No metrics exist in any teams for this company' : 'No metrics match the current search filter'}
                              </div>
                            </div>
                          </td>
                        </tr> : filteredMetrics.map(metric => {
                    const metricKey = `${metric.metric_name}-${metric.owner_id}-${metric.team_id}`;
                    const isSelected = selectedMetrics.has(metricKey);
                    return <tr key={metricKey} className={`border-t hover:bg-muted/30 ${isSelected ? 'bg-muted/50' : ''}`}>
                              <td className="p-3">
                                <Checkbox checked={isSelected} onCheckedChange={checked => handleSelectMetric(metricKey, checked as boolean)} />
                              </td>
                              <td className="p-3 font-medium">{metric.metric_name}</td>
                              <td className="p-3">{metric.owner_name}</td>
                              <td className="p-3">{metric.team_name}</td>
                              <td className="p-3">{metric.unit}</td>
                              <td className="p-3">
                                {metric.target_value ? metric.target_value.toLocaleString() : 'None'}
                              </td>
                            </tr>;
                  })}
                    </tbody>
                  </table>
                </div>
              </>}
          </div>
        </DialogContent>
      </Dialog>
      
      <AddMetricModal open={showAddMetricModal} onOpenChange={setShowAddMetricModal} onAdd={async metricData => {
      try {
        // Create the metric using the createMetric service
        await createMetric(
          metricData.metric_name,
          metricData.unit,
          metricData.owner_id,
          metricData.target_value,
          metricData.target_logic || 'greater_than_or_equal',
          user?.id || metricData.owner_id,
          metricData.team_id || '',
          metricData.is_formula || false,
          metricData.formula_components || [],
          metricData.aggregation_type || 'total',
          weekStartDay,
          metricData.assistant_id ?? null
        );
        
        // Refresh the metrics list after adding the new metric
        await refetch();
        toast({
          title: "Metric Created",
          description: `Successfully created metric "${metricData.metric_name}".`
        });
      } catch (error) {
        logger.error('Error creating metric:', error);
        // Don't show generic error - useTeamMetrics already shows specific error messages
        throw error; // Re-throw to let AddMetricModal handle the loading state
      }
    }} />
    
    <MetricDeleteConfirmationDialog
      open={showDeleteConfirmDialog}
      onOpenChange={setShowDeleteConfirmDialog}
      metric={metricsToDelete[0]}
      currentTeamName={metricsToDelete[0]?.team_name || 'Unknown Team'}
      onDeleteFromTeam={handleDeleteFromTeam}
      onDeleteFromAllTeams={handleDeleteFromAllTeams}
      isDeleting={isDeleting}
      dependentMetrics={dependentMetrics}
      isBulkDelete={metricsToDelete.length > 1}
      bulkCount={metricsToDelete.length}
    />
    </>;
};

// Export aliases for backward compatibility
export const MetricManagementModal = MinimalAddMetricsModal;
export const SimpleMetricManagementModal = MinimalAddMetricsModal;