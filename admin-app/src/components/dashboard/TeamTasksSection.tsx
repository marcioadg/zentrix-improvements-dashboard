import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { UnifiedTeamTask } from '@/types/tasks';
import { TaskFilterPreferences } from '@/hooks/useTaskFilterPreferences';
import { useCelebration } from '@/hooks/useCelebration';
import { useUnifiedTeamTasks } from '@/hooks/useUnifiedTeamTasks';
import { EnhancedAddTaskModal } from '@/components/modals/EnhancedAddTaskModal';
import { logger } from '@/utils/logger';
interface TeamTasksSectionProps {
  selectedTeamIds: string[];
  filterPreferences: TaskFilterPreferences;
  teamId?: string;
  meetingId?: string;
}
export const TeamTasksSection: React.FC<TeamTasksSectionProps> = ({
  selectedTeamIds,
  filterPreferences,
  teamId,
  meetingId
}) => {
  const {
    triggerCelebration
  } = useCelebration();
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);

  // Use the unified team tasks hook
  const {
    tasks,
    loading,
    createTask,
    updateTask,
    deleteTask,
    pendingArchives = []
  } = useUnifiedTeamTasks(selectedTeamIds);
  const getStatusIcon = (completed: boolean) => {
    return completed ? <CheckCircle className="h-4 w-4 text-success" /> : <Clock className="h-4 w-4 text-muted-foreground" />;
  };
  const handleTaskToggle = async (task: UnifiedTeamTask) => {
    try {
      // Trigger celebration immediately if completing task
      if (!task.completed) {
        triggerCelebration();
      }
      await updateTask(task.id, {
        completed: !task.completed
      });
    } catch (error) {
      logger.error('Error toggling task:', error);
    }
  };
  const handleTaskDelete = async (taskId: string) => {
    try {
      await deleteTask(taskId);
    } catch (error) {
      logger.error('Error deleting task:', error);
    }
  };
  const handleAddTask = async (title: string, description: string, teamSelection: {
    type: 'personal' | 'team';
    teamId?: string;
  }, dueDate?: string, assignedTo?: string[], status?: 'todo' | 'in-progress' | 'done') => {
    try {
      logger.debug('Creating team task', {
        title,
        teamType: teamSelection.type,
        assignedCount: assignedTo?.length || 0
      });

      // FIXED: Handle array of assignedTo users by creating separate tasks
      if (assignedTo && assignedTo.length > 0) {
        logger.debug('Creating multiple tasks for assigned users', { count: assignedTo.length });
        
        // Create tasks for each assigned user using the correct format
        const taskPromises = assignedTo.map(async (userId) => {
          const taskData: Partial<UnifiedTeamTask> = {
            title,
            description,
            team_id: teamSelection.type === 'team' ? teamSelection.teamId : undefined,
            due_date: dueDate || '',
            assigned_to: [userId], // Array of user IDs
            completed: false
          };
          return createTask(taskData);
        });

        await Promise.all(taskPromises);
        logger.debug('All assigned tasks created successfully');
      } else {
        // Create single task - ensure team tasks get proper team assignment
        const taskData: Partial<UnifiedTeamTask> = {
          title,
          description,
          team_id: teamSelection.type === 'team' ? teamSelection.teamId : undefined,
          due_date: dueDate || '',
          assigned_to: [], // Empty array for unassigned team tasks
          completed: false
        };
        await createTask(taskData);
        logger.debug('Single team task created successfully');
      }
    } catch (error) {
      logger.error('Error creating team task', { error });
      throw error;
    }
  };

  // Check if a task is being archived
  const isTaskArchiving = (taskId: string) => {
    return pendingArchives.some(archive => archive.taskId === taskId);
  };
  if (loading) {
    return <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Team Tasks
            <Button size="sm" disabled>
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-muted rounded-lg animate-pulse"></div>)}
          </div>
        </CardContent>
      </Card>;
  }
  return <>
      <Card>
        
        
      </Card>

      {/* Add Task Modal */}
      <EnhancedAddTaskModal open={showAddTaskModal} onOpenChange={setShowAddTaskModal} onAddTask={handleAddTask} defaultTeamId={selectedTeamIds[0]} // Use the first selected team as default
    />
    </>;
};