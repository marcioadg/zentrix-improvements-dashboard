
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { UserAvatar } from '@/components/UserAvatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Archive, Plus, Loader2, ArrowUpDown } from 'lucide-react';
import { UnifiedTeamTask } from '@/types/tasks';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { getDueDateInfo } from '@/utils/dueDateUtils';
import { useCelebration } from '@/hooks/useCelebration';
import { MeetingQuickAddTask } from './MeetingQuickAddTask';
import { EditTaskModal } from '@/components/modals/EditTaskModal';
import { useProfile } from '@/hooks/useProfile';
import { logger } from '@/utils/logger';

interface TeamTasksSectionProps {
  meetingId: string;
  teamId: string;
  // Receive centralized task data and handlers as props
  tasks?: UnifiedTeamTask[];
  loading?: boolean;
  onTaskUpdate?: (taskId: string, updates: Partial<UnifiedTeamTask>) => Promise<void>;
  onTaskDelete?: (taskId: string) => Promise<void>;
  onTaskCreate?: (taskData: Partial<UnifiedTeamTask>) => Promise<any>;
  archivingTasks?: Set<string>; // New prop for optimistic archiving state
}

export const TeamTasksSection: React.FC<TeamTasksSectionProps> = ({
  meetingId,
  teamId,
  tasks = [],
  loading = false,
  onTaskUpdate,
  onTaskDelete,
  onTaskCreate,
  archivingTasks = new Set()
}) => {
  const {
    members
  } = useTeamMembers(teamId);
  const {
    triggerCelebration
  } = useCelebration();
  const { profile } = useProfile();

  // State for edit modal and sorting
  const [editingTask, setEditingTask] = useState<UnifiedTeamTask | null>(null);
  const [sortBy, setSortBy] = useState<'assignee' | 'title' | 'due_date' | 'status'>('assignee');

  const handleArchiveTask = async (taskId: string) => {
    if (onTaskDelete) {
      await onTaskDelete(taskId);
    }
  };

  const handleToggleComplete = async (task: UnifiedTeamTask) => {
    if (!onTaskUpdate) return;
    try {
      // Trigger celebration immediately for better UX
      if (!task.completed) {
        triggerCelebration();
      }
      await onTaskUpdate(task.id, {
        completed: !task.completed
      });
    } catch (error) {
      logger.error('Error toggling task completion:', error);
    }
  };

  const handleTaskClick = (task: UnifiedTeamTask, e: React.MouseEvent) => {
    // Don't open modal if clicking on checkbox or archive button
    if (
      (e.target as HTMLElement).closest('button') ||
      (e.target as HTMLElement).closest('[role="checkbox"]')
    ) {
      return;
    }
    setEditingTask(task);
  };

  // Handle task update from modal with type conversion
  const handleTaskUpdate = async (taskId: string, updates: any) => {
    if (onTaskUpdate) {
      // Normalize assigned_to handling
      const convertedUpdates: Partial<UnifiedTeamTask> = { ...updates };
      if (updates.assigned_to !== undefined) {
        if (Array.isArray(updates.assigned_to)) {
          convertedUpdates.assigned_to = updates.assigned_to;
        } else if (typeof updates.assigned_to === 'string' && updates.assigned_to.trim()) {
          convertedUpdates.assigned_to = [updates.assigned_to];
        } else {
          convertedUpdates.assigned_to = [];
        }
      }
      await onTaskUpdate(taskId, convertedUpdates);
    }
    setEditingTask(null);
  };

  // Helper function to transform UnifiedTeamTask to EditTaskModal compatible format
  const transformTaskForModal = (task: UnifiedTeamTask) => {
    return {
      ...task,
      user_id: profile?.id || '', // Use current user as fallback
      priority: 'medium' as const, // Default priority
      task_type: 'team' as const, // This is a team task
      assigned_to: task.assigned_to // Preserve full array for modal
    };
  };

  // Helper function to get assignee info
  const getAssigneeInfo = (assignedTo?: string[]) => {
    if (!assignedTo || assignedTo.length === 0) return {
      name: 'Unassigned',
      initials: 'UN',
      sortKey: 'zzz_unassigned' // Sort unassigned tasks to the end
    };
    const firstAssignee = assignedTo[0];
    const member = members.find(m => m.user_id === firstAssignee);
    const name = member?.profiles?.full_name || member?.profiles?.email || 'Unknown';
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    return {
      name,
      initials,
      sortKey: name === 'Unknown' ? 'zzz_unknown' : name.toLowerCase()
    };
  };

  // Filter out archived tasks for the meeting view and sort them
  const activeTasks = useMemo(() => {
    const filtered = tasks.filter(task => !task.archived);
    
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'assignee': {
          const assigneeA = getAssigneeInfo(a.assigned_to).sortKey;
          const assigneeB = getAssigneeInfo(b.assigned_to).sortKey;
          return assigneeA.localeCompare(assigneeB);
        }
        case 'title':
          return a.title.toLowerCase().localeCompare(b.title.toLowerCase());
        case 'due_date': {
          if (!a.due_date && !b.due_date) return 0;
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        }
        case 'status':
          // Completed tasks go to the end
          if (a.completed && !b.completed) return 1;
          if (!a.completed && b.completed) return -1;
          return 0;
        default:
          return 0;
      }
    });
  }, [tasks, sortBy, members]);
  
  return (
    <div className="space-y-6">
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg">Active Tasks ({activeTasks.length})</CardTitle>
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as 'assignee' | 'title' | 'due_date' | 'status')}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="assignee">Person</SelectItem>
                <SelectItem value="title">Title</SelectItem>
                <SelectItem value="due_date">Due Date</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : activeTasks.length > 0 ? (
            <>
              {activeTasks.map(task => {
                const assigneeInfo = getAssigneeInfo(task.assigned_to);
                const dueDateInfo = getDueDateInfo(task.due_date);
                const isArchiving = archivingTasks.has(task.id);
                
                return (
                  <div 
                    key={task.id} 
                    className={`flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors cursor-pointer ${
                      isArchiving ? 'opacity-50' : ''
                    }`}
                    onClick={(e) => handleTaskClick(task, e)}
                  >
                    {/* Completion Checkbox */}
                    <Checkbox 
                      checked={task.completed} 
                      onCheckedChange={() => handleToggleComplete(task)} 
                      className="flex-shrink-0"
                      disabled={isArchiving}
                    />
                    
                    {/* Assignee Avatar */}
                    <UserAvatar
                      userId={task.assigned_to?.[0] || ''}
                      size="sm"
                      className="h-8 w-8 flex-shrink-0"
                    />
                    
                    {/* Task Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium text-sm truncate ${
                          task.completed ? 'line-through text-muted-foreground' : 'text-foreground'
                        } ${isArchiving ? 'text-muted-foreground/70' : ''}`}>
                          {task.title}
                        </span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          • {assigneeInfo.name}
                        </span>
                      </div>
                      {task.description && (
                        <p className={`text-xs text-muted-foreground truncate mt-1 ${
                          isArchiving ? 'text-muted-foreground/70' : ''
                        }`}>
                          {task.description}
                        </p>
                      )}
                    </div>
                    
                    {/* Status and Due Date */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        task.completed ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                      } ${isArchiving ? 'opacity-50' : ''}`}>
                        {task.completed ? 'Done' : 'To Do'}
                      </span>
                      
                      {/* Due Date Display */}
                      {dueDateInfo ? (
                        <span className={`text-xs px-2 py-1 rounded border ${dueDateInfo.urgencyClass} ${
                          isArchiving ? 'opacity-50' : ''
                        }`}>
                          {dueDateInfo.text}
                        </span>
                      ) : (
                        <span className={`text-xs text-muted-foreground/70 px-2 py-1 ${
                          isArchiving ? 'opacity-50' : ''
                        }`}>
                          No due date
                        </span>
                      )}
                      
                      {/* Archive Button */}
                      <Button 
                        onClick={() => handleArchiveTask(task.id)} 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 w-8 p-0 hover:bg-muted"
                        title="Archive task"
                        disabled={isArchiving}
                      >
                        {isArchiving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Archive className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No active tasks</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Task Modal */}
      {editingTask && (
        <EditTaskModal
          open={!!editingTask}
          onOpenChange={(open) => !open && setEditingTask(null)}
          task={transformTaskForModal(editingTask)}
          onUpdate={handleTaskUpdate}
        />
      )}
    </div>
  );
};
