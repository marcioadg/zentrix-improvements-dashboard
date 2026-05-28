
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Target, Calendar, AlertTriangle, RefreshCw } from 'lucide-react';
import { BusinessLoading } from '@/components/ui/business-loading';
import { Button } from '@/components/ui/button';
import { logger } from '@/utils/logger';

export const GoalsCardResilient: React.FC = () => {
  const { user } = useAuth();

  const { data: goals = [], isLoading, error, refetch } = useQuery({
    queryKey: ['user-goals-resilient', user?.id],
    queryFn: async () => {
      if (!user) return [];

      try {
        // Get personal goals
        const { data: personalGoals, error: personalError } = await supabase
          .from('team_goals')
          .select('*')
          .eq('owner_id', user.id)
          .eq('is_company_goal', false);

        if (personalError) {
          logger.error('Error fetching personal goals:', personalError);
          // Don't throw, continue with team goals
        }

        // Get team goals where user is the owner
        const { data: teamGoals, error: teamError } = await supabase
          .from('team_goals')
          .select('*, teams(name)')
          .eq('owner_id', user.id)
          .eq('archived', false);

        if (teamError) {
          logger.error('Error fetching team goals:', teamError);
          // Don't throw, use what we have
        }

        // Combine and format - handle potential nulls
        const allGoals = [
          ...(personalGoals || []).map(goal => ({
            ...goal,
            type: 'personal' as const,
            team_name: null
          })),
          ...(teamGoals || []).map(goal => ({
            ...goal,
            type: 'team' as const,
            team_name: (goal as any).teams?.name || 'Unknown Team'
          }))
        ];

        return allGoals;
      } catch (error) {
        logger.error('Error in goals query:', error);
        throw error;
      }
    },
    enabled: !!user,
    retry: 2,
    retryDelay: 1000
  });

  if (isLoading) {
    return <BusinessLoading isLoading={isLoading} />;
  }

  // Show error state with retry option
  if (error) {
    return (
      <div className="space-y-4 h-full">
        <div className="flex items-center justify-between">
          <span className="text-sm text-destructive font-medium">
            Error loading goals
          </span>
        </div>
        
        <div className="text-center py-8">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-destructive" />
          <p className="text-sm text-muted-foreground mb-4">Failed to load goals</p>
          <Button 
            onClick={() => refetch()} 
            variant="outline" 
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-[var(--success)] bg-[var(--success)]/10';
      case 'on_track':
        return 'text-[var(--info)] bg-[var(--info)]/10';
      case 'at_risk':
        return 'text-[var(--warning)] bg-[var(--warning)]/10';
      case 'off_track':
        return 'text-destructive bg-destructive/10';
      default:
        return 'text-muted-foreground bg-muted';
    }
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

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
              className="p-3 bg-card rounded-lg border hover:border-border transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-medium text-foreground text-sm truncate pr-2" title={goal.title}>
                  {goal.title}
                </h4>
                <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(goal.status)}`}>
                  {formatStatus(goal.status)}
                </span>
              </div>
              
              {goal.description && (
                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                  {goal.description}
                </p>
              )}

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <span className={`px-2 py-1 rounded ${goal.type === 'personal' ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'bg-[var(--info)]/10 text-[var(--info)]'}`}>
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
