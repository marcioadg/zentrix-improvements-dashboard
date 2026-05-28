import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Goal } from '@/hooks/useOptimizedGoals';

interface OptimisticGoal extends Goal {
  isOptimistic?: boolean;
  optimisticId?: string;
}

/**
 * Optimistic UI hook for goals - instant feedback
 * Updates UI immediately, syncs with backend, rolls back on error
 */
export const useOptimisticGoals = (
  goals: Goal[],
  setGoals: React.Dispatch<React.SetStateAction<Goal[]>>
) => {
  const [pendingOperations, setPendingOperations] = useState<Set<string>>(new Set());
  const rollbackTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const { toast } = useToast();

  // Add goal optimistically
  const addGoalOptimistic = useCallback(
    async (goalData: {
      title: string;
      description?: string;
      status?: Goal['status'];
      target_date?: string;
      owner_id: string;
      team_id: string;
    }) => {
      const optimisticId = `temp-${Date.now()}`;
      const optimisticGoal: OptimisticGoal = {
        id: optimisticId,
        title: goalData.title,
        description: goalData.description,
        status: goalData.status || 'on_track',
        target_date: goalData.target_date,
        owner_id: goalData.owner_id,
        team_id: goalData.team_id,
        is_company_goal: false,
        archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        isOptimistic: true,
        optimisticId,
      };

      // Add to UI immediately
      setGoals([optimisticGoal, ...goals]);
      setPendingOperations((prev) => new Set(prev).add(optimisticId));

      try {
        // Backend sync
        const { data, error } = await supabase
          .from('team_goals')
          .insert(goalData)
          .select()
          .single();

        if (error) throw error;

        // Replace optimistic goal with real one
        setGoals((prev) =>
          prev.map((g) => (g.id === optimisticId ? (data as Goal) : g))
        );
        setPendingOperations((prev) => {
          const next = new Set(prev);
          next.delete(optimisticId);
          return next;
        });

        return data as Goal;
      } catch (error) {
        // Rollback on error
        setGoals((prev) => prev.filter((g) => g.id !== optimisticId));
        setPendingOperations((prev) => {
          const next = new Set(prev);
          next.delete(optimisticId);
          return next;
        });

        toast({
          title: 'Error',
          description: 'Failed to create goal',
          variant: 'destructive',
        });

        throw error;
      }
    },
    [goals, setGoals, toast]
  );

  // Update goal optimistically
  const updateGoalOptimistic = useCallback(
    async (goalId: string, updates: Partial<Goal>) => {
      const originalGoal = goals.find((g) => g.id === goalId);
      if (!originalGoal) return;

      // Update UI immediately
      setGoals((prev) =>
        prev.map((g) =>
          g.id === goalId ? { ...g, ...updates, updated_at: new Date().toISOString() } : g
        )
      );
      setPendingOperations((prev) => new Set(prev).add(goalId));

      // Set rollback timeout (5s)
      const timeoutId = setTimeout(() => {
        setGoals((prev) =>
          prev.map((g) => (g.id === goalId ? originalGoal : g))
        );
        toast({
          title: 'Update timeout',
          description: 'Goal update took too long, rolled back',
          variant: 'destructive',
        });
      }, 5000);

      rollbackTimeouts.current.set(goalId, timeoutId);

      try {
        // Backend sync
        const { error } = await supabase
          .from('team_goals')
          .update(updates)
          .eq('id', goalId);

        if (error) throw error;

        // Clear timeout on success
        const timeout = rollbackTimeouts.current.get(goalId);
        if (timeout) {
          clearTimeout(timeout);
          rollbackTimeouts.current.delete(goalId);
        }

        setPendingOperations((prev) => {
          const next = new Set(prev);
          next.delete(goalId);
          return next;
        });
      } catch (error) {
        // Rollback on error
        const timeout = rollbackTimeouts.current.get(goalId);
        if (timeout) {
          clearTimeout(timeout);
          rollbackTimeouts.current.delete(goalId);
        }

        setGoals((prev) =>
          prev.map((g) => (g.id === goalId ? originalGoal : g))
        );
        setPendingOperations((prev) => {
          const next = new Set(prev);
          next.delete(goalId);
          return next;
        });

        toast({
          title: 'Error',
          description: 'Failed to update goal',
          variant: 'destructive',
        });

        throw error;
      }
    },
    [goals, setGoals, toast]
  );

  // Delete goal optimistically
  const deleteGoalOptimistic = useCallback(
    async (goalId: string) => {
      const originalGoal = goals.find((g) => g.id === goalId);
      if (!originalGoal) return;

      // Remove from UI immediately
      setGoals((prev) => prev.filter((g) => g.id !== goalId));
      setPendingOperations((prev) => new Set(prev).add(goalId));

      // Show undo toast
      toast({
        title: 'Goal deleted',
        description: 'Goal has been deleted',
      });

      try {
        // Backend sync
        const { error } = await supabase
          .from('team_goals')
          .update({ archived: true })
          .eq('id', goalId);

        if (error) throw error;

        setPendingOperations((prev) => {
          const next = new Set(prev);
          next.delete(goalId);
          return next;
        });
      } catch (error) {
        // Rollback on error
        setGoals((prev) => [originalGoal, ...prev]);
        setPendingOperations((prev) => {
          const next = new Set(prev);
          next.delete(goalId);
          return next;
        });

        toast({
          title: 'Error',
          description: 'Failed to delete goal',
          variant: 'destructive',
        });

        throw error;
      }
    },
    [goals, setGoals, toast]
  );

  const isPending = (goalId: string) => pendingOperations.has(goalId);
  const hasPendingOperations = pendingOperations.size > 0;

  return {
    addGoalOptimistic,
    updateGoalOptimistic,
    deleteGoalOptimistic,
    isPending,
    hasPendingOperations,
    pendingCount: pendingOperations.size,
  };
};
