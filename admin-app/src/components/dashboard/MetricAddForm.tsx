
import React from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { METRIC_UNIT_OPTIONS } from '@/constants/metricUnits';

interface MetricAddFormProps {
  newMetricName: string;
  newMetricUnit: string;
  newMetricOwner: string;
  newMetricTarget: string;
  newMetricTargetLogic: string;
  onMetricNameChange: (value: string) => void;
  onMetricUnitChange: (value: string) => void;
  onMetricOwnerChange: (value: string) => void;
  onMetricTargetChange: (value: string) => void;
  onMetricTargetLogicChange: (value: string) => void;
  onAddMetric: () => void;
  onCancel: () => void;
}

export const MetricAddForm: React.FC<MetricAddFormProps> = ({
  newMetricName,
  newMetricUnit,
  newMetricOwner,
  newMetricTarget,
  newMetricTargetLogic,
  onMetricNameChange,
  onMetricUnitChange,
  onMetricOwnerChange,
  onMetricTargetChange,
  onMetricTargetLogicChange,
  onAddMetric,
  onCancel,
}) => {
  const targetLogicOptions = [
    { value: 'greater_than_or_equal', label: 'Greater than or equal' },
    { value: 'less_than_or_equal', label: 'Less than or equal' },
    { value: 'equal', label: 'Equal' },
  ];

  return (
    <Card className="p-4">
      <div className="space-y-3">
        <Input
          placeholder="Metric name (e.g., Hours Worked)"
          value={newMetricName}
          onChange={(e) => onMetricNameChange(e.target.value)}
        />
        <div className="flex gap-2">
          <div className="flex-1">
            <Select value={newMetricUnit} onValueChange={onMetricUnitChange}>
              <SelectTrigger>
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
          <Input
            placeholder="Owner"
            value={newMetricOwner}
            onChange={(e) => onMetricOwnerChange(e.target.value)}
            className="flex-1"
          />
          <Input
            placeholder="Target value"
            value={newMetricTarget}
            onChange={(e) => onMetricTargetChange(e.target.value)}
            type="number"
            className="flex-1"
          />
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <Select value={newMetricTargetLogic} onValueChange={onMetricTargetLogicChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select comparison logic" />
              </SelectTrigger>
              <SelectContent>
                {targetLogicOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={onAddMetric} size="sm">
            Add Metric
          </Button>
          <Button
            variant="outline"
            onClick={onCancel}
            size="sm"
          >
            Cancel
          </Button>
        </div>
      </div>
    </Card>
  );
};
