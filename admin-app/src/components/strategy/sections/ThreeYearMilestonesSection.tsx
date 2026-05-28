import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useSimpleStrategy, MetricTarget } from '@/contexts/SimpleStrategyContext';

import { Plus, X, Shield, Link, Pencil, Crown } from 'lucide-react';
import { useInlineEditing } from '@/hooks/useInlineEditing';
import { useLeadershipAccess } from '@/hooks/useLeadershipAccess';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const ThreeYearMilestonesSection: React.FC<{ teamId?: string | null }> = ({ teamId }) => {
  const {
    data,
    updateData,
    updateThreeYearDate,
    addThreeYearMetricTarget,
    updateThreeYearMetricTarget,
    removeThreeYearMetricTarget,
    strategicPlan
  } = useSimpleStrategy();
  const { isLeadershipMember } = useLeadershipAccess(teamId);
  const [newMetricName, setNewMetricName] = useState('');
  const [newMetricTarget, setNewMetricTarget] = useState('');
  const [newWhatItLooksLike, setNewWhatItLooksLike] = useState('');

  // Check if sharing is active (leadership has sharing enabled AND current team is not leadership)
  const isSharedFromLeadership = !isLeadershipMember && strategicPlan?.company_shared;

  // Check if current values match leadership values
  const getLeadershipValues = () => {
    const leadershipMilestones = strategicPlan?.leadership_reference?.threeYearMilestones;
    return {
      revenue: leadershipMilestones?.revenue || '',
      profit: leadershipMilestones?.profit || ''
    };
  };
  
  const leadershipValues = getLeadershipValues();
  const revenueMatchesLeadership = !isLeadershipMember && 
    data.threeYearMilestones.revenue && 
    data.threeYearMilestones.revenue === leadershipValues.revenue;
  const profitMatchesLeadership = !isLeadershipMember && 
    data.threeYearMilestones.profit && 
    data.threeYearMilestones.profit === leadershipValues.profit;

  const updateMilestones = (field: keyof typeof data.threeYearMilestones, value: string) => {
    updateData({
      threeYearMilestones: {
        ...data.threeYearMilestones,
        [field]: value
      }
    });
  };

  // Combine team and leadership metrics for display
  const getDisplayMetrics = () => {
    const teamMetrics = data.threeYearMilestones.metricTargets || [];
    const leadershipMetrics = strategicPlan?.leadership_reference?.threeYearMilestones?.metricTargets || [];
    
    // If sharing is off or this is leadership team, show only team metrics
    if (!isSharedFromLeadership) {
      return teamMetrics.map(metric => ({ ...metric, isFromLeadership: false }));
    }
    
    // For normal teams with sharing on, combine both sets
    const teamMetricsWithFlag = teamMetrics.map(metric => ({ ...metric, isFromLeadership: false }));
    const leadershipMetricsWithFlag = leadershipMetrics
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
      addThreeYearMetricTarget(newMetricName.trim(), newMetricTarget.trim());
      setNewMetricName('');
      setNewMetricTarget('');
    }
  };

  const handleMetricTargetChange = (id: string, field: string, value: string) => {
    updateThreeYearMetricTarget(id, {
      [field]: value
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddMetricTarget();
    }
  };

  // What Does It Look Like functions
  const addWhatItLooksLike = () => {
    if (newWhatItLooksLike.trim()) {
      const newItem = {
        id: Date.now().toString(),
        text: newWhatItLooksLike.trim(),
        checked: false
      };
      updateData({
        threeYearMilestones: {
          ...data.threeYearMilestones,
          whatItLooksLike: [...(data.threeYearMilestones.whatItLooksLike || []), newItem]
        }
      });
      setNewWhatItLooksLike('');
    }
  };

  const removeWhatItLooksLike = (id: string) => {
    updateData({
      threeYearMilestones: {
        ...data.threeYearMilestones,
        whatItLooksLike: (data.threeYearMilestones.whatItLooksLike || []).filter(item => item.id !== id)
      }
    });
  };

  const toggleWhatItLooksLike = (id: string) => {
    updateData({
      threeYearMilestones: {
        ...data.threeYearMilestones,
        whatItLooksLike: (data.threeYearMilestones.whatItLooksLike || []).map(item => item.id === id ? {
          ...item,
          checked: !item.checked
        } : item)
      }
    });
  };

  const updateWhatItLooksLike = (id: string, text: string) => {
    updateData({
      threeYearMilestones: {
        ...data.threeYearMilestones,
        whatItLooksLike: (data.threeYearMilestones.whatItLooksLike || []).map(item => 
          item.id === id ? { ...item, text } : item
        )
      }
    });
  };

  // Prepare items for inline editing hook
  const whatItLooksLikeItems = (data.threeYearMilestones.whatItLooksLike || []).map(item => ({
    id: item.id,
    text: item.text
  }));

  const {
    editingId: editingWhatItLooksLikeId,
    editValue: editWhatItLooksLikeValue,
    setEditValue: setEditWhatItLooksLikeValue,
    startEditing: startEditingWhatItLooksLike,
    saveEdit: saveWhatItLooksLikeEdit,
    cancelEdit: cancelWhatItLooksLikeEdit,
    handleKeyDown: handleWhatItLooksLikeKeyDown,
  } = useInlineEditing(whatItLooksLikeItems, updateWhatItLooksLike, removeWhatItLooksLike);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Key measurable targets for the next 3 years
      </p>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="revenue">Revenue Target</Label>
            {revenueMatchesLeadership && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Link className="h-3 w-3 text-primary dark:text-blue-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Matches leadership team target</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <Input 
            id="revenue" 
            value={data.threeYearMilestones.revenue} 
            onChange={e => updateMilestones('revenue', e.target.value)} 
            placeholder="$X million" 
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="profit">Profit Target</Label>
            {profitMatchesLeadership && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Link className="h-3 w-3 text-primary dark:text-blue-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Matches leadership team target</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <Input 
            id="profit" 
            value={data.threeYearMilestones.profit} 
            onChange={e => updateMilestones('profit', e.target.value)} 
            placeholder="$X million" 
          />
        </div>
      </div>

      {/* Key Metrics - Two-field format matching 1-Year Plan */}
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
                    // For leadership metrics, we could implement hide functionality
                    // For now, just skip since hiding isn't implemented for 3-year
                  } else {
                    removeThreeYearMetricTarget(metric.id);
                  }
                }} 
                className="opacity-0 group-hover:opacity-100 h-8 w-8 p-0 text-muted-foreground hover:text-destructive transition-all"
                title={metric.isFromLeadership ? "Hide this metric from view" : "Delete this metric"}
                disabled={metric.isFromLeadership}
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

      {/* What Does It Look Like Section */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label className="text-lg font-semibold">What Does It Look Like?</Label>
        </div>
        
        {/* Existing what it looks like items */}
        <div className="space-y-2">
           {(() => {
             let items = data.threeYearMilestones.whatItLooksLike || [];
             
             // Filter out shared items when sharing is OFF
             if (!strategicPlan?.company_shared && strategicPlan?.leadership_reference?.threeYearMilestones?.whatItLooksLike) {
               const leadershipIds = strategicPlan.leadership_reference.threeYearMilestones.whatItLooksLike.map(item => item.id);
               items = items.filter(item => !leadershipIds.includes(item.id));
             }
             
             return items;
           })().map(item => {
             // Determine if this specific item is from leadership
             const isItemFromLeadership = isSharedFromLeadership && 
               strategicPlan?.leadership_reference?.threeYearMilestones?.whatItLooksLike &&
               strategicPlan.leadership_reference.threeYearMilestones.whatItLooksLike.some(refItem => refItem.id === item.id);
             
              const isEditing = editingWhatItLooksLikeId === item.id;
              
              if (isEditing) {
                return (
                  <div key={item.id} className="flex gap-2 p-3 rounded-lg border border-border/50 bg-card/50">
                    <Checkbox 
                      id={`checkbox-${item.id}`} 
                      checked={item.checked} 
                      disabled
                      className="mt-0.5" 
                    />
                    <Input
                      value={editWhatItLooksLikeValue}
                      onChange={(e) => setEditWhatItLooksLikeValue(e.target.value)}
                      onKeyDown={handleWhatItLooksLikeKeyDown}
                      className="flex-1 border-0 bg-transparent focus-visible:ring-1"
                      autoFocus
                    />
                    <Button onClick={saveWhatItLooksLikeEdit} size="sm" variant="ghost" className="h-7 px-2 text-xs text-success hover:text-success/80">
                      ✓
                    </Button>
                    <Button onClick={cancelWhatItLooksLikeEdit} size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                );
              }
              
              return (
                <div key={item.id} className="group rounded-lg border border-border/50 bg-card/50 hover:bg-card/70 transition-all duration-200 p-3">
                  <div className="flex items-start gap-3">
                    <Checkbox 
                      id={`checkbox-${item.id}`} 
                      checked={item.checked} 
                      onCheckedChange={() => !isItemFromLeadership && toggleWhatItLooksLike(item.id)} 
                      className="mt-0.5" 
                      disabled={isItemFromLeadership}
                    />
                    <div 
                      className="flex-1 text-sm leading-relaxed whitespace-pre-wrap break-words text-foreground cursor-pointer hover:text-foreground/80 transition-colors"
                      onClick={() => !isItemFromLeadership && startEditingWhatItLooksLike(item.id, item.text)}
                    >
                      {item.text}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {isItemFromLeadership ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Shield className="h-4 w-4 text-primary dark:text-blue-400" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>From leadership team</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <button 
                          onClick={() => startEditingWhatItLooksLike(item.id, item.text)} 
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                      <button 
                        onClick={() => removeWhatItLooksLike(item.id)} 
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        disabled={isItemFromLeadership}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
           })}
        </div>
        
        {/* Add new what it looks like item */}
        <div className="flex items-center gap-2">
          <Input 
            value={newWhatItLooksLike} 
            onChange={e => setNewWhatItLooksLike(e.target.value)} 
            onKeyPress={e => e.key === 'Enter' && addWhatItLooksLike()} 
            placeholder="Describe what the company will look like..." 
            className="flex-1 border-0 border-b border-border/40 rounded-none bg-transparent px-0 py-2 focus-visible:ring-0 focus-visible:border-primary/60 placeholder:text-muted-foreground/40 text-sm"
          />
          <Button 
            onClick={addWhatItLooksLike} 
            disabled={!newWhatItLooksLike.trim()} 
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-muted-foreground/60 hover:text-foreground hover:bg-muted/40"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ThreeYearMilestonesSection;
