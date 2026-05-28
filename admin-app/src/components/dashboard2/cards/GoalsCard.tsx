
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Target, Calendar, AlertCircle } from 'lucide-react';
import { BusinessLoading } from '@/components/ui/business-loading';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

export const GoalsCard: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [updatingGoalId, setUpdatingGoalId] = useState<string | null>(null);

  const { data: goals = [], isLoading, error } = useQuery({
    queryKey: ['user-goals', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get team goals for the user (owner or assignee)
      const { data: teamGoals, error: teamError } = await supabase
        .from('team_goals')
        .select('*, teams(name)')
        .eq('owner_id', user.id)
        .eq('archived', false);

      if (teamError) throw teamError;

      // Format team goals
      const allGoals = (teamGoals || []).map(goal => ({
        ...goal,
        type: 'team' as const,
        team_name: (goal as any).teams?.name || 'Unknown Team'
      }));

      return allGoals;
    },
    enabled: !!user
  });

  if (isLoading) {
    return <BusinessLoading isLoading={isLoading} />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
        <AlertCircle className="w-8 h-8 text-status-error opacity-70" />
        <p className="text-sm">Failed to load goals</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on_track':
        return 'text-status-success bg-status-success/10';
      case 'complete':
        return 'text-primary bg-primary/20';
      case 'off_track':
        return 'text-status-error bg-status-error/10';
      default:
        return 'text-muted-foreground bg-muted';
    }
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleStatusUpdate = async (goalId: string, newStatus: string) => {
    if (updatingGoalId) return;
    setUpdatingGoalId(goalId);
    try {
      const { error } = await supabase
        .from('team_goals')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', goalId);

      if (error) throw error;

      // Refresh the goals data
      queryClient.invalidateQueries({ queryKey: ['user-goals', user?.id] });

      toast.success(`Goal status updated to ${formatStatus(newStatus)}`);
    } catch (error) {
      logger.error('Error updating goal status:', error);
      toast.error('Failed to update goal status');
    } finally {
      setUpdatingGoalId(null);
    }
  };

  const statusOptions = [
    { value: 'on_track', label: 'On Track' },
    { value: 'off_track', label: 'Off Track' },
    { value: 'complete', label: 'Completed' },
    { value: 'canceled', label: 'Canceled' }
  ];

  return (
    <div className="space-y-4 h-full">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground font-medium">
          {goals.length} goals
        </span>
      </div>

      <div className="space-y-3 overflow-auto max-h-[300px]">
        {goals.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No goals assigned to you</p>
          </div>
        ) : (
          goals.map((goal) => (
            <div
              key={`${goal.type}-${goal.id}`}
              className="p-3 bg-background rounded-lg border hover:border-border transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-medium text-foreground text-sm truncate pr-2" title={goal.title}>
                  {goal.title}
                </h4>
                <Select
                  value={goal.status}
                  onValueChange={(value) => handleStatusUpdate(goal.id, value)}
                  disabled={updatingGoalId === goal.id}
                >
                  <SelectTrigger className={`w-auto h-6 text-xs border-0 p-1 transition-opacity ${updatingGoalId === goal.id ? 'opacity-50' : ''}`}>
                    <SelectValue>
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(goal.status)}`}>
                        {formatStatus(goal.status)}
                      </span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(option.value)}`}>
                          {option.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <span className={`px-2 py-1 rounded ${goal.type === 'personal' ? 'bg-accent/10 text-accent' : 'bg-primary/20 text-primary'}`}>
                    {goal.type === 'personal' ? 'Personal' : goal.team_name}
                  </span>
                </div>
                
                {goal.target_date && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(goal.target_date).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
