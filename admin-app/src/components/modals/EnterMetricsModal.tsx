
import React, { useState } from 'react';
import { BaseModal } from './BaseModal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useWeeklyMetrics } from '@/hooks/useWeeklyMetrics';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

interface EnterMetricsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EnterMetricsModal: React.FC<EnterMetricsModalProps> = ({ open, onOpenChange }) => {
  const { metrics, updateMetric, currentWeekStart } = useWeeklyMetrics();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [values, setValues] = useState<Record<string, number>>({});

  React.useEffect(() => {
    if (open && metrics.length > 0) {
      const initialValues: Record<string, number> = {};
      metrics.forEach(metric => {
        initialValues[metric.id] = metric.metric_value;
      });
      setValues(initialValues);
    }
  }, [open, metrics]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      logger.log('EnterMetricsModal: Submitting metrics updates:', values);
      
      const promises = Object.entries(values).map(([metricId, value]) => {
        return updateMetric(metricId, currentWeekStart, value);
      });
      
      await Promise.all(promises);
      
      logger.log('EnterMetricsModal: All metrics updated successfully');
      toast({
        title: "Success",
        description: `Updated ${Object.keys(values).length} metrics successfully`,
      });
      
      onOpenChange(false);
    } catch (error) {
      logger.error('EnterMetricsModal: Error updating metrics:', error);
      toast({
        title: "Error",
        description: "Failed to update some metrics. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    const resetValues: Record<string, number> = {};
    metrics.forEach(metric => {
      resetValues[metric.id] = metric.metric_value;
    });
    setValues(resetValues);
    onOpenChange(false);
  };

  const handleValueChange = (metricId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setValues(prev => ({ ...prev, [metricId]: numValue }));
  };

  const getProgressPercentage = (current: number, target?: number) => {
    if (!target || target === 0) return 0;
    return Math.min((current / target) * 100, 100);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-green-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-destructive';
  };

  return (
    <BaseModal
      open={open}
      onOpenChange={onOpenChange}
      title="Enter Metric Values"
      description="Update your metrics for this week"
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      submitText="Save Metrics"
      loading={loading}
    >
      <div className="space-y-6">
        {metrics.map((metric) => {
          const currentValue = values[metric.id] ?? metric.metric_value;
          const progressPercentage = getProgressPercentage(currentValue, metric.target_value);
          
          return (
            <div key={metric.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor={`metric-${metric.id}`} className="font-medium">
                  {metric.metric_name}
                </Label>
                <div className="text-sm text-muted-foreground">
                  {metric.target_value && `Target: ${metric.target_value} ${metric.unit}`}
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Input
                  id={`metric-${metric.id}`}
                  type="number"
                  placeholder="0"
                  value={currentValue || ''}
                  onChange={(e) => handleValueChange(metric.id, e.target.value)}
                  className="w-24"
                  min="0"
                  step={metric.unit === '%' ? '1' : '0.1'}
                />
                <span className="text-sm text-muted-foreground min-w-0">
                  {metric.unit}
                </span>
                
                {metric.target_value && (
                  <div className="flex-1 space-y-1">
                    <Progress 
                      value={progressPercentage} 
                      className="h-2"
                    />
                    <div className="text-xs text-muted-foreground text-right">
                      {progressPercentage.toFixed(0)}% of target
                    </div>
                  </div>
                )}
              </div>

              {metric.target_value && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Current: {currentValue} {metric.unit}</span>
                  <span>Target: {metric.target_value} {metric.unit}</span>
                </div>
              )}
            </div>
          );
        })}

        {metrics.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No metrics available. Create some metrics first!</p>
          </div>
        )}
      </div>
    </BaseModal>
  );
};
