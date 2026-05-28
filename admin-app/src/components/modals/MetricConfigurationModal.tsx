import React, { useState, useEffect, memo, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle } from 'lucide-react';
import { FormulaBuilder } from './FormulaBuilder';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useUserTeams } from '@/hooks/useUserTeams';
import { METRIC_UNIT_OPTIONS } from '@/constants/metricUnits';
import { MetricDeleteConfirmationDialog } from './MetricDeleteConfirmationDialog';
import { findDependentFormulas, DependentMetric } from '@/services/metricDependencyService';
import { archiveMetric, getMetricTeamAssignments, updateMetricTeamAssignments } from '@/services/metricOperations';
import { useToast } from '@/hooks/use-toast';
import { TeamMultiSelect } from '@/components/shared/TeamMultiSelect';
import { logger } from '@/utils/logger';

interface FormulaComponent {
  id: string;
  type: 'metric' | 'operator' | 'number';
  value: string;
  displayName?: string;
  teamName?: string;
}

interface MetricConfigurationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metric: any;
  onSave: (config: any) => void;
  teamId?: string;
  // Optional - only used for compatibility, not required
  updateMetricConfiguration?: (metricId: string, config: any) => Promise<void>;
}

const TARGET_LOGIC_OPTIONS = [
  { value: 'greater_than_or_equal', label: 'Greater than or equal to' },
  { value: 'less_than_or_equal', label: 'Less than or equal to' },
  { value: 'equal', label: 'Equal to' },
];

const MetricConfigurationModal: React.FC<MetricConfigurationModalProps> = memo(({
  open,
  onOpenChange,
  metric,
  onSave,
  teamId,
}) => {

  const [metricName, setMetricName] = useState('');
  const [description, setDescription] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [targetLogic, setTargetLogic] = useState('');
  const [unit, setUnit] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [assistantId, setAssistantId] = useState('');
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [isFormula, setIsFormula] = useState(false);
  const [formula, setFormula] = useState<FormulaComponent[]>([]);
  const [aggregationType, setAggregationType] = useState('total');
  const [saving, setSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [dependentMetrics, setDependentMetrics] = useState<DependentMetric[]>([]);
  const [checkingDependencies, setCheckingDependencies] = useState(false);
  
  const { toast } = useToast();

  const { teams } = useUserTeams();
  // Primary team is the first selected team
  const primaryTeamId = selectedTeamIds[0] || '';
  const { members, loading } = useTeamMembers(primaryTeamId);


  useEffect(() => {
    if (metric && open) {
      setMetricName(metric.metric_name || '');
      setDescription(metric.description || '');
      setTargetValue(metric.target_value?.toString() || '');
      setTargetLogic(metric.target_logic || '');
      setUnit(metric.unit || '');
      setIsFormula(metric.is_formula || false);
      setFormula(metric.formula_components || []);
      setAggregationType(metric.aggregation_type || 'total');
      
      // Handle owner_id - make it required
      const currentOwnerId = metric.owner_id;
      if (currentOwnerId && currentOwnerId !== 'null' && currentOwnerId.trim() !== '') {
        setOwnerId(currentOwnerId);
      } else {
        setOwnerId(''); // Start empty to force selection
      }
      
      // Handle assistant_id - optional
      setAssistantId(metric.assistant_id || '');
      
      // Set all team IDs (primary + additional)
      const primaryTeam = metric.team_id || teamId || '';
      
      // Fetch existing team assignments
      if (metric.id) {
        getMetricTeamAssignments(metric.id).then(assignments => {
          // Combine primary team with additional teams
          const allTeams = primaryTeam ? [primaryTeam, ...assignments.filter(id => id !== primaryTeam)] : assignments;
          setSelectedTeamIds(allTeams);
        }).catch(err => {
          logger.error('Failed to fetch metric team assignments:', err);
          setSelectedTeamIds(primaryTeam ? [primaryTeam] : []);
        });
      } else {
        setSelectedTeamIds(primaryTeam ? [primaryTeam] : []);
      }
    }
  }, [metric, open, teamId]);

  // Simplified save handler - single path, closes modal immediately
  const handleSave = useCallback(async () => {
    // Required field validation with toast feedback
    if (!metricName.trim()) {
      toast({ title: "Validation Error", description: "Metric name is required", variant: "destructive" });
      return;
    }
    if (selectedTeamIds.length === 0) {
      toast({ title: "Validation Error", description: "Team selection is required", variant: "destructive" });
      return;
    }
    if (!unit.trim()) {
      toast({ title: "Validation Error", description: "Unit is required", variant: "destructive" });
      return;
    }
    if (!targetLogic.trim()) {
      toast({ title: "Validation Error", description: "Target logic is required", variant: "destructive" });
      return;
    }
    if (!targetValue.trim()) {
      toast({ title: "Validation Error", description: "Target value is required", variant: "destructive" });
      return;
    }
    if (!ownerId.trim()) {
      toast({ title: "Validation Error", description: "Owner is required", variant: "destructive" });
      return;
    }

    setSaving(true);

    // Primary team is first, rest are additional
    const [primaryTeam, ...additionalTeams] = selectedTeamIds;

    // Build clean config object - only include fields needed for update
    const config = {
      metric_name: metricName.trim(),
      description: description.trim() || null,
      target_value: parseFloat(targetValue),
      target_logic: targetLogic,
      unit: unit.trim(),
      owner_id: ownerId.trim(),
      assistant_id: assistantId.trim() || null,
      team_id: primaryTeam,
      is_formula: isFormula,
      formula_components: isFormula ? formula : null,
      aggregation_type: aggregationType,
    };

    // Call parent's onSave - parent handles the database update, error handling, AND modal closing
    // DO NOT close modal here - parent will close it via handleCloseConfigModal after initiating save
    try {
      await onSave(config);
      
      // Update team assignments after metric save (pass ALL teams - service expects primary first)
      if (metric?.id && selectedTeamIds.length > 0) {
        await updateMetricTeamAssignments(metric.id, selectedTeamIds);
      }
    } catch (error) {
      // Parent already shows error toast, just log
      logger.error('MetricConfigurationModal: Save failed:', error);
    } finally {
      setSaving(false);
    }
  }, [
    metricName, description, targetValue, targetLogic, unit, ownerId, assistantId, selectedTeamIds, 
    isFormula, formula, aggregationType, metric?.id, onSave, onOpenChange, toast
  ]);

  // Stable cancel handler using useCallback
  const handleCancel = useCallback(() => {
    logger.log('🔧 MetricConfigurationModal - Cancel called');
    onOpenChange(false);
  }, [onOpenChange]);

  // Stable owner selection handler using useCallback
  const handleOwnerChange = useCallback((value: string) => {
    logger.log('🔧 MetricConfigurationModal - Owner changed to:', value);
    setOwnerId(value);
  }, []);

  // Stable assistant selection handler
  const handleAssistantChange = useCallback((value: string) => {
    logger.log('🔧 MetricConfigurationModal - Assistant changed to:', value);
    setAssistantId(value === 'none' ? '' : value);
  }, []);

  // Delete handlers
  const handleDeleteFromTeam = useCallback(() => {
    if (!metric) return;
    
    // Signal to parent (non-blocking) and close dialogs immediately
    onSave({ action: 'delete_from_team', metric });
    setShowDeleteDialog(false);
    onOpenChange(false);
  }, [metric, onSave, onOpenChange]);

  const handleDeleteFromAllTeams = useCallback(() => {
    if (!metric) return;
    
    // Signal to parent (non-blocking) and close dialogs immediately
    onSave({ action: 'delete_from_all_teams', metric });
    setShowDeleteDialog(false);
    onOpenChange(false);
  }, [metric, onSave, onOpenChange]);

  const handleArchive = useCallback(async () => {
    if (!metric?.id) return;
    
    setIsArchiving(true);
    try {
      await archiveMetric(metric.id);
      
      toast({
        title: "Metric Archived",
        description: `"${metric.metric_name}" has been archived and hidden from the main view.`,
      });
      
      // Signal to parent (non-blocking) and close modal immediately
      onSave({ action: 'archive', metric });
      onOpenChange(false);
    } catch (error) {
      logger.error('Failed to archive metric:', error);
      toast({
        title: "Error",
        description: "Failed to archive metric. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsArchiving(false);
    }
  }, [metric, onSave, onOpenChange, toast]);

  // Form is valid if we have all required fields
  const isFormValid = metricName.trim() && 
                     selectedTeamIds.length > 0 && 
                     unit.trim() && 
                     targetLogic.trim() && 
                     targetValue.trim() && // Now required for both types
                     ownerId.trim() &&
                     (isFormula ? formula.length > 0 : true);
  const isLoading = saving || isDeleting || isArchiving;

  const disabledReason = !metricName.trim() ? 'Metric name is required'
    : selectedTeamIds.length === 0 ? 'Select at least one team'
    : !unit.trim() ? 'Unit is required'
    : !targetLogic.trim() ? 'Target logic is required'
    : !targetValue.trim() ? 'Target value is required'
    : !ownerId.trim() ? 'Select an owner to save'
    : isFormula && formula.length === 0 ? 'Add formula components'
    : '';

  if (!metric) return null;

  // Get current team name for display (primary team)
  const currentTeam = teams.find(t => t.id === primaryTeamId);
  const currentTeamName = currentTeam?.name || 'Unknown Team';

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent 
          className="!w-[calc(100vw-2rem)] !max-w-[400px] sm:!max-w-[600px] flex flex-col rounded-2xl max-h-[90vh]"
          aria-describedby="metric-config-description"
        >
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Configure Metric</DialogTitle>
            <DialogDescription id="metric-config-description">
              Modify the settings for this metric including name, target values, owner assignment, and formula configuration.
            </DialogDescription>
          </DialogHeader>
          
          {/* Scrollable Content */}
          <div className="space-y-4 py-4 overflow-y-auto overflow-x-hidden flex-1 min-h-0 w-full">
            {/* Broken Formula Warning */}
            {metric.formula_error_type === 'METRIC_NOT_FOUND' && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <span className="font-medium">Broken Formula:</span> {metric.formula_error || 'A metric used in this formula was deleted.'}
                  <br />
                  <span className="text-xs">Edit the formula below to remove the deleted metric reference.</span>
                </AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="metric-name">Metric Name *</Label>
              <Input
                id="metric-name"
                value={metricName}
                onChange={(e) => setMetricName(e.target.value)}
                placeholder="Enter metric name"
                disabled={isLoading}
                autoFocus={false}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => {
                  logger.log('🔍 Description field changed:', { 
                    oldValue: description, 
                    newValue: e.target.value,
                    timestamp: new Date().toISOString()
                  });
                  setDescription(e.target.value);
                }}
                placeholder="Enter metric description (optional)"
                rows={3}
                disabled={isLoading}
              />
            </div>

            {/* Team Multi-Select */}
            <TeamMultiSelect
              selectedTeamIds={selectedTeamIds}
              onSelectionChange={setSelectedTeamIds}
              label="Teams"
              placeholder="Select teams"
              disabled={isLoading}
            />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="unit">Unit *</Label>
                <Select value={unit} onValueChange={setUnit} disabled={isLoading} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {METRIC_UNIT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="owner">Owner *</Label>
                <Select value={ownerId} onValueChange={handleOwnerChange} disabled={isLoading} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select owner" />
                  </SelectTrigger>
                  <SelectContent>
                    {loading ? (
                      <SelectItem value="loading" disabled>Loading...</SelectItem>
                    ) : (
                      members.map((member) => (
                        <SelectItem key={member.user_id} value={member.user_id}>
                          {member.profiles?.full_name || member.profiles?.email || 'Unknown'}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Assistant - Optional */}
            <div className="space-y-2">
              <Label htmlFor="assistant">Assistant (Optional)</Label>
              <Select value={assistantId || 'none'} onValueChange={handleAssistantChange} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="No assistant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No assistant</SelectItem>
                  {loading ? (
                    <SelectItem value="loading" disabled>Loading...</SelectItem>
                  ) : (
                    members.filter(member => member.user_id !== ownerId).map((member) => (
                      <SelectItem key={member.user_id} value={member.user_id}>
                        {member.profiles?.full_name || member.profiles?.email || 'Unknown'}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                The assistant can help update metric values and will see this metric on their dashboard
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="formula-mode"
                checked={isFormula}
                onCheckedChange={setIsFormula}
                disabled={isLoading}
              />
              <Label htmlFor="formula-mode">Formula</Label>
            </div>

            {/* Target Value - Always visible for both formula and non-formula metrics */}
            <div className="space-y-2">
              <Label htmlFor="target-value">Target Value *</Label>
              <Input
                id="target-value"
                type="number"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                placeholder={isFormula ? "Enter target for formula result" : "Enter target value"}
                disabled={isLoading}
              />
              {isFormula && (
                <p className="text-xs text-muted-foreground">
                  The target value to compare your calculated formula result against
                </p>
              )}
            </div>

            {/* Target Logic - Always visible for both formula and non-formula metrics */}
            <div className="space-y-2">
              <Label htmlFor="target-logic">Target Logic *</Label>
              <Select value={targetLogic} onValueChange={setTargetLogic} disabled={isLoading} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select logic" />
                </SelectTrigger>
                <SelectContent>
                  {TARGET_LOGIC_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isFormula && (
                <p className="text-xs text-muted-foreground">
                  This logic will be used to compare the calculated formula result against the target
                </p>
              )}
            </div>

            {/* Aggregation Type */}
            <div className="space-y-2">
              <Label htmlFor="aggregation-type">Data Calculation *</Label>
              <Select value={aggregationType} onValueChange={setAggregationType} disabled={isLoading} required>
                <SelectTrigger id="aggregation-type">
                  <SelectValue placeholder="Select calculation type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="total">Total - Sum all period values</SelectItem>
                  <SelectItem value="average">Average - Average of period values</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Choose how this metric should be calculated when viewing multiple weeks
              </p>
            </div>

            {/* Formula Builder - Only visible for formula metrics */}
            {isFormula && (
              <FormulaBuilder
                formula={formula}
                onFormulaChange={setFormula}
                selectedTeamId={primaryTeamId}
              />
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-4 border-t flex-shrink-0 w-full">
            <div className="flex gap-2 order-2 sm:order-1">
              <Button 
                variant="outline" 
                onClick={handleCancel} 
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button 
                variant="outline" 
                onClick={handleArchive}
                disabled={isLoading}
              >
                {isArchiving ? 'Archiving...' : 'Archive'}
              </Button>
              <Button 
                variant="destructive" 
                onClick={async () => {
                  setCheckingDependencies(true);
                  try {
                    const result = await findDependentFormulas(metric.id);
                    setDependentMetrics(result.dependentMetrics);
                  } catch (error) {
                    logger.error('Error checking dependencies:', error);
                    setDependentMetrics([]);
                  } finally {
                    setCheckingDependencies(false);
                    setShowDeleteDialog(true);
                  }
                }}
                disabled={isLoading || checkingDependencies}
              >
                {checkingDependencies ? 'Checking...' : 'Delete Metric'}
              </Button>
            </div>
            <div className="sm:ml-auto order-1 sm:order-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-block w-full sm:w-auto">
                    <Button 
                      className="w-full sm:w-auto pointer-events-auto"
                      onClick={handleSave} 
                      disabled={!isFormValid || isLoading}
                    >
                      {isLoading ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </span>
                </TooltipTrigger>
                {disabledReason && (
                  <TooltipContent>{disabledReason}</TooltipContent>
                )}
              </Tooltip>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <MetricDeleteConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        metric={metric}
        currentTeamName={currentTeamName}
        onDeleteFromTeam={handleDeleteFromTeam}
        onDeleteFromAllTeams={handleDeleteFromAllTeams}
        isDeleting={isDeleting}
        dependentMetrics={dependentMetrics}
      />
    </>
  );
});

MetricConfigurationModal.displayName = 'MetricConfigurationModal';

export { MetricConfigurationModal };
