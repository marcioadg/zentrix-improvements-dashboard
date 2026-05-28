
import React, { useState, useEffect, memo, useCallback, useMemo } from 'react';
import { BaseModal } from './BaseModal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { TeamMultiSelect } from '@/components/shared/TeamMultiSelect';
import { FormulaBuilder } from './FormulaBuilder';
import { useUserTeams } from '@/hooks/useUserTeams';
import { useAuth } from '@/contexts/AuthContext';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { validateFormulaComponents } from '@/services/formulaCalculationService';
import { useWeeklyMetrics } from '@/hooks/useWeeklyMetrics';
import { METRIC_UNIT_OPTIONS } from '@/constants/metricUnits';
import { logger } from '@/utils/logger';

interface FormulaComponent {
  id: string;
  type: 'metric' | 'operator' | 'number';
  value: string;
  displayName?: string;
  teamName?: string;
}

interface AddMetricModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (metricData: {
    metric_name: string;
    unit: string;
    target_value: number;
    target_logic?: string;
    owner_id: string;
    assistant_id?: string | null;
    team_id?: string;
    additional_team_ids?: string[];
    is_formula?: boolean;
    formula_components?: FormulaComponent[];
    aggregation_type?: string;
  }) => Promise<void>;
  defaultTeamId?: string;
}

const TARGET_LOGIC_OPTIONS = [
  { value: 'greater_than_or_equal', label: 'Greater than or equal to' },
  { value: 'less_than_or_equal', label: 'Less than or equal to' },
  { value: 'equal', label: 'Equal to' },
];

const AddMetricModal: React.FC<AddMetricModalProps> = memo(({
  open,
  onOpenChange,
  onAdd,
  defaultTeamId,
}) => {
  const { teams } = useUserTeams();
  const { user } = useAuth();
  
  const [metricName, setMetricName] = useState('');
  const [unit, setUnit] = useState('');
  const [targetValue, setTargetValue] = useState<string>('');
  const [targetLogic, setTargetLogic] = useState('');
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>('');
  const [assistantId, setAssistantId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [isFormula, setIsFormula] = useState(false);
  const [formula, setFormula] = useState<FormulaComponent[]>([]);
  const [formulaError, setFormulaError] = useState<string | null>(null);
  const [aggregationType, setAggregationType] = useState('total');
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  // Primary team is the first selected team
  const primaryTeamId = selectedTeamIds[0] || '';
  
  // Get team members for owner selection based on primary team
  const { members, loading: loadingMembers } = useTeamMembers(primaryTeamId);

  // Get metrics for formula validation - ONLY when formula mode is enabled (lazy-load)
  const { metrics } = useWeeklyMetrics(isFormula ? primaryTeamId : '');

  // Auto-select team when modal opens - prioritize defaultTeamId from meeting context
  useEffect(() => {
    if (open && teams.length > 0 && selectedTeamIds.length === 0) {
      const teamToSelect = defaultTeamId && teams.find(t => t.id === defaultTeamId) 
        ? defaultTeamId 
        : teams[0].id;
      setSelectedTeamIds([teamToSelect]);
    }
  }, [open, teams.length, defaultTeamId]);

  // Auto-assign current user as owner when modal opens
  useEffect(() => {
    if (open && user?.id && !selectedOwnerId) {
      setSelectedOwnerId(user.id);
    }
  }, [open, user?.id]);

  // Reset owner when team changes (owner might not be in new team)
  useEffect(() => {
    if (primaryTeamId && members.length > 0) {
      const ownerInTeam = members.some(m => m.user_id === selectedOwnerId);
      if (!ownerInTeam && user?.id) {
        // Check if current user is in the team
        const currentUserInTeam = members.some(m => m.user_id === user.id);
        setSelectedOwnerId(currentUserInTeam ? user.id : (members[0]?.user_id || ''));
      }
    }
  }, [primaryTeamId, members, selectedOwnerId, user?.id]);

  // Clear assistant if it would collide with the current owner or is no longer in the team.
  useEffect(() => {
    if (!assistantId) return;
    if (assistantId === selectedOwnerId) {
      setAssistantId('');
      return;
    }
    if (members.length > 0 && !members.some(m => m.user_id === assistantId)) {
      setAssistantId('');
    }
  }, [assistantId, selectedOwnerId, members]);

  // Validate formula whenever it changes
  useEffect(() => {
    if (isFormula && formula.length > 0) {
      const validation = validateFormulaComponents(formula, metrics);
      if (!validation.isValid) {
        setFormulaError(validation.error || 'Invalid formula');
      } else {
        setFormulaError(null);
      }
    } else {
      setFormulaError(null);
    }
  }, [isFormula, formula, metrics]);

  const handleSubmit = useCallback(async () => {
    // Required field validation
    if (!metricName.trim() || !unit.trim() || !targetLogic.trim() || !targetValue.trim() || !selectedOwnerId || selectedTeamIds.length === 0) {
      setAttemptedSubmit(true);
      return;
    }
    
    // For formula metrics, validate the formula
    if (isFormula) {
      if (formula.length === 0) {
        setFormulaError('Formula cannot be empty');
        setAttemptedSubmit(true);
        return;
      }
      
      const validation = validateFormulaComponents(formula, metrics);
      if (!validation.isValid) {
        setFormulaError(validation.error || 'Invalid formula');
        setAttemptedSubmit(true);
        return;
      }
    }
    
    setLoading(true);
    try {
      // Dispatch optimistic event for onboarding
      window.dispatchEvent(new CustomEvent('optimistic-metric-creation'));
      
      // Primary team is first, rest are additional
      const [primaryTeam, ...additionalTeams] = selectedTeamIds;
      
      await onAdd({
        metric_name: metricName.trim(),
        unit: unit.trim(),
        target_value: parseFloat(targetValue),
        target_logic: targetLogic,
        owner_id: selectedOwnerId,
        assistant_id: assistantId || null,
        team_id: primaryTeam,
        additional_team_ids: additionalTeams.length > 0 ? additionalTeams : undefined,
        is_formula: isFormula,
        formula_components: isFormula ? formula : undefined,
        aggregation_type: aggregationType,
      });

      // Reset form but keep team selection for context continuity
      setMetricName('');
      setUnit('');
      setTargetValue('');
      setTargetLogic('');
      setSelectedOwnerId(user?.id || '');
      setAssistantId('');
      setIsFormula(false);
      setFormula([]);
      setFormulaError(null);
      setAggregationType('total');
      setAttemptedSubmit(false);
      onOpenChange(false);
    } catch (error) {
      logger.error('❌ AddMetricModal - Submit error:', error);
    } finally {
      setLoading(false);
    }
  }, [metricName, unit, targetValue, targetLogic, selectedTeamIds, selectedOwnerId, assistantId, user?.id, onAdd, onOpenChange, isFormula, formula, metrics, aggregationType]);

  const handleCancel = useCallback(() => {
    setMetricName('');
    setUnit('');
    setTargetValue('');
    setTargetLogic('');
    setSelectedOwnerId('');
    setAssistantId('');
    setIsFormula(false);
    setFormula([]);
    setFormulaError(null);
    setAggregationType('total');
    setAttemptedSubmit(false);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleDisabledClick = useCallback(() => {
    setAttemptedSubmit(true);
  }, []);

  // Check if form is valid
  const isFormValid = metricName.trim() && 
                     unit.trim() && 
                     targetLogic.trim() && 
                     targetValue.trim() &&
                     selectedOwnerId && 
                     selectedTeamIds.length > 0 &&
                     (isFormula ? formula.length > 0 && !formulaError : true);

  return (
    <BaseModal
      open={open}
      onOpenChange={onOpenChange}
      title="Add Metric"
      description="Create a new metric to track"
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      submitText="Add Metric"
      loading={loading}
      submitDisabled={!isFormValid || teams.length === 0}
      onDisabledClick={handleDisabledClick}
      mobileKeyboardAware
    >
      {teams.length === 0 ? (
        <div className="space-y-3 p-4 rounded-lg bg-muted">
          <p className="text-sm text-muted-foreground">
            You don't have any teams yet. Create or join a team to add metrics.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="metric-name" className={attemptedSubmit && !metricName.trim() ? 'text-destructive' : ''}>
              Metric Name *
            </Label>
            <Input
              id="metric-name"
              placeholder="Enter metric name"
              value={metricName}
              onChange={(e) => setMetricName(e.target.value)}
              className={attemptedSubmit && !metricName.trim() ? 'border-destructive focus-visible:ring-destructive/30' : ''}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="metric-unit-select" className={attemptedSubmit && !unit ? 'text-destructive' : ''}>
              Unit *
            </Label>
            <Select value={unit} onValueChange={setUnit} required>
              <SelectTrigger id="metric-unit-select" className={attemptedSubmit && !unit ? 'border-destructive focus-visible:ring-destructive/30' : ''}>
                <SelectValue placeholder="Select unit type" />
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

          <div className="flex items-center space-x-2">
            <Switch
              id="formula-mode"
              checked={isFormula}
              onCheckedChange={setIsFormula}
            />
            <Label htmlFor="formula-mode">Formula</Label>
          </div>

          {/* Target Value */}
          <div className="space-y-2">
            <Label htmlFor="target-value" className={attemptedSubmit && !targetValue.trim() ? 'text-destructive' : ''}>
              Target Value *
            </Label>
            <Input
              id="target-value"
              type="number"
              inputMode="decimal"
              step="any"
              placeholder={isFormula ? "Enter target for formula result" : "Enter target value"}
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              autoComplete="off"
              className={attemptedSubmit && !targetValue.trim() ? 'border-destructive focus-visible:ring-destructive/30' : ''}
            />
            {isFormula && (
              <p className="text-xs text-muted-foreground">
                The target value to compare your calculated formula result against
              </p>
            )}
          </div>

          {/* Target Logic */}
          <div className="space-y-2">
            <Label htmlFor="target-logic-select" className={attemptedSubmit && !targetLogic ? 'text-destructive' : ''}>
              Target Logic *
            </Label>
            <Select value={targetLogic} onValueChange={setTargetLogic} required>
              <SelectTrigger id="target-logic-select" className={attemptedSubmit && !targetLogic ? 'border-destructive focus-visible:ring-destructive/30' : ''}>
                <SelectValue placeholder="Select comparison logic" />
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

          {/* Formula Builder */}
          {isFormula && (
            <div className="space-y-2">
              <FormulaBuilder
                formula={formula}
                onFormulaChange={setFormula}
                selectedTeamId={primaryTeamId}
              />
              {formulaError && (
                <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                  {formulaError}
                </div>
              )}
            </div>
          )}

          {/* Aggregation Type */}
          <div className="space-y-2">
            <Label htmlFor="aggregation-type">Data Calculation *</Label>
            <Select value={aggregationType} onValueChange={setAggregationType} required>
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

          {/* Team Multi-Select */}
          <TeamMultiSelect
            selectedTeamIds={selectedTeamIds}
            onSelectionChange={setSelectedTeamIds}
            label="Teams"
            placeholder="Select teams"
            showError={attemptedSubmit && selectedTeamIds.length === 0}
          />

          {/* Owner Selection */}
          {primaryTeamId && (
            <div className="space-y-2">
              <Label htmlFor="owner-select" className={attemptedSubmit && !selectedOwnerId ? 'text-destructive' : ''}>
                Metric Owner *
              </Label>
              <Select value={selectedOwnerId} onValueChange={setSelectedOwnerId} required disabled={loadingMembers}>
                <SelectTrigger className={attemptedSubmit && !selectedOwnerId ? 'border-destructive focus-visible:ring-destructive/30' : ''}>
                  <SelectValue placeholder={loadingMembers ? "Loading..." : "Select owner"} />
                </SelectTrigger>
                <SelectContent>
                  {members.map((member) => (
                    <SelectItem key={member.user_id} value={member.user_id}>
                      {member.profiles?.full_name || member.profiles?.email || 'Unknown'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Assistant Selection (optional) — mirrors MetricConfigurationModal */}
          {primaryTeamId && (
            <div className="space-y-2">
              <Label htmlFor="assistant-select">Assistant (Optional)</Label>
              <Select
                value={assistantId || 'none'}
                onValueChange={(value) => setAssistantId(value === 'none' ? '' : value)}
                disabled={loadingMembers}
              >
                <SelectTrigger id="assistant-select">
                  <SelectValue placeholder="No assistant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No assistant</SelectItem>
                  {members
                    .filter((member) => member.user_id !== selectedOwnerId)
                    .map((member) => (
                      <SelectItem key={member.user_id} value={member.user_id}>
                        {member.profiles?.full_name || member.profiles?.email || 'Unknown'}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                The assistant can help update metric values and will see this metric on their dashboard
              </p>
            </div>
          )}
        </div>
      )}
    </BaseModal>
  );
});

AddMetricModal.displayName = 'AddMetricModal';

export { AddMetricModal };
