import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Circle, TrendingUp, Calendar } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { UnifiedTeamTask } from '@/types/tasks';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { getCurrentWeekStart } from '@/lib/dateUtils';
import { getUserDisplayName } from '@/utils/userDisplayUtils';
import { getInitials } from '@/utils/nameUtils';

interface WeeklyCompletionsSectionProps {
  teamId: string;
  tasks: UnifiedTeamTask[];
  loading?: boolean;
}

interface WeeklyStats {
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  completedThisWeek: UnifiedTeamTask[];
  pendingTasks: UnifiedTeamTask[];
}

export const WeeklyCompletionsSection: React.FC<WeeklyCompletionsSectionProps> = ({
  teamId,
  tasks,
  loading = false
}) => {
  const { members } = useTeamMembers(teamId);
  
  // Calculate weekly completion statistics
  const weeklyStats: WeeklyStats = useMemo(() => {
    const weekStart = getCurrentWeekStart('monday');
    const weekStartDate = new Date(weekStart);
    const now = new Date();
    
    // Filter tasks that were active this week (not archived)
    const activeTasks = tasks.filter(task => !task.archived);
    
    // Tasks completed this week
    const completedThisWeek = activeTasks.filter(task => {
      if (!task.completed) return false;
      
      // Use updated_at as completion time indicator
      const taskUpdatedDate = new Date(task.updated_at);
      return taskUpdatedDate >= weekStartDate && taskUpdatedDate <= now;
    });
    
    // All active tasks (for completion rate calculation)
    const totalTasks = activeTasks.length;
    const completedTasks = activeTasks.filter(task => task.completed).length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    // Pending tasks
    const pendingTasks = activeTasks.filter(task => !task.completed);
    
    return {
      totalTasks,
      completedTasks,
      completionRate,
      completedThisWeek,
      pendingTasks: pendingTasks.slice(0, 3) // Show top 3 pending
    };
  }, [tasks]);
  
  // Helper function to get assignee info
  const getAssigneeInfo = (assignedTo?: string[]) => {
    if (!assignedTo || assignedTo.length === 0) return {
      name: 'Unassigned',
      initials: 'UN'
    };
    
    const firstAssignee = assignedTo[0];
    const member = members.find(m => m.user_id === firstAssignee);
    const name = getUserDisplayName({
      full_name: member?.profiles?.full_name,
      email: member?.profiles?.email,
      id: firstAssignee
    });
    const initials = getInitials(member?.profiles?.full_name, member?.profiles?.email);
    
    return { name, initials };
  };
  
  // Get completion rate color
  const getCompletionRateColor = (rate: number) => {
    if (rate >= 90) return 'text-success bg-success/10';
    if (rate >= 75) return 'text-success bg-success/10';
    if (rate >= 50) return 'text-warning bg-warning/10';
    return 'text-error bg-error/10';
  };

  const getProgressColor = (rate: number) => {
    if (rate >= 90) return 'bg-success';
    if (rate >= 75) return 'bg-success';
    if (rate >= 50) return 'bg-warning';
    return 'bg-error';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            Weekly Completions
          </h2>
          <p className="text-muted-foreground font-medium">
            Review this week's task completion progress
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-16 bg-muted rounded"></div>
              <div className="h-32 bg-muted rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-4">
          Weekly Completions
        </h2>
        <p className="text-muted-foreground font-medium">
          Review this week's task completion progress
        </p>
      </div>

      {/* Completion Rate Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Completion Rate
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`px-4 py-2 rounded-lg font-bold text-2xl ${getCompletionRateColor(weeklyStats.completionRate)}`}>
                {weeklyStats.completionRate}%
              </div>
              <div className="text-sm text-muted-foreground">
                <div>{weeklyStats.completedTasks} completed of {weeklyStats.totalTasks} total tasks</div>
                <div className="text-xs text-muted-foreground/80">
                  {weeklyStats.completedThisWeek.length} completed this week
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Progress</span>
              <span>{weeklyStats.completedTasks}/{weeklyStats.totalTasks}</span>
            </div>
            <Progress 
              value={weeklyStats.completionRate} 
              className="h-3"
              style={{
                '--progress-foreground': getProgressColor(weeklyStats.completionRate)
              } as React.CSSProperties}
            />
          </div>
        </CardContent>
      </Card>

      {/* Completed This Week */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-success" />
            Completed This Week ({weeklyStats.completedThisWeek.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {weeklyStats.completedThisWeek.length > 0 ? (
            <div className="space-y-3">
              {weeklyStats.completedThisWeek.map(task => {
                const assigneeInfo = getAssigneeInfo(task.assigned_to);
                return (
                  <div key={task.id} className="flex items-center gap-3 p-3 bg-success/10 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className="text-xs bg-success/15 text-success">
                        {assigneeInfo.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-foreground">
                        {task.title}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Completed by {assigneeInfo.name}
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs bg-success/15 text-success">
                      Done
                    </Badge>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <CheckCircle className="h-12 w-12 text-muted-foreground/40 mx-auto mb-2" />
              <p>No tasks completed this week yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Tasks (Top Priority) */}
      {weeklyStats.pendingTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Circle className="h-5 w-5 text-warning" />
              Pending Tasks ({weeklyStats.pendingTasks.length} of {weeklyStats.totalTasks - weeklyStats.completedTasks})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {weeklyStats.pendingTasks.map(task => {
                const assigneeInfo = getAssigneeInfo(task.assigned_to);
                return (
                  <div key={task.id} className="flex items-center gap-3 p-3 bg-warning/10 rounded-lg">
                    <Circle className="h-5 w-5 text-warning flex-shrink-0" />
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className="text-xs bg-warning/15 text-warning">
                        {assigneeInfo.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-foreground">
                        {task.title}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Assigned to {assigneeInfo.name}
                      </div>
                    </div>
                    {task.due_date && (
                      <div className="flex items-center gap-1 text-xs text-warning">
                        <Calendar className="h-3 w-3" />
                        {new Date(task.due_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};