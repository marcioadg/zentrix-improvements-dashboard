import React, { useState, useEffect, memo, useCallback } from 'react';
import { MobileBaseModal, useMobileModalInputFocus } from './MobileBaseModal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { TeamOwnerSelector } from '@/components/shared/TeamOwnerSelector';
import { FormulaBuilder } from '@/components/modals/FormulaBuilder';
import { useUserTeams } from '@/hooks/useUserTeams';
import { useAuth } from '@/contexts/AuthContext';
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

interface MobileAddMetricModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (metricData: {
    metric_name: string;
    unit: string;
    target_value: number;
    target_logic?: string;
    owner_id: string;
    team_id?: string;
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

const MobileAddMetricModal: React.FC<MobileAddMetricModalProps> = memo(({
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
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedOwnerIds, setSelectedOwnerIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFormula, setIsFormula] = useState(false);
  const [formula, setFormula] = useState<FormulaComponent[]>([]);
  const [formulaError, setFormulaError] = useState<string | null>(null);
  const [aggregationType, setAggregationType] = useState('total');
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const { metrics } = useWeeklyMetrics(selectedTeamId || '');

  useEffect(() => {
    if (open && teams.length > 0 && !selectedTeamId) {
      const teamToSelect = defaultTeamId && teams.find(t => t.id === defaultTeamId) 
        ? defaultTeamId 
        : teams[0].id;
      setSelectedTeamId(teamToSelect);
    }
  }, [open, teams.length, defaultTeamId]);

  useEffect(() => {
    if (open && user?.id && selectedOwnerIds.length === 0) {
      setSelectedOwnerIds([user.id]);
    }
  }, [open, user?.id]);

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
    if (!metricName.trim() || !unit.trim() || !targetLogic.trim() || !targetValue.trim() || selectedOwnerIds.length === 0 || !selectedTeamId) {
      setAttemptedSubmit(true);
      return;
    }
    
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
      const ownerId = selectedOwnerIds.length > 0 ? selectedOwnerIds[0] : user?.id;
      
      window.dispatchEvent(new CustomEvent('optimistic-metric-creation'));
      
      await onAdd({
        metric_name: metricName.trim(),
        unit: unit.trim(),
        target_value: parseFloat(targetValue),
        target_logic: targetLogic,
        owner_id: ownerId!,
        team_id: selectedTeamId || undefined,
        is_formula: isFormula,
        formula_components: isFormula ? formula : undefined,
        aggregation_type: aggregationType,
      });
      
      setMetricName('');
      setUnit('');
      setTargetValue('');
      setTargetLogic('');
      setSelectedOwnerIds([user?.id].filter(Boolean));
      setIsFormula(false);
      setFormula([]);
      setFormulaError(null);
      setAggregationType('total');
      setAttemptedSubmit(false);
      onOpenChange(false);
    } catch (error) {
      logger.error('Error adding metric:', error);
    } finally {
      setLoading(false);
    }
  }, [metricName, unit, targetValue, targetLogic, selectedTeamId, selectedOwnerIds, user?.id, onAdd, onOpenChange, isFormula, formula, metrics]);

  const handleCancel = useCallback(() => {
    setMetricName('');
    setUnit('');
    setTargetValue('');
    setTargetLogic('');
    setSelectedOwnerIds([]);
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

  const isFormValid = metricName.trim() && 
                     unit.trim() && 
                     targetLogic.trim() && 
                     targetValue.trim() && 
                     selectedOwnerIds.length > 0 && 
                     selectedTeamId &&
                     (isFormula ? formula.length > 0 && !formulaError : true);

  const handleInputFocus = useMobileModalInputFocus();

  return (
    <MobileBaseModal
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
              onFocus={handleInputFocus}
              required
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
              onFocus={handleInputFocus}
              autoComplete="off"
              required
              className={attemptedSubmit && !targetValue.trim() ? 'border-destructive focus-visible:ring-destructive/30' : ''}
            />
            {isFormula && (
              <p className="text-xs text-muted-foreground">
                The target value to compare your calculated formula result against
              </p>
            )}
          </div>

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

          {isFormula && (
            <div className="space-y-2">
              <FormulaBuilder
                formula={formula}
                onFormulaChange={setFormula}
                selectedTeamId={selectedTeamId}
              />
              {formulaError && (
                <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                  {formulaError}
                </div>
              )}
            </div>
          )}

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

          <TeamOwnerSelector
            selectedTeamId={selectedTeamId}
            onTeamChange={setSelectedTeamId}
            selectedOwnerIds={selectedOwnerIds}
            onOwnerChange={setSelectedOwnerIds}
            allowPersonal={false}
            multipleOwners={false}
            teamLabel="Team *"
            ownerLabel="Metric Owner *"
            teamPlaceholder="Select team"
            ownerPlaceholder="Select owner"
            showTeamError={attemptedSubmit && !selectedTeamId}
            showOwnerError={attemptedSubmit && selectedOwnerIds.length === 0}
          />
        </div>
      )}
    </MobileBaseModal>
  );
});

MobileAddMetricModal.displayName = 'MobileAddMetricModal';

export { MobileAddMetricModal };
