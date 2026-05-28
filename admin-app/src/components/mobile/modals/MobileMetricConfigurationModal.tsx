import React, { useState, useEffect, memo, useCallback } from 'react';
import { MobileBaseModal, useMobileModalInputFocus } from './MobileBaseModal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { FormulaBuilder } from '@/components/modals/FormulaBuilder';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useUserTeams } from '@/hooks/useUserTeams';
import { METRIC_UNIT_OPTIONS } from '@/constants/metricUnits';
import { logger } from '@/utils/logger';

interface FormulaComponent {
  id: string;
  type: 'metric' | 'operator' | 'number';
  value: string;
  displayName?: string;
  teamName?: string;
}

interface MobileMetricConfigurationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metric: any;
  onSave: (config: any) => void;
  teamId?: string;
}

const TARGET_LOGIC_OPTIONS = [
  { value: 'greater_than_or_equal', label: 'Greater than or equal to' },
  { value: 'less_than_or_equal', label: 'Less than or equal to' },
  { value: 'equal', label: 'Equal to' },
];

// Inner content component that uses the focus context
const MobileMetricContent: React.FC<{
  metric: any;
  metricName: string;
  setMetricName: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  selectedTeamId: string;
  setSelectedTeamId: (v: string) => void;
  unit: string;
  setUnit: (v: string) => void;
  ownerId: string;
  handleOwnerChange: (v: string) => void;
  assistantId: string;
  handleAssistantChange: (v: string) => void;
  isFormula: boolean;
  setIsFormula: (v: boolean) => void;
  targetValue: string;
  setTargetValue: (v: string) => void;
  targetLogic: string;
  setTargetLogic: (v: string) => void;
  formula: FormulaComponent[];
  setFormula: (v: FormulaComponent[]) => void;
  aggregationType: string;
  setAggregationType: (v: string) => void;
  teams: any[];
  members: any[];
  loading: boolean;
  isLoading: boolean;
}> = ({
  metric,
  metricName, setMetricName,
  description, setDescription,
  selectedTeamId, setSelectedTeamId,
  unit, setUnit,
  ownerId, handleOwnerChange,
  assistantId, handleAssistantChange,
  isFormula, setIsFormula,
  targetValue, setTargetValue,
  targetLogic, setTargetLogic,
  formula, setFormula,
  aggregationType, setAggregationType,
  teams, members, loading, isLoading
}) => {
  const handleInputFocus = useMobileModalInputFocus();

  return (
    <div className="space-y-4">
      {/* Broken Formula Warning */}
      {metric?.formula_error_type === 'METRIC_NOT_FOUND' && (
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
        <Label htmlFor="metric-name-mobile">Metric Name *</Label>
        <Input
          id="metric-name-mobile"
          value={metricName}
          onChange={(e) => setMetricName(e.target.value)}
          placeholder="Enter metric name"
          disabled={isLoading}
          required
          onFocus={handleInputFocus}
          autoFocus={false}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description-mobile">Description</Label>
        <Textarea
          id="description-mobile"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter metric description (optional)"
          rows={3}
          disabled={isLoading}
          onFocus={handleInputFocus}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="team-mobile">Team *</Label>
        <Select value={selectedTeamId} onValueChange={setSelectedTeamId} disabled={isLoading} required>
          <SelectTrigger>
            <SelectValue placeholder="Select team" />
          </SelectTrigger>
          <SelectContent className="z-[200]">
            {teams.map((team) => (
              <SelectItem key={team.id} value={team.id}>
                {team.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="unit-mobile">Unit *</Label>
          <Select value={unit} onValueChange={setUnit} disabled={isLoading} required>
            <SelectTrigger>
              <SelectValue placeholder="Select unit" />
            </SelectTrigger>
            <SelectContent className="z-[200]">
              {METRIC_UNIT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="owner-mobile">Owner *</Label>
          <Select value={ownerId} onValueChange={handleOwnerChange} disabled={isLoading} required>
            <SelectTrigger>
              <SelectValue placeholder="Select owner" />
            </SelectTrigger>
            <SelectContent className="z-[200]">
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
        <Label htmlFor="assistant-mobile">Assistant (Optional)</Label>
        <Select value={assistantId || 'none'} onValueChange={handleAssistantChange} disabled={isLoading}>
          <SelectTrigger>
            <SelectValue placeholder="No assistant" />
          </SelectTrigger>
          <SelectContent className="z-[200]">
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
          id="formula-mode-mobile"
          checked={isFormula}
          onCheckedChange={setIsFormula}
          disabled={isLoading}
        />
        <Label htmlFor="formula-mode-mobile">Formula</Label>
      </div>

      {/* Target Value */}
      <div className="space-y-2">
        <Label htmlFor="target-value-mobile">Target Value *</Label>
        <Input
          id="target-value-mobile"
          type="number"
          value={targetValue}
          onChange={(e) => setTargetValue(e.target.value)}
          placeholder={isFormula ? "Enter target for formula result" : "Enter target value"}
          disabled={isLoading}
          required
          onFocus={handleInputFocus}
        />
        {isFormula && (
          <p className="text-xs text-muted-foreground">
            The target value to compare your calculated formula result against
          </p>
        )}
      </div>

      {/* Target Logic */}
      <div className="space-y-2">
        <Label htmlFor="target-logic-mobile">Target Logic *</Label>
        <Select value={targetLogic} onValueChange={setTargetLogic} disabled={isLoading} required>
          <SelectTrigger>
            <SelectValue placeholder="Select logic" />
          </SelectTrigger>
          <SelectContent className="z-[200]">
            {TARGET_LOGIC_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isFormula && (
        <div className="space-y-2">
          <Label>Formula Components</Label>
          <FormulaBuilder
            formula={formula}
            onFormulaChange={setFormula}
            selectedTeamId={selectedTeamId}
          />
        </div>
      )}

      {/* Aggregation Type */}
      {isFormula && (
        <div className="space-y-2">
          <Label htmlFor="aggregation-type-mobile">Aggregation Type</Label>
          <Select value={aggregationType} onValueChange={setAggregationType} disabled={isLoading}>
            <SelectTrigger>
              <SelectValue placeholder="Select aggregation" />
            </SelectTrigger>
            <SelectContent className="z-[200]">
              <SelectItem value="total">Total</SelectItem>
              <SelectItem value="average">Average</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
};

const MobileMetricConfigurationModal: React.FC<MobileMetricConfigurationModalProps> = memo(({
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
  const [selectedTeamId, setSelectedTeamId] = useState(teamId || '');
  const [isFormula, setIsFormula] = useState(false);
  const [formula, setFormula] = useState<FormulaComponent[]>([]);
  const [aggregationType, setAggregationType] = useState('total');
  const [saving, setSaving] = useState(false);

  const { teams } = useUserTeams();
  const { members, loading } = useTeamMembers(selectedTeamId || '');

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
      
      const currentOwnerId = metric.owner_id;
      if (currentOwnerId && currentOwnerId !== 'null' && currentOwnerId.trim() !== '') {
        setOwnerId(currentOwnerId);
      } else {
        setOwnerId('');
      }
      
      setAssistantId(metric.assistant_id || '');
      setSelectedTeamId(metric.team_id || teamId || '');
    }
  }, [metric, open, teamId]);

  const handleSave = useCallback(async () => {
    if (!metricName.trim() || !selectedTeamId || !unit.trim() || !targetLogic.trim() || !targetValue.trim() || !ownerId.trim()) {
      return;
    }

    setSaving(true);

    try {
      const config = {
        id: metric?.id,
        metric_name: metricName.trim(),
        description: description.trim() || null,
        target_value: parseFloat(targetValue),
        target_logic: targetLogic,
        unit: unit.trim(),
        owner_id: ownerId.trim(),
        assistant_id: assistantId.trim() || null,
        team_id: selectedTeamId,
        is_formula: isFormula,
        formula_components: isFormula ? formula : null,
        aggregation_type: aggregationType,
      };
      
      await onSave(config);
      onOpenChange(false);
    } catch (error) {
      logger.error('MobileMetricConfigurationModal - Save failed:', error);
    } finally {
      setSaving(false);
    }
  }, [
    metricName, description, targetValue, targetLogic, unit, ownerId, assistantId, selectedTeamId, 
    metric?.id, isFormula, formula, aggregationType, onSave, onOpenChange
  ]);

  const handleOwnerChange = useCallback((value: string) => {
    setOwnerId(value);
  }, []);

  const handleAssistantChange = useCallback((value: string) => {
    setAssistantId(value === 'none' ? '' : value);
  }, []);

  const isFormValid = metricName.trim() && 
                     selectedTeamId && 
                     unit.trim() && 
                     targetLogic.trim() && 
                     targetValue.trim() && 
                     ownerId.trim() &&
                     (isFormula ? formula.length > 0 : true);
  const isLoading = saving;

  if (!metric) return null;

  return (
    <MobileBaseModal
      open={open}
      onOpenChange={onOpenChange}
      title="Configure Metric"
      description="Modify the settings for this metric including name, target values, owner assignment, and formula configuration."
      onSubmit={handleSave}
      submitText="Save Changes"
      submitDisabled={!isFormValid}
      loading={isLoading}
      size="lg"
    >
      <MobileMetricContent
        metric={metric}
        metricName={metricName}
        setMetricName={setMetricName}
        description={description}
        setDescription={setDescription}
        selectedTeamId={selectedTeamId}
        setSelectedTeamId={setSelectedTeamId}
        unit={unit}
        setUnit={setUnit}
        ownerId={ownerId}
        handleOwnerChange={handleOwnerChange}
        assistantId={assistantId}
        handleAssistantChange={handleAssistantChange}
        isFormula={isFormula}
        setIsFormula={setIsFormula}
        targetValue={targetValue}
        setTargetValue={setTargetValue}
        targetLogic={targetLogic}
        setTargetLogic={setTargetLogic}
        formula={formula}
        setFormula={setFormula}
        aggregationType={aggregationType}
        setAggregationType={setAggregationType}
        teams={teams}
        members={members}
        loading={loading}
        isLoading={isLoading}
      />
    </MobileBaseModal>
  );
});

export { MobileMetricConfigurationModal };
