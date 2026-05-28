import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useSimpleStrategy, YearlyGoal } from '@/contexts/SimpleStrategyContext';
import { Plus, X, Crown, ChevronDown, ChevronRight } from 'lucide-react';
import { celebrate } from '@/lib/celebration';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { logger } from '@/utils/logger';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export const YearlyGoalsSection: React.FC = () => {
  const { 
    data, 
    addYearlyGoal, 
    updateYearlyGoal, 
    updateYearlyGoalDescription,
    toggleYearlyGoalCompletion, 
    removeYearlyGoal,
    hideLeadershipYearlyGoal,
    strategicPlan 
  } = useSimpleStrategy();
  const [newGoal, setNewGoal] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());

  const handleAddGoal = () => {
    if (newGoal.trim()) {
      addYearlyGoal(newGoal.trim());
      setNewGoal('');
    }
  };

  const startEditing = (id: string, currentText: string) => {
    setEditingId(id);
    setEditText(currentText);
  };

  const saveEdit = () => {
    if (editText.trim() && editingId) {
      updateYearlyGoal(editingId, editText.trim());
    }
    setEditingId(null);
    setEditText('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddGoal();
    }
  };

  // Combine team yearly goals with leadership yearly goals  
  const teamYearlyGoals = data.yearlyGoals || [];
  const leadershipYearlyGoals = strategicPlan?.leadership_reference?.yearlyGoals || [];
  const hiddenIds = data.hiddenLeadershipYearlyGoalIds || [];
  
  // Filter out hidden leadership goals and add metadata
  const visibleLeadershipGoals = leadershipYearlyGoals
    .filter((goal: YearlyGoal) => !hiddenIds.includes(goal.id))
    .map((goal: YearlyGoal) => ({
      ...goal,
      id: `leadership-${goal.id}`, // Prefix to identify as leadership
      isFromLeadership: true
    }));

  // Combine and sort all goals
  const allYearlyGoals = [...teamYearlyGoals, ...visibleLeadershipGoals];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Annual Objectives</h3>

      {/* Existing goals list */}
      <div className="space-y-2">
        {allYearlyGoals.map((goal) => {
          const hasDescription = goal.description && goal.description.trim().length > 0;
          const canEditDescription = !goal.isFromLeadership;
          const showExpandable = hasDescription || canEditDescription;
          const isExpanded = expandedGoals.has(goal.id);

          return (
            <Collapsible
              key={goal.id}
              open={isExpanded}
              onOpenChange={(open) => {
                const newExpanded = new Set(expandedGoals);
                if (open) {
                  newExpanded.add(goal.id);
                } else {
                  newExpanded.delete(goal.id);
                }
                setExpandedGoals(newExpanded);
              }}
            >
              <div className="group hover:bg-muted/30 -mx-2 px-2 rounded">
                <div className="flex items-center gap-3 py-2">
                  {editingId === goal.id ? (
                    <div className="flex gap-2 flex-1">
                      <Input
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && saveEdit()}
                        className="flex-1 border-0 border-b border-border rounded-none bg-transparent px-0 focus-visible:ring-0 focus-visible:border-primary"
                        autoFocus
                      />
                      <Button size="sm" onClick={saveEdit} className="h-6 px-2 text-xs">
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={cancelEdit} className="h-6 px-2 text-xs">
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Checkbox
                        checked={goal.completed}
                        onCheckedChange={goal.isFromLeadership ? undefined : (checked) => {
                          logger.log('📋 Checkbox clicked for goal:', goal.id, 'new state:', checked);
                          
                          // Celebrate when goal is completed
                          if (checked && !goal.completed) {
                            celebrate();
                          }
                          
                          toggleYearlyGoalCompletion(goal.id);
                        }}
                        className="shrink-0"
                        disabled={goal.isFromLeadership}
                      />
                      <div className="flex-1 relative">
                        <span
                          className={`cursor-pointer text-sm ${
                            goal.completed 
                              ? 'line-through text-muted-foreground' 
                              : 'text-foreground'
                          } ${goal.isFromLeadership ? 'pr-8 cursor-default' : ''}`}
                          onClick={goal.isFromLeadership ? undefined : () => startEditing(goal.id, goal.text)}
                        >
                          {goal.text}
                        </span>
                        {goal.isFromLeadership && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2" title="Goal shared from leadership team">
                            <Crown className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                          </div>
                        )}
                      </div>
                      <TooltipProvider>
                        {showExpandable && (
                          <Tooltip>
                            <CollapsibleTrigger asChild>
                              <TooltipTrigger asChild>
                                <button className="opacity-0 group-hover:opacity-100 shrink-0 text-muted-foreground hover:text-foreground transition-all">
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </button>
                              </TooltipTrigger>
                            </CollapsibleTrigger>
                            <TooltipContent>
                              <p>{isExpanded ? 'Hide description' : 'Show description'}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </TooltipProvider>
                      <button
                        onClick={() => {
                          if (goal.isFromLeadership) {
                            // Extract original ID by removing 'leadership-' prefix
                            const originalId = goal.id.replace('leadership-', '');
                            hideLeadershipYearlyGoal(originalId);
                          } else {
                            removeYearlyGoal(goal.id);
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all shrink-0"
                        title={goal.isFromLeadership ? "Hide this goal from view" : "Delete this goal"}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>

                {/* Collapsible description section */}
                {showExpandable && (
                  <CollapsibleContent className="pb-2">
                    <div className="pl-11 pr-8">
                      {canEditDescription ? (
                        <Textarea
                          value={goal.description || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value.length <= 500) {
                              updateYearlyGoalDescription(goal.id, value);
                            }
                          }}
                          placeholder="Add description..."
                          className="min-h-[80px] text-sm resize-none"
                          maxLength={500}
                        />
                      ) : (
                        <div className="text-sm text-muted-foreground whitespace-pre-wrap p-2 bg-muted/50 rounded">
                          {goal.description || 'No description'}
                        </div>
                      )}
                      {canEditDescription && (
                        <div className="text-xs text-muted-foreground mt-1 text-right">
                          {(goal.description || '').length}/500
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                )}
              </div>
            </Collapsible>
          );
        })}
      </div>
      
      {/* Add new goal */}
      <div className="flex items-center gap-2">
        <Input
          value={newGoal}
          onChange={(e) => setNewGoal(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Add annual objective..."
          className="flex-1 border-0 border-b border-border rounded-none bg-transparent px-0 focus-visible:ring-0 focus-visible:border-primary"
        />
        <Button
          onClick={handleAddGoal}
          disabled={!newGoal.trim()}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
