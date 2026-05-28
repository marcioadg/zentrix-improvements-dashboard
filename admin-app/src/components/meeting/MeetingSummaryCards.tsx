
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Plus, Calendar, Clock } from 'lucide-react';
import { formatDistanceToNow, differenceInDays, isPast, isToday } from 'date-fns';
import { UnifiedTeamTask } from '@/types/tasks';
import { getUserDisplayName } from '@/utils/userDisplayUtils';
import { getInitials } from '@/utils/nameUtils';
import { UnassignedAvatar } from '@/components/tasks/UnassignedAvatar';

interface MemberWithProfile {
  id: string;
  user_id: string;
  profiles?: {
    full_name?: string;
    email?: string;
    avatar_url?: string;
  };
}

interface MeetingSummaryCardsProps {
  newTasks: UnifiedTeamTask[];
  members: MemberWithProfile[];
  loading?: boolean;
  onTaskClick?: (task: UnifiedTeamTask) => void;
}

export const MeetingSummaryCards: React.FC<MeetingSummaryCardsProps> = ({
  newTasks,
  members,
  loading = false,
  onTaskClick
}) => {
  // Helper function to get assignee name - handle array format
  const getAssigneeName = (assignedTo?: string[]) => {
    if (!assignedTo || assignedTo.length === 0) return 'Unassigned';
    
    const firstAssignee = assignedTo[0];
    const member = members.find(m => m.user_id === firstAssignee);
    return getUserDisplayName({
      full_name: member?.profiles?.full_name,
      email: member?.profiles?.email,
      id: firstAssignee
    });
  };

  // Helper function to get assignee profile for avatar
  const getAssigneeProfile = (assignedTo?: string[]) => {
    if (!assignedTo || assignedTo.length === 0) return null;
    
    const firstAssignee = assignedTo[0];
    return members.find(m => m.user_id === firstAssignee);
  };

  // Helper function to get user initials for avatar fallback
  const getUserInitials = (profile?: MemberWithProfile['profiles']) => {
    if (!profile) return '??';
    return getInitials(profile.full_name, profile.email);
  };

  // Helper function to format due date and get urgency styling
  const getDueDateInfo = (dueDate?: string) => {
    if (!dueDate) {
      return {
        text: 'No due date',
        className: 'text-muted-foreground',
        icon: Clock
      };
    }

    const dueDateObj = new Date(dueDate);
    const today = new Date();
    const daysUntilDue = differenceInDays(dueDateObj, today);

    if (isPast(dueDateObj) && !isToday(dueDateObj)) {
      const daysOverdue = Math.abs(daysUntilDue);
      return {
        text: `Overdue by ${daysOverdue} day${daysOverdue === 1 ? '' : 's'}`,
        className: 'text-destructive font-medium',
        icon: Calendar
      };
    } else if (isToday(dueDateObj)) {
      return {
        text: 'Due today',
        className: 'text-warning font-medium',
        icon: Calendar
      };
    } else if (daysUntilDue <= 3) {
      return {
        text: `Due in ${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'}`,
        className: 'text-warning font-medium',
        icon: Calendar
      };
    } else if (daysUntilDue <= 7) {
      return {
        text: `Due in ${daysUntilDue} days`,
        className: 'text-primary',
        icon: Calendar
      };
    } else {
      return {
        text: `Due in ${daysUntilDue} days`,
        className: 'text-muted-foreground',
        icon: Calendar
      };
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="w-full">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Pending Tasks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Loading skeleton */}
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-3 bg-muted rounded-lg animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-muted-foreground/20 rounded-full flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <div className="h-4 bg-muted-foreground/20 rounded w-3/4"></div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Pending Tasks ({newTasks.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {newTasks.length > 0 ? (
            <>
              {newTasks.map(task => {
                const assigneeProfile = getAssigneeProfile(task.assigned_to);
                const dueDateInfo = getDueDateInfo(task.due_date);
                const DueDateIcon = dueDateInfo.icon;
                
                return (
                  <div 
                    key={task.id} 
                    className="p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => onTaskClick?.(task)}
                  >
                    <div className="flex items-center gap-3">
                      {assigneeProfile?.profiles ? (
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          {assigneeProfile.profiles.avatar_url && (
                            <AvatarImage 
                              src={assigneeProfile.profiles.avatar_url} 
                              alt={getAssigneeName(task.assigned_to)}
                            />
                          )}
                          <AvatarFallback className="text-xs bg-success/10 text-success">
                            {getUserInitials(assigneeProfile.profiles)}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <UnassignedAvatar size="md" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm truncate pr-2">
                            {task.title}
                          </span>
                          <div className={`text-xs flex items-center gap-1 flex-shrink-0 ${dueDateInfo.className}`}>
                            <DueDateIcon className="h-3 w-3" />
                            {dueDateInfo.text}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No pending tasks for this team.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
