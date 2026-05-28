
import React from 'react';
import { MetricAddForm } from './MetricAddForm';

interface MetricsControlsProps {
  showAddForm: boolean;
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

export const MetricsControls: React.FC<MetricsControlsProps> = ({
  showAddForm,
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
  if (!showAddForm) return null;

  return (
    <div className="border-t pt-4">
      <MetricAddForm
        newMetricName={newMetricName}
        newMetricUnit={newMetricUnit}
        newMetricOwner={newMetricOwner}
        newMetricTarget={newMetricTarget}
        newMetricTargetLogic={newMetricTargetLogic}
        onMetricNameChange={onMetricNameChange}
        onMetricUnitChange={onMetricUnitChange}
        onMetricOwnerChange={onMetricOwnerChange}
        onMetricTargetChange={onMetricTargetChange}
        onMetricTargetLogicChange={onMetricTargetLogicChange}
        onAddMetric={onAddMetric}
        onCancel={onCancel}
      />
    </div>
  );
};
