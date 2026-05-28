import React, { useState, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { UserAvatar } from '@/components/UserAvatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, User, Clock, AlertTriangle, CheckCircle, Circle, Users, Calendar, Filter, Archive, Loader2 } from 'lucide-react';
import { UnifiedTeamTask } from '@/types/tasks';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useProfiles } from '@/hooks/useProfiles';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { getDueDateInfo } from '@/utils/dueDateUtils';
import { useCelebration } from '@/hooks/useCelebration';
import { EditTaskModal } from '@/components/modals/EditTaskModal';
import { useProfile } from '@/hooks/useProfile';
import { useNewMeetingTimer } from '@/contexts/NewMeetingTimerContext';
import { logger } from '@/utils/logger';
interface StandupTaskViewProps {
  teamId: string;
  tasks: UnifiedTeamTask[];
  loading?: boolean;
  onTaskUpdate?: (taskId: string, updates: Partial<UnifiedTeamTask>) => Promise<void>;
  onTaskDelete?: (taskId: string) => Promise<void>;
  archivingTasks?: Set<string>;
  meetingId?: string; // Add meeting ID to identify meeting context
  onCreateIssue?: (title: string, description: string, ownerId?: string, taskId?: string) => void;
  creatingIssueForTasks?: Set<string>; // NEW: Track tasks with issue creation in progress
  hideNewTasks?: boolean;
}
interface GroupedTasks {
  assignee: {
    id: string | null;
    name: string;
    initials: string;
    email?: string;
    avatar_url?: string;
    color: string;
  };
  tasks: UnifiedTeamTask[];
  completed: number;
  total: number;
  overdue: number;
}

// Predefined colors for consistent team member identification
const MEMBER_COLORS = ['bg-primary/10 text-primary border-blue-200', 'bg-success/10 text-success border-green-200', 'bg-secondary text-purple-700 border-purple-200', 'bg-warning/10 text-orange-700 border-orange-200', 'bg-pink-100 text-pink-700 border-pink-200', 'bg-indigo-100 text-indigo-700 border-indigo-200', 'bg-teal-100 text-teal-700 border-teal-200', 'bg-destructive/10 text-red-700 border-red-200'];
export const StandupTaskView: React.FC<StandupTaskViewProps> = ({
  teamId,
  tasks,
  loading = false,
  onTaskUpdate,
  onTaskDelete,
  archivingTasks = new Set(),
  meetingId,
  onCreateIssue,
  creatingIssueForTasks = new Set(),
  hideNewTasks = true
}) => {
  const { members } = useTeamMembers(teamId);
  const { profiles } = useProfiles();
  const { currentCompany } = useMultiCompany();
  const {
    triggerCelebration
  } = useCelebration();
  const {
    profile
  } = useProfile();
  const {
    timerState
  } = useNewMeetingTimer();

  // State for edit modal
  const [editingTask, setEditingTask] = useState<UnifiedTeamTask | null>(null);

  // View options for stand-up optimization
  // During meetings, default to showing completed tasks (don't hide them)
  const isInMeeting = !!meetingId;
  const [hideCompleted, setHideCompleted] = useState(false);
  const [showOnlyToday, setShowOnlyToday] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Helper function to get assignee info with color coding
  const getAssigneeInfo = (assignedTo?: string[] | "unassigned", index: number = 0) => {
    if (!assignedTo || assignedTo === "unassigned" || (Array.isArray(assignedTo) && assignedTo.length === 0)) {
      return {
        id: null,
        name: 'Unassigned',
        initials: 'UN',
        color: 'bg-muted text-secondary-foreground border-border'
      };
    }
    const firstAssignee = Array.isArray(assignedTo) ? assignedTo[0] : assignedTo;
    const member = members.find(m => m.user_id === firstAssignee);
    
    // Fallback to profiles for display purposes
    const userProfile = profiles.find(p => p.id === firstAssignee);
    
    const name = member?.profiles?.full_name || 
                 member?.profiles?.email || 
                 userProfile?.full_name || 
                 userProfile?.email || 
                 'Unknown';
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    
    return {
      id: firstAssignee,
      name,
      initials,
      email: member?.profiles?.email || userProfile?.email,
      avatar_url: member?.profiles?.avatar_url || userProfile?.avatar_url,
      color: MEMBER_COLORS[index % MEMBER_COLORS.length]
    };
  };

  // Group tasks by assignee with enhanced statistics
  const groupedTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const filtered = tasks.filter(task => {
      // Never show already archived tasks
      if (task.archived) return false;

      // Filter out unassigned tasks in meeting context
      if (!task.assigned_to || task.assigned_to.length === 0) return false;

      // In meeting context: Show completed tasks by default unless explicitly hidden
      // This ensures tasks completed during the meeting remain visible
      if (hideCompleted && task.completed) return false;
      if (showOnlyToday && task.due_date) {
        const dueDate = new Date(task.due_date);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate.getTime() === today.getTime();
      }
      return true;
    });

    // Group by assignee - only create groups for active team members
    const groups = new Map<string, UnifiedTeamTask[]>();
    filtered.forEach(task => {
      const assignees = Array.isArray(task.assigned_to) ? Array.from(new Set(task.assigned_to)) : [];
      // Only create groups for users who are active team members
      const activeAssignees = assignees.filter(userId => 
        members.some(member => member.user_id === userId)
      );
      
      if (activeAssignees.length > 0) {
        // Create groups only for active assignees
        activeAssignees.forEach(userId => {
          if (!groups.has(userId)) groups.set(userId, []);
          groups.get(userId)!.push(task);
        });
      }
    });

    // Convert to structured format with statistics
    const result: GroupedTasks[] = [];
    let memberIndex = 0;

    // Sort groups by member name
    const sortedEntries = Array.from(groups.entries()).sort(([a], [b]) => {
      const memberA = members.find(m => m.user_id === a);
      const memberB = members.find(m => m.user_id === b);
      const nameA = memberA?.profiles?.full_name || memberA?.profiles?.email || 'Unknown';
      const nameB = memberB?.profiles?.full_name || memberB?.profiles?.email || 'Unknown';
      return nameA.localeCompare(nameB);
    });
    sortedEntries.forEach(([assigneeKey, groupTasks]) => {
      const assignee = getAssigneeInfo([assigneeKey], memberIndex++);

      // Calculate statistics - exclude tasks created during the meeting
      const timeBuffer = 30 * 1000; // 30 seconds buffer
      const meetingStartTimeWithBuffer = timerState.meetingStartTime ? timerState.meetingStartTime - timeBuffer : null;

      // Filter out tasks created during the meeting for percentage calculation
      const preExistingTasks = meetingStartTimeWithBuffer ? groupTasks.filter(task => {
        const taskCreatedAt = new Date(task.created_at).getTime();
        return taskCreatedAt < meetingStartTimeWithBuffer;
      }) : groupTasks;
      const completed = preExistingTasks.filter(t => t.completed).length;
      const total = preExistingTasks.length;
      const overdue = groupTasks.filter(t => {
        if (t.completed || !t.due_date) return false;
        const dueDate = new Date(t.due_date);
        return dueDate < today;
      }).length;

      // Use preExistingTasks if hiding new tasks, otherwise use all group tasks
      const tasksToSort = hideNewTasks ? preExistingTasks : groupTasks;

      // Sort tasks within group: incomplete first, then by due date
      const sortedTasks = [...tasksToSort].sort((a, b) => {
        if (a.completed !== b.completed) {
          return a.completed ? 1 : -1;
        }
        if (a.due_date && b.due_date) {
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        }
        if (a.due_date) return -1;
        if (b.due_date) return 1;
        return 0;
      });
      result.push({
        assignee,
        tasks: sortedTasks,
        completed,
        total,
        overdue
      });
    });
    return result;
  }, [tasks, members, profiles, hideCompleted, showOnlyToday, timerState.meetingStartTime]);

  // Auto-expand all groups on first load for better meeting experience
  React.useEffect(() => {
    if (groupedTasks.length > 0 && expandedGroups.size === 0) {
      const allIds = groupedTasks.map(g => g.assignee.id).filter(Boolean) as string[];
      setExpandedGroups(new Set(allIds));
    }
  }, [groupedTasks.length]); // Trigger when groups are available

  // Handle task completion
  const handleToggleComplete = async (task: UnifiedTeamTask) => {
    if (!onTaskUpdate) return;
    try {
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

  // Handle task archiving
  const handleArchiveTask = async (taskId: string) => {
    if (!onTaskDelete) return;
    try {
      await onTaskDelete(taskId);
    } catch (error) {
      logger.error('Error archiving task:', error);
    }
  };

  // Handle task click for editing
  const handleTaskClick = (task: UnifiedTeamTask, e: React.MouseEvent) => {
    // Don't open modal if clicking on checkbox or archive button
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('[role="checkbox"]')) {
      return;
    }
    setEditingTask(task);
  };

  // Handle task update from modal with type conversion
  const handleTaskUpdate = async (taskId: string, updates: any) => {
    if (onTaskUpdate) {
      // Normalize assigned_to handling: only wrap in array if it's a string
      const convertedUpdates: Partial<UnifiedTeamTask> = { ...updates };
      if (updates.assigned_to !== undefined) {
        // If it's already an array, use as-is; if it's a string, wrap in array; if empty/null, use empty array
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
      user_id: profile?.id || '',
      // Use current user as fallback
      priority: 'medium' as const,
      // Default priority
      task_type: 'team' as const, // This is a team task
      assigned_to: task.assigned_to // Preserve full array for modal
    };
  };

  // Handle create issue for task with duplicate protection
  const handleCreateIssueForTask = (task: UnifiedTeamTask, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onCreateIssue) return;
    
    // Guard against rapid clicks - check if issue creation already in progress for this task
    if (creatingIssueForTasks.has(task.id)) {
      logger.log('⚠️ StandupTaskView: Issue creation already in progress for task:', task.id);
      return;
    }
    
    const dueDateInfo = getDueDateInfo(task.due_date);
    const isOverdue = dueDateInfo?.isOverdue || false;
    const title = isOverdue ? `Overdue Task: ${task.title}` : `Task Issue: ${task.title}`;
    const description = `Issue created for task "${task.title}":
- Status: ${task.completed ? 'Completed' : 'Incomplete'}
- Due Date: ${task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}
- Assigned To: ${task.assigned_to && task.assigned_to.length > 0 ? getAssigneeInfo(task.assigned_to).name : 'Unassigned'}
${isOverdue ? '- Status: OVERDUE' : ''}
${task.description ? `- Description: ${task.description}` : ''}

Please provide details about the issue or help needed for this task.`;
    // Pass task.id to enable tracking in Meeting.tsx
    onCreateIssue(title, description, task.assigned_to && task.assigned_to.length > 0 ? task.assigned_to[0] : undefined, task.id);
  };

  // Toggle group expansion
  const toggleGroup = (assigneeId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(assigneeId)) {
      newExpanded.delete(assigneeId);
    } else {
      newExpanded.add(assigneeId);
    }
    setExpandedGroups(newExpanded);
  };

  // Expand all groups for stand-up mode
  const expandAll = () => {
    const allIds = groupedTasks.map(g => g.assignee.id).filter(Boolean) as string[];
    setExpandedGroups(new Set(allIds));
  };
  if (loading) {
    return <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Stand-up Task View
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-20 bg-muted animate-pulse rounded" />)}
          </div>
        </CardContent>
      </Card>;
  }
  return <Card className="h-full flex flex-col">
      
      
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full w-full">
          <div className="space-y-2 px-4 pb-4 pt-1">
            {groupedTasks.length === 0 ? <div className="text-center py-8">
              <Circle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No tasks found</h3>
              <p className="text-muted-foreground">
                {hideCompleted || showOnlyToday ? 'Try adjusting the filters to see more tasks.' : 'No active tasks for this team.'}
              </p>
            </div> : groupedTasks.map(group => {
        const isExpanded = expandedGroups.has(group.assignee.id!);
        const groupKey = group.assignee.id!;
        return <Collapsible key={groupKey} open={isExpanded} onOpenChange={() => toggleGroup(groupKey)}>
                <CollapsibleTrigger asChild>
                  <div className="w-full p-2 rounded-lg border-2 cursor-pointer hover:bg-muted/70 transition-colors bg-muted/60 border-border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        
                        <UserAvatar
                          userId={group.assignee.id || undefined}
                          fullName={group.assignee.name}
                          email={group.assignee.email}
                          avatarUrl={group.assignee.avatar_url}
                          size="sm"
                          className="h-6 w-6"
                        />
                        
                         <div className="flex items-center gap-2">
                           <h3 className="font-semibold text-sm">
                             {group.assignee.name}
                           </h3>
                         </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {group.overdue > 0 && <Badge variant="destructive" className="flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {group.overdue} overdue
                          </Badge>}
                        
                        <Badge variant="outline" className={`flex items-center gap-1 ${group.total > 0 ? group.completed / group.total * 100 >= 90 ? 'text-success border-success' : 'text-destructive border-destructive' : 'text-muted-foreground'}`}>
                          <CheckCircle className="h-3 w-3" />
                          {group.total > 0 ? Math.round(group.completed / group.total * 100) : 0}%
                        </Badge>
                        
                        <div className="w-12 h-2 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full transition-all duration-300 ${group.total > 0 ? group.completed / group.total * 100 >= 90 ? 'bg-success' : 'bg-destructive' : 'bg-muted-foreground/40'}`} style={{
                      width: `${group.total > 0 ? group.completed / group.total * 100 : 0}%`
                    }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="mt-1 ml-3">
              {group.tasks.map((task, taskIndex) => {
                const dueDateInfo = getDueDateInfo(task.due_date);
                const isOverdue = dueDateInfo?.isOverdue && !task.completed;
                const isArchiving = archivingTasks.has(task.id);
                const isCreatingIssue = creatingIssueForTasks.has(task.id);
                
                // Determine if task was created during the meeting
                const timeBuffer = 30 * 1000;
                const meetingStart = timerState.meetingStartTime ? timerState.meetingStartTime - timeBuffer : null;
                const isNewDuringMeeting = meetingStart ? new Date(task.created_at).getTime() >= meetingStart : false;
                
                return <React.Fragment key={task.id}>
                        <div className={`flex items-center gap-2 py-1.5 transition-all cursor-pointer hover:bg-muted/30 ${task.completed ? 'bg-muted/10' : ''} ${isArchiving || isCreatingIssue ? 'opacity-50' : ''}`} onClick={e => handleTaskClick(task, e)}>
                          <Checkbox checked={task.completed} onCheckedChange={() => handleToggleComplete(task)} disabled={isArchiving} className={`flex-shrink-0 ${task.completed ? 'data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500' : ''}`} />
                          
                           <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`font-medium text-sm ${task.completed ? 'text-muted-foreground' : 'text-foreground'}`}>
                                {task.title}
                              </span>
                              
                              {dueDateInfo && <Badge variant={isOverdue ? "destructive" : "outline"} className={`text-xs ${isOverdue ? dueDateInfo.urgencyClass : ''}`}>
                                  <Clock className="h-3 w-3 mr-1" />
                                  {dueDateInfo.text}
                                </Badge>}
                            </div>
                            {task.description && <p className={`text-xs text-muted-foreground truncate mt-1 ${isArchiving ? 'opacity-60' : ''}`}>
                                {task.description}
                              </p>}
                          </div>

                          <div className="flex items-center gap-1 flex-shrink-0">
                            {isNewDuringMeeting && <Badge variant="outline" className="text-xs border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                                New
                              </Badge>}
                            {/* Create Issue Button with loading state */}
                            {onCreateIssue && <div 
                              className={`p-1 rounded transition-colors ${
                                isCreatingIssue 
                                  ? 'cursor-not-allowed opacity-50' 
                                  : `cursor-pointer ${isOverdue ? 'text-destructive hover:text-red-700 hover:bg-destructive/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`
                              }`}
                              onClick={e => !isCreatingIssue && handleCreateIssueForTask(task, e)} 
                              title={isCreatingIssue ? "Creating issue..." : (dueDateInfo?.isOverdue ? "Create issue for overdue task" : "Create issue for task")}
                            >
                                {isCreatingIssue ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
                              </div>}

                            {/* Archive Button */}
                            <Button onClick={() => handleArchiveTask(task.id)} size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-muted" title="Archive task" disabled={isArchiving}>
                              {isArchiving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                        {taskIndex < group.tasks.length - 1 && <Separator className="my-0" />}
                      </React.Fragment>;
              })}
                  </div>
                </CollapsibleContent>
              </Collapsible>;
      })}
          </div>
        </ScrollArea>
      </CardContent>

      {/* Edit Task Modal */}
      {editingTask && <EditTaskModal open={!!editingTask} onOpenChange={open => !open && setEditingTask(null)} task={transformTaskForModal(editingTask)} onUpdate={handleTaskUpdate} />}
    </Card>;
};