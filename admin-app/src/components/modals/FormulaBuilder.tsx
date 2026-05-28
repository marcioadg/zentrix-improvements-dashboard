
import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Minus, Divide, Calculator, AlertCircle, Equal } from 'lucide-react';
import { useUserTeams } from '@/hooks/useUserTeams';
import { useCompanyMetrics } from '@/hooks/useCompanyMetrics';
import { validateFormulaComponents } from '@/services/formulaCalculationService';
import { logger } from '@/utils/logger';

interface FormulaComponent {
  id: string;
  type: 'metric' | 'operator' | 'number';
  value: string;
  displayName?: string;
  teamName?: string;
}

interface FormulaBuilderProps {
  formula: FormulaComponent[];
  onFormulaChange: (formula: FormulaComponent[]) => void;
  selectedTeamId?: string;
}

export const FormulaBuilder: React.FC<FormulaBuilderProps> = ({
  formula,
  onFormulaChange,
  selectedTeamId
}) => {
  const { teams } = useUserTeams();
  const { metrics: companyMetrics, loading, error } = useCompanyMetrics();
  
  // Use company metrics and deduplicate by metric_name + team_id combination
  const availableMetrics = React.useMemo(() => {
    // Create a map to deduplicate by metric_name + team_id combination
    const uniqueMetrics = new Map();
    
    companyMetrics.forEach(metric => {
      const key = `${metric.metric_name}_${metric.team_id || 'personal'}`;
      // Always keep the latest metric for each unique combination
      if (!uniqueMetrics.has(key) || metric.updated_at > uniqueMetrics.get(key).updated_at) {
        uniqueMetrics.set(key, metric);
      }
    });
    
    return Array.from(uniqueMetrics.values()).sort((a, b) => a.metric_name.localeCompare(b.metric_name));
  }, [companyMetrics]);
  
  const [selectedMetric, setSelectedMetric] = useState('');
  const [numberInput, setNumberInput] = useState('');

  // Get team name from teams array
  const getTeamName = useCallback((teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    return team?.name || 'Unknown Team';
  }, [teams]);

  // Validate current formula using proper WeeklyMetricWithOwner data
  const validation = validateFormulaComponents(formula, availableMetrics);

  const addMetric = useCallback(() => {
    if (!selectedMetric) return;
    
    const metric = availableMetrics.find(m => m.id === selectedMetric);
    if (!metric) return;

    const teamName = metric.team_name || (metric.team_id ? getTeamName(metric.team_id) : 'Personal');

    const newComponent: FormulaComponent = {
      id: `metric-${Date.now()}`,
      type: 'metric',
      value: metric.id,
      displayName: metric.metric_name,
      teamName: teamName
    };

    onFormulaChange([...formula, newComponent]);
    setSelectedMetric('');
  }, [selectedMetric, availableMetrics, formula, onFormulaChange, getTeamName]);

  const addNumber = useCallback(() => {
    if (!numberInput.trim()) return;
    
    const newComponent: FormulaComponent = {
      id: `number-${Date.now()}`,
      type: 'number',
      value: numberInput,
      displayName: numberInput
    };

    onFormulaChange([...formula, newComponent]);
    setNumberInput('');
  }, [numberInput, formula, onFormulaChange]);

  const addOperator = useCallback((operator: string) => {
    const newComponent: FormulaComponent = {
      id: `operator-${Date.now()}`,
      type: 'operator',
      value: operator,
      displayName: operator
    };

    onFormulaChange([...formula, newComponent]);
  }, [formula, onFormulaChange]);

  const removeComponent = useCallback((id: string) => {
    onFormulaChange(formula.filter(comp => comp.id !== id));
  }, [formula, onFormulaChange]);

  const clearFormula = useCallback(() => {
    onFormulaChange([]);
  }, [onFormulaChange]);

  const undoLast = useCallback(() => {
    if (formula.length > 0) {
      onFormulaChange(formula.slice(0, -1));
    }
  }, [formula, onFormulaChange]);


  // Debug logging to understand deduplication and metrics data
  React.useEffect(() => {
    logger.log('🔧 FormulaBuilder Debug - Company metrics check:', {
      companyMetricsCount: companyMetrics.length,
      availableMetricsCount: availableMetrics.length,
      firstFewMetrics: availableMetrics.slice(0, 5).map(m => ({ 
        name: m.metric_name, 
        id: m.id, 
        teamId: m.team_id,
        teamName: m.team_name,
        updated_at: m.updated_at
      })),
      duplicateCheck: availableMetrics.reduce((acc, metric) => {
        const key = `${metric.metric_name}_${metric.team_id || 'personal'}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    });
    
    // Check if validation works with company metrics
    if (formula.length > 0) {
      const validation = validateFormulaComponents(formula, availableMetrics);
      logger.log('🔧 FormulaBuilder validation result:', {
        isValid: validation.isValid,
        error: validation.error,
        formulaLength: formula.length,
        availableMetricsForValidation: availableMetrics.length
      });
    }
  }, [companyMetrics, availableMetrics, formula, teams, loading, error]);

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
      <div className="flex items-center gap-2">
        <Calculator className="w-4 h-4" />
        <span className="font-medium">Formula Builder</span>
      </div>

      {/* Formula Display */}
      <div className="min-h-[40px] p-2 bg-white border rounded flex flex-wrap items-center gap-1">
        {formula.length === 0 ? (
          <span className="text-muted-foreground text-sm">Build your formula here...</span>
        ) : (
          formula.map((component) => {
            // Check if this metric component references a deleted/missing metric
            const isMissingMetric = component.type === 'metric' && 
              !availableMetrics.some(m => m.id === component.value);
            
            return (
              <Badge
                key={component.id}
                variant={component.type === 'operator' ? 'secondary' : isMissingMetric ? 'destructive' : 'default'}
                className={`flex items-center gap-1 ${isMissingMetric ? 'animate-pulse' : ''}`}
                title={isMissingMetric ? 'This metric was deleted. Remove or replace it.' : undefined}
              >
                {component.type === 'metric' && component.teamName && (
                  <span className="text-xs opacity-70">{component.teamName}:</span>
                )}
                <span>{component.displayName}</span>
                {isMissingMetric && <span className="text-xs">(deleted)</span>}
                <X
                  className="w-3 h-3 cursor-pointer hover:text-destructive"
                  onClick={() => removeComponent(component.id)}
                />
              </Badge>
            );
          })
        )}
      </div>

      {/* Validation Message */}
      {formula.length > 0 && !validation.isValid && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/5 p-2 rounded">
          <AlertCircle className="w-4 h-4" />
          <span>{validation.error}</span>
        </div>
      )}

      {/* Controls */}
      <div className="space-y-3">
        {/* Metric Selection */}
        <div className="flex gap-2">
          <Select value={selectedMetric} onValueChange={setSelectedMetric}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select a metric" />
            </SelectTrigger>
            <SelectContent>
              {availableMetrics.map((metric) => (
                <SelectItem key={metric.id} value={metric.id}>
                  <div className="flex flex-col">
                    <span>{metric.metric_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {metric.team_name || (metric.team_id ? getTeamName(metric.team_id) : 'Personal')}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={addMetric} disabled={!selectedMetric} size="sm">
            Add Metric
          </Button>
        </div>

        {/* Number Input */}
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Enter number"
            value={numberInput}
            onChange={(e) => setNumberInput(e.target.value)}
            className="flex-1 px-3 py-1 text-sm border rounded"
          />
          <Button onClick={addNumber} disabled={!numberInput.trim()} size="sm">
            Add Number
          </Button>
        </div>

        {/* Operators */}
        <div className="flex gap-2">
          <Button onClick={() => addOperator('+')} variant="outline" size="sm">
            <Plus className="w-4 h-4" />
          </Button>
          <Button onClick={() => addOperator('-')} variant="outline" size="sm">
            <Minus className="w-4 h-4" />
          </Button>
          <Button onClick={() => addOperator('×')} variant="outline" size="sm">
            ×
          </Button>
          <Button onClick={() => addOperator('÷')} variant="outline" size="sm">
            <Divide className="w-4 h-4" />
          </Button>
          <Button onClick={() => addOperator('=')} variant="outline" size="sm">
            <Equal className="w-4 h-4" />
          </Button>
        </div>

        {/* Clear/Undo */}
        <div className="flex gap-2 justify-end">
          <Button onClick={undoLast} variant="outline" size="sm" disabled={formula.length === 0}>
            Undo
          </Button>
          <Button onClick={clearFormula} variant="outline" size="sm" disabled={formula.length === 0}>
            Clear
          </Button>
        </div>

        {/* Formula Preview */}
        {formula.length > 0 && validation.isValid && (
          <div className="text-sm text-success bg-success/5 p-2 rounded">
            ✓ Formula is valid and ready to use
          </div>
        )}
      </div>
    </div>
  );
};
