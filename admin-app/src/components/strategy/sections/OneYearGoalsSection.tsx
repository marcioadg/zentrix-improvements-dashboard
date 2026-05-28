import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useSimpleStrategy, MetricTarget } from '@/contexts/SimpleStrategyContext';
import { Plus, X, Crown } from 'lucide-react';

export const OneYearGoalsSection: React.FC = () => {
  const {
    data,
    updateData,
    addAnnualMetricTarget,
    updateAnnualMetricTarget,
    removeAnnualMetricTarget,
    hideLeadershipAnnualMetric,
    strategicPlan
  } = useSimpleStrategy();
  const [newMetricName, setNewMetricName] = useState('');
  const [newMetricTarget, setNewMetricTarget] = useState('');
  
  const updateGoals = (field: keyof typeof data.oneYearGoals, value: string) => {
    updateData({
      oneYearGoals: {
        ...data.oneYearGoals,
        [field]: value
      }
    });
  };

  // Get leadership values for comparison
  const getLeadershipValues = () => {
    const leadershipOneYearGoals = strategicPlan?.leadership_reference?.oneYearGoals;
    return {
      revenue: leadershipOneYearGoals?.revenue || '',
      profit: leadershipOneYearGoals?.profit || '',
    };
  };

  const leadershipValues = getLeadershipValues();
  const isSharedFromLeadership = !strategicPlan?.team_is_leadership && strategicPlan?.company_shared;

  // Check if current value matches leadership value
  const isValueFromLeadership = (field: 'revenue' | 'profit') => {
    const currentValue = data.oneYearGoals[field] || '';
    const leadershipValue = leadershipValues[field] || '';
    return isSharedFromLeadership && currentValue && leadershipValue && currentValue === leadershipValue;
  };

  // Combine team and leadership metrics for display
  const getDisplayMetrics = () => {
    const teamMetrics = data.oneYearGoals.metricTargets || [];
    const leadershipMetrics = strategicPlan?.leadership_reference?.oneYearGoals?.metricTargets || [];
    const hiddenIds = data.hiddenLeadershipAnnualMetricIds || [];
    
    // If sharing is off or this is leadership team, show only team metrics
    if (!isSharedFromLeadership) {
      return teamMetrics.map(metric => ({ ...metric, isFromLeadership: false }));
    }
    
    // For normal teams with sharing on, combine both sets
    const teamMetricsWithFlag = teamMetrics.map(metric => ({ ...metric, isFromLeadership: false }));
    const leadershipMetricsWithFlag = leadershipMetrics
      .filter(metric => !hiddenIds.includes(metric.id)) // Filter out hidden metrics
      .map(metric => ({ 
        ...metric, 
        isFromLeadership: true,
        id: `leadership-${metric.id}` // Prevent ID conflicts
      }));
    
    return [...teamMetricsWithFlag, ...leadershipMetricsWithFlag];
  };

  const displayMetrics = getDisplayMetrics();



  const handleAddMetricTarget = () => {
    if (newMetricName.trim() && newMetricTarget.trim()) {
      addAnnualMetricTarget(newMetricName.trim(), newMetricTarget.trim());
      setNewMetricName('');
      setNewMetricTarget('');
    }
  };

  const handleMetricTargetChange = (id: string, field: string, value: string) => {
    updateAnnualMetricTarget(id, {
      [field]: value
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddMetricTarget();
    }
  };

  return (
    <div className="space-y-8">
      {/* Financial Goals */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-normal text-foreground">Revenue Goal</Label>
            <div className="relative">
              <Input 
                value={data.oneYearGoals.revenue} 
                onChange={e => updateGoals('revenue', e.target.value)} 
                placeholder="e.g., $1M ARR"
                className="border-0 border-b border-border rounded-none bg-transparent px-0 focus-visible:ring-0 focus-visible:border-primary pr-8"
              />
              {isValueFromLeadership('revenue') && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2" title="Value shared from leadership team">
                  <Crown className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                </div>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-normal text-foreground">Profit Goal</Label>
            <div className="relative">
              <Input 
                value={data.oneYearGoals.profit} 
                onChange={e => updateGoals('profit', e.target.value)} 
                placeholder="e.g., $250K"
                className="border-0 border-b border-border rounded-none bg-transparent px-0 focus-visible:ring-0 focus-visible:border-primary pr-8"
              />
              {isValueFromLeadership('profit') && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2" title="Value shared from leadership team">
                  <Crown className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Key Metrics</h3>
        
        {/* Existing Metric Targets */}
        <div className="space-y-2">
          {displayMetrics.map(metric => (
            <div key={metric.id} className="group flex items-center gap-4 py-2 hover:bg-muted/40 -mx-2 px-2 rounded-md transition-colors duration-200">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <Input 
                    value={metric.name}
                    onChange={metric.isFromLeadership ? undefined : e => handleMetricTargetChange(metric.id, 'name', e.target.value)}
                    placeholder="Metric name" 
                    className={`border-0 border-b border-border rounded-none bg-transparent px-0 focus-visible:ring-0 focus-visible:border-primary text-sm ${
                      metric.isFromLeadership ? 'pr-8 cursor-default' : ''
                    }`}
                    readOnly={metric.isFromLeadership}
                  />
                  {metric.isFromLeadership && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2" title="Metric shared from leadership team">
                      <Crown className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                    </div>
                  )}
                </div>
                <div className="relative">
                  <Input 
                    value={metric.target}
                    onChange={metric.isFromLeadership ? undefined : e => handleMetricTargetChange(metric.id, 'target', e.target.value)}
                    placeholder="Target value" 
                    className={`border-0 border-b border-border rounded-none bg-transparent px-0 focus-visible:ring-0 focus-visible:border-primary text-sm ${
                      metric.isFromLeadership ? 'pr-8 cursor-default' : ''
                    }`}
                    readOnly={metric.isFromLeadership}
                  />
                  {metric.isFromLeadership && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2" title="Target shared from leadership team">
                      <Crown className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                    </div>
                  )}
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  if (metric.isFromLeadership) {
                    // Extract original ID by removing 'leadership-' prefix
                    const originalId = metric.id.replace('leadership-', '');
                    hideLeadershipAnnualMetric(originalId);
                  } else {
                    removeAnnualMetricTarget(metric.id);
                  }
                }} 
                className="opacity-0 group-hover:opacity-100 h-8 w-8 p-0 text-muted-foreground hover:text-destructive transition-all"
                title={metric.isFromLeadership ? "Hide this metric from view" : "Delete this metric"}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        {/* Add New Metric Target */}
        <div className="flex items-center gap-2 py-2">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input 
              value={newMetricName} 
              onChange={e => setNewMetricName(e.target.value)} 
              onKeyPress={handleKeyPress}
              placeholder="Metric name" 
              className="border-0 border-b border-border/40 rounded-none bg-transparent px-0 py-2 focus-visible:ring-0 focus-visible:border-primary/60 placeholder:text-muted-foreground/40 text-sm"
            />
            <Input 
              value={newMetricTarget} 
              onChange={e => setNewMetricTarget(e.target.value)} 
              onKeyPress={handleKeyPress}
              placeholder="Target value" 
              className="border-0 border-b border-border/40 rounded-none bg-transparent px-0 py-2 focus-visible:ring-0 focus-visible:border-primary/60 placeholder:text-muted-foreground/40 text-sm"
            />
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleAddMetricTarget} 
            disabled={!newMetricName.trim() || !newMetricTarget.trim()}
            className="h-8 w-8 p-0 text-muted-foreground/60 hover:text-foreground hover:bg-muted/40"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
