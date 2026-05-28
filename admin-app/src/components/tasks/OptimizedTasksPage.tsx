import React, { useState, useMemo, useCallback } from 'react';
import { Plus, Archive, List, Kanban, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EnhancedAddTaskModal } from '@/components/modals/EnhancedAddTaskModal';
import { MultiAssigneeDisplay } from '@/components/shared/MultiAssigneeDisplay';
import { useProfiles } from '@/hooks/useProfiles';
import { useAuth } from '@/contexts/AuthContext';
import { useGlobalData } from '@/contexts/GlobalDataContext';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export const OptimizedTasksPage: React.FC = () => {
  const { tasks, teams, tasksLoading: loading, tasksError: error, refetchTasks: refetch } = useGlobalData();
  const { profiles } = useProfiles();
  const { user } = useAuth();
  
  // Local state
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [selectedTaskType, setSelectedTaskType] = useState<'all' | 'personal' | 'team'>('all');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('all');
  const [myTasksOnly, setMyTasksOnly] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Filter tasks based on selections
  const filteredTasks = useMemo(() => {
    let filtered = tasks;

    // Filter by task type
    if (selectedTaskType !== 'all') {
      filtered = filtered.filter(task => task.task_type === selectedTaskType);
    }

    // Filter by specific team
    if (selectedTeamId !== 'all') {
      if (selectedTeamId === 'personal') {
        filtered = filtered.filter(task => task.task_type === 'personal');
      } else {
        filtered = filtered.filter(task => task.team_id === selectedTeamId);
      }
    }

    // Filter by assignment (my tasks only)
    if (myTasksOnly && user) {
      filtered = filtered.filter(task => 
        task.assigned_to.includes(user.id)
      );
    }

    return filtered;
  }, [tasks, selectedTaskType, selectedTeamId, myTasksOnly, user]);

  // Task operations
  const handleCreateTask = useCallback(async (
    title: string,
    description: string,
    teamSelection: { type: 'personal' | 'team'; teamId?: string },
    dueDate?: string,
    assignedTo?: string[],
    status?: 'todo' | 'in-progress' | 'done',
    _sourceIssueId?: string,
    splitPerMember?: boolean,
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const teamData = teamSelection.type === 'team' && teamSelection.teamId
        ? teams.find(t => t.id === teamSelection.teamId)
        : null;

      const finalAssignedTo = assignedTo && assignedTo.length > 0 ? assignedTo : [user.id];

      // Split per member: create individual tasks linked by group_id
      if (splitPerMember && finalAssignedTo.length > 1) {
        const groupId = crypto.randomUUID();
        const taskRows = finalAssignedTo.map((assigneeId: string) => ({
          title: title.trim(),
          description,
          status: status || 'todo',
          task_type: teamSelection.type,
          team_id: teamData?.id || null,
          team_name: teamData?.name || null,
          assigned_to: [assigneeId],
          user_id: user.id,
          due_date: dueDate || null,
          is_archived: false,
          group_id: groupId,
        }));

        const { error } = await supabase
          .from('fast_tasks')
          .insert(taskRows);

        if (error) throw error;

        toast.success(`${finalAssignedTo.length} individual tasks created`);
        refetch();
        return;
      }

      // Default: single shared task
      const taskData = {
        title: title.trim(),
        description,
        status: status || 'todo',
        task_type: teamSelection.type,
        team_id: teamData?.id || null,
        team_name: teamData?.name || null,
        assigned_to: finalAssignedTo,
        user_id: user.id,
        due_date: dueDate || null,
        is_archived: false,
      };

      const { error } = await supabase
        .from('fast_tasks')
        .insert([taskData]);

      if (error) throw error;

      toast.success('Task created successfully');
      refetch();
    } catch (error) {
      logger.error('Failed to create task', error);
      toast.error('Failed to create task');
      throw error;
    }
  }, [teams, refetch]);

  const handleToggleTaskStatus = useCallback(async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const newStatus = task.status === 'done' ? 'todo' : 'done';
    
    try {
      const { error } = await supabase
        .from('fast_tasks')
        .update({ status: newStatus })
        .eq('id', taskId);

      if (error) throw error;

      toast.success(`Task ${newStatus === 'done' ? 'completed' : 'reopened'}`);
      refetch();
    } catch (error) {
      logger.error('Failed to update task status', error);
      toast.error('Failed to update task');
    }
  }, [tasks, refetch]);

  const handleArchiveTask = useCallback(async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('fast_tasks')
        .update({ 
          is_archived: true, 
          archived_at: new Date().toISOString() 
        })
        .eq('id', taskId);

      if (error) throw error;

      toast.success('Task archived');
      refetch();
    } catch (error) {
      logger.error('Failed to archive task', error);
      toast.error('Failed to archive task');
    }
  }, [refetch]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'todo': return 'bg-muted text-foreground';
      case 'in-progress': return 'bg-primary/20 text-primary';
      case 'done': return 'bg-success/10 text-success';
      default: return 'bg-muted text-foreground';
    }
  };

  const ListView = () => (
    <div className="space-y-4">
      {filteredTasks.map(task => {
        const ownerProfile = profiles.find(p => p.id === task.user_id);
        const assignedUserProfiles = task.assigned_to
          .map(userId => profiles.find(p => p.id === userId))
          .filter(Boolean)
          .map(profile => ({
            id: profile!.id,
            full_name: profile!.full_name || 'Unknown User',
            avatar_url: profile!.avatar_url
          }));

        return (
          <Card key={task.id} className="transition-all hover:shadow-md">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      checked={task.status === 'done'}
                      onChange={() => handleToggleTaskStatus(task.id)}
                      className="w-4 h-4 rounded border-border"
                    />
                    <h3 className={`font-medium ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
                      {task.title}
                    </h3>
                    <Badge className={getStatusColor(task.status)}>
                      {task.status}
                    </Badge>
                    {task.task_type === 'team' && task.team_name && (
                      <Badge variant="outline">{task.team_name}</Badge>
                    )}
                  </div>
                  {task.description && (
                    <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Created: {format(new Date(task.created_at), 'MMM d, yyyy')}</span>
                      {task.due_date && (
                        <span>Due: {format(new Date(task.due_date), 'MMM d, yyyy')}</span>
                      )}
                    </div>
                    {(ownerProfile || assignedUserProfiles.length > 0) && (
                      <MultiAssigneeDisplay 
                        owner={ownerProfile}
                        assignees={assignedUserProfiles}
                        size="sm"
                        maxVisible={2}
                        showOwnerFirst={true}
                      />
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleArchiveTask(task.id)}
                >
                  <Archive className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  const KanbanView = () => {
    const todoTasks = filteredTasks.filter(t => t.status === 'todo');
    const inProgressTasks = filteredTasks.filter(t => t.status === 'in-progress');
    const doneTasks = filteredTasks.filter(t => t.status === 'done');

    const KanbanColumn = ({ title, tasks: columnTasks }: {
      title: string;
      tasks: typeof filteredTasks;
    }) => (
      <div className="flex-1 min-w-80">
        <h3 className="font-semibold mb-4 text-center p-2 bg-muted rounded">
          {title} ({columnTasks.length})
        </h3>
        <div className="space-y-3">
          {columnTasks.map(task => (
            <Card key={task.id} className="cursor-pointer hover:shadow-md transition-all">
              <CardContent className="p-3">
                <h4 className="font-medium mb-1">{task.title}</h4>
                {task.description && (
                  <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {task.task_type === 'team' && task.team_name && (
                      <Badge variant="outline" className="text-xs">{task.team_name}</Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleArchiveTask(task.id)}
                  >
                    <Archive className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );

    return (
      <div className="flex flex-col md:flex-row gap-4 md:gap-6 pb-4">
        <KanbanColumn title="To Do" tasks={todoTasks} />
        <KanbanColumn title="In Progress" tasks={inProgressTasks} />
        <KanbanColumn title="Done" tasks={doneTasks} />
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={refetch}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tasks</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === 'list' ? 'kanban' : 'list')}
          >
            {viewMode === 'list' ? <Kanban className="w-4 h-4" /> : <List className="w-4 h-4" />}
            {viewMode === 'list' ? 'Kanban View' : 'List View'}
          </Button>
          
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Task
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-muted rounded-lg">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4" />
          <Label className="text-sm font-medium">Filters:</Label>
        </div>
        
        <Tabs value={selectedTaskType} onValueChange={(value) => setSelectedTaskType(value as any)}>
          <TabsList className="h-8">
            <TabsTrigger value="all" className="text-xs">All ({tasks.length})</TabsTrigger>
            <TabsTrigger value="personal" className="text-xs">
              Personal ({tasks.filter(t => t.task_type === 'personal').length})
            </TabsTrigger>
            <TabsTrigger value="team" className="text-xs">
              Team ({tasks.filter(t => t.task_type === 'team').length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
          <SelectTrigger className="w-40 h-8">
            <SelectValue placeholder="All teams" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All teams</SelectItem>
            <SelectItem value="personal">Personal only</SelectItem>
            {teams.map(team => (
              <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center space-x-2">
          <Switch
            id="my-tasks-only"
            checked={myTasksOnly}
            onCheckedChange={setMyTasksOnly}
          />
          <Label htmlFor="my-tasks-only" className="text-sm">
            My tasks only
          </Label>
        </div>
      </div>

      {/* Content */}
      <div className="mt-6">
        {viewMode === 'list' ? <ListView /> : <KanbanView />}
      </div>

      {filteredTasks.length === 0 && (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-muted-foreground mb-2">No tasks found</h3>
          <p className="text-muted-foreground">
            {tasks.length === 0 
              ? "Create your first task to get started!" 
              : "Try adjusting your filters to see more tasks."
            }
          </p>
        </div>
      )}

      {/* Modals */}
      <EnhancedAddTaskModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onAddTask={handleCreateTask}
      />
    </div>
  );
};