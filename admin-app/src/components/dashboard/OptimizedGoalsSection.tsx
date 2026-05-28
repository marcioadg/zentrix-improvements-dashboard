import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Target } from 'lucide-react';
import { useOptimizedGoals } from '@/hooks/useOptimizedGoals';
import { useUserTeams } from '@/hooks/useUserTeams';
import { GoalModal } from '@/components/modals/GoalModal';

export const OptimizedGoalsSection = () => {
  const { teams } = useUserTeams();
  const firstTeamId = teams.length > 0 ? teams[0].id : '';
  const { goals, loading, addGoal, updateGoal } = useOptimizedGoals();
  const [showModal, setShowModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<any>(null);

  // Memoize sorted goals to prevent re-computation
  const sortedGoals = useMemo(() => 
    [...goals].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [goals]
  );

  const handleGoalClick = React.useCallback((goal: any) => {
    setEditingGoal(goal);
    setShowModal(true);
  }, []);

  const handleAddGoal = React.useCallback(() => {
    setEditingGoal(null);
    setShowModal(true);
  }, []);

  const handleSaveGoal = React.useCallback(async (goalData: any) => {
    if (editingGoal) {
      await updateGoal(editingGoal.id, goalData);
    } else {
      await addGoal(goalData.title, goalData.description, goalData.target_date);
    }
    setShowModal(false);
    setEditingGoal(null);
  }, [editingGoal, updateGoal, addGoal]);

  const handleModalClose = React.useCallback((open: boolean) => {
    setShowModal(open);
    if (!open) {
      setEditingGoal(null);
    }
  }, []);

  if (!firstTeamId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Team Goals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            You need to be assigned to a team to view and manage goals.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Team Goals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-2 bg-muted rounded w-full"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Team Goals
            </CardTitle>
            <Button onClick={handleAddGoal} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Goal
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {sortedGoals.length === 0 ? (
            <div className="text-center py-8">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No goals set yet</p>
              <Button onClick={handleAddGoal} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add your first goal
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedGoals.map((goal) => (
                <div
                  key={goal.id}
                  onClick={() => handleGoalClick(goal)}
                  className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-foreground">{goal.title}</h4>
                    <Badge 
                      variant={goal.status === 'complete' ? 'default' : 'secondary'}
                      className="ml-2"
                    >
                      {goal.status}
                    </Badge>
                  </div>
                  
                  {goal.description && (
                    <p className="text-sm text-muted-foreground mb-3">{goal.description}</p>
                  )}
                  
                  {goal.target_date && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Due: {new Date(goal.target_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <GoalModal
        open={showModal}
        onOpenChange={handleModalClose}
        goal={editingGoal}
        onSave={handleSaveGoal}
      />
    </>
  );
};