import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Users, Plus, BarChart3, Clock, EyeOff, Eye } from 'lucide-react';
import { UnifiedTeamTask } from '@/types/tasks';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { StandupTaskView } from './StandupTaskView';
import { TeamTasksSection } from './TeamTasksSection';
import { MeetingQuickAddTask } from './MeetingQuickAddTask';
import { UserTeamSelector } from '@/components/shared/UserTeamSelector';

interface TeamTasksStandupSectionProps {
  meetingId: string;
  teamId: string;
  sectionType?: string;
  tasks?: UnifiedTeamTask[];
  loading?: boolean;
  onTaskUpdate?: (taskId: string, updates: Partial<UnifiedTeamTask>) => Promise<void>;
  onTaskDelete?: (taskId: string) => Promise<void>;
  onTaskCreate?: (taskData: Partial<UnifiedTeamTask>) => Promise<any>;
  archivingTasks?: Set<string>;
  onCreateIssue?: (title: string, description: string, ownerId?: string, taskId?: string) => void;
  creatingIssueForTasks?: Set<string>; // NEW: Track tasks with issue creation in progress
}

export const TeamTasksStandupSection: React.FC<TeamTasksStandupSectionProps> = ({
  meetingId,
  teamId,
  sectionType,
  tasks = [],
  loading = false,
  onTaskUpdate,
  onTaskDelete,
  onTaskCreate,
  archivingTasks = new Set(),
  onCreateIssue,
  creatingIssueForTasks = new Set()
}) => {
  const {
    members
  } = useTeamMembers(teamId);

  const [hideNewTasks, setHideNewTasks] = useState(false);

  // Real-time updates are handled by useUnifiedTeamTasks in parent component

  // Calculate summary statistics for the header
  const activeTasks = tasks.filter(task => !task.archived && task.team_id === teamId);
  const completedToday = activeTasks.filter(task => {
    if (!task.completed) return false;
    const today = new Date();
    const updatedAt = new Date(task.updated_at);
    return updatedAt.getDate() === today.getDate() && updatedAt.getMonth() === today.getMonth() && updatedAt.getFullYear() === today.getFullYear();
  }).length;
  const overdueTasks = activeTasks.filter(task => {
    if (task.completed || !task.due_date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(task.due_date);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today;
  }).length;
  const unassignedTasks = activeTasks.filter(task => !task.assigned_to).length;
  
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* STICKY HEADER */}
      <div className="sticky top-0 bg-background z-10 pb-4 mb-1">
        {/* Meeting-optimized header with key metrics */}
        <div className="flex items-center justify-between mb-2 relative">
          <div className="flex-1"></div>
          <h2 className="text-2xl font-bold text-foreground flex-1 text-center">
            Team Task Review
          </h2>
          <div className="flex-1 flex justify-end">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setHideNewTasks(!hideNewTasks)}
                    className="h-8 w-8"
                    aria-label={hideNewTasks ? "Show new tasks" : "Hide new tasks"}
                  >
                    {hideNewTasks ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{hideNewTasks ? 'Show tasks created during meeting' : 'Hide tasks created during meeting'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Quick Add Task Section */}
        <Card>
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add New Task
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <MeetingQuickAddTask teamId={teamId} onTaskCreate={onTaskCreate} loading={loading} />
          </CardContent>
        </Card>
      </div>

      {/* SCROLLABLE CONTENT */}
      <div className="flex-1 overflow-y-auto pt-1">
        <StandupTaskView 
          teamId={teamId} 
          tasks={activeTasks} 
          loading={loading} 
          onTaskUpdate={onTaskUpdate} 
          onTaskDelete={onTaskDelete} 
          archivingTasks={archivingTasks} 
          meetingId={meetingId} 
          onCreateIssue={onCreateIssue}
          creatingIssueForTasks={creatingIssueForTasks}
          hideNewTasks={hideNewTasks}
        />
      </div>
    </div>
  );
};
