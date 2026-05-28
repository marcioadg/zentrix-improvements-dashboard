import React, { useState } from 'react';
import { Plus, Archive, List, Kanban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useSimplifiedTasks } from '@/hooks/useSimplifiedTasks';
import { useUserTeams } from '@/hooks/useUserTeams';
import { EnhancedAddTaskModal } from '@/components/modals/EnhancedAddTaskModal';
import { MultiAssigneeDisplay } from '@/components/shared/MultiAssigneeDisplay';
import { useProfiles } from '@/hooks/useProfiles';
import { format } from 'date-fns';
import { logger } from '@/utils/logger';

export const SimplifiedTasksPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [showArchived, setShowArchived] = useState(false);
  const [selectedTaskType, setSelectedTaskType] = useState<'all' | 'personal' | 'team'>('all');
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [myTasksOnly, setMyTasksOnly] = useState(false);
  
  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { teams } = useUserTeams();
  const { tasks, loading, createTask, toggleTaskStatus, archiveTask } = useSimplifiedTasks({
    showArchived,
    taskType: selectedTaskType,
    teamIds: selectedTeamIds,
    myTasksOnly
  });

  const handleCreateTask = async (
    title: string, 
    description: string, 
    teamSelection: { type: 'personal' | 'team'; teamId?: string }, 
    dueDate?: string, 
    assignedTo?: string[], 
    status?: 'todo' | 'in-progress' | 'done'
  ) => {
    try {
      const teamData = teamSelection.type === 'team' && teamSelection.teamId 
        ? teams?.find(t => t.id === teamSelection.teamId)
        : null;

      await createTask(title, {
        description,
        task_type: teamSelection.type,
        team_id: teamData?.id,
        team_name: teamData?.name,
        due_date: dueDate || undefined,
        assigned_to: assignedTo && assignedTo.length > 0 ? assignedTo : undefined,
        status: status || 'todo',
      });
    } catch (error) {
      logger.error('Failed to create task:', error);
      throw error;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'todo': return 'bg-muted text-foreground';
      case 'in-progress': return 'bg-primary/20 text-primary';
      case 'done': return 'bg-success/10 text-success';
      default: return 'bg-muted text-foreground';
    }
  };

  // Get all unique user IDs for profile fetching (both owners and assignees)
  const allUserIds = Array.from(new Set([
    ...tasks.flatMap(task => task.assigned_to || []),
    ...tasks.map(task => task.user_id).filter(Boolean)
  ]));
  const { profiles } = useProfiles();

  const ListView = () => {    
    return (
      <div className="space-y-4">
        {tasks.map(task => {
          // Get owner profile
          const ownerProfile = task.user_id ? profiles.find(p => p.id === task.user_id) : undefined;
          
          // Get assigned user profiles
          const assignedUserIds = task.assigned_to || [];
          const assignedUserProfiles = assignedUserIds
            .map((userId: string) => profiles.find(p => p.id === userId))
            .filter(Boolean)
            .map((profile: any) => ({
              id: profile.id,
              full_name: profile.full_name || 'Unknown User',
              avatar_url: profile.avatar_url
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
                        onChange={() => toggleTaskStatus(task.id)}
                        className="w-4 h-4 rounded border-border"
                      />
                      <h3 className={`font-medium ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
                        {task.title}
                      </h3>
                      <Badge className={getStatusColor(task.status)}>
                        {task.status}
                      </Badge>
                      {task.task_type === 'team' && (
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
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => archiveTask(task.id)}
                    >
                      <Archive className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  const KanbanView = () => {
    const todoTasks = tasks.filter(t => t.status === 'todo');
    const inProgressTasks = tasks.filter(t => t.status === 'in-progress');
    const doneTasks = tasks.filter(t => t.status === 'done');

    const KanbanColumn = ({ title, tasks: columnTasks, status }: {
      title: string;
      tasks: typeof tasks;
      status: string;
    }) => (
      <div className="flex-1 min-w-80">
        <h3 className="font-semibold mb-4 text-center p-2 bg-muted rounded">{title}</h3>
        <div className="space-y-3">
          {columnTasks.map(task => {
            // Get owner profile
            const ownerProfile = task.user_id ? profiles.find(p => p.id === task.user_id) : undefined;
            
            // Get assigned user profiles
            const assignedUserIds = task.assigned_to || [];
            const assignedUserProfiles = assignedUserIds
              .map((userId: string) => profiles.find(p => p.id === userId))
              .filter(Boolean)
              .map((profile: any) => ({
                id: profile.id,
                full_name: profile.full_name || 'Unknown User',
                avatar_url: profile.avatar_url
              }));

            return (
              <Card key={task.id} className="cursor-pointer hover:shadow-md transition-all">
                <CardContent className="p-3">
                  <h4 className="font-medium mb-1">{task.title}</h4>
                  {task.description && (
                    <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {task.task_type === 'team' && (
                        <Badge variant="outline" className="text-xs">{task.team_name}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {(ownerProfile || assignedUserProfiles.length > 0) && (
                        <MultiAssigneeDisplay 
                          owner={ownerProfile}
                          assignees={assignedUserProfiles}
                          size="sm"
                          maxVisible={1}
                          showOwnerFirst={true}
                        />
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => archiveTask(task.id)}
                      >
                        <Archive className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );

    return (
      <div className="flex flex-col md:flex-row gap-4 md:gap-6 pb-4">
        <KanbanColumn title="To Do" tasks={todoTasks} status="todo" />
        <KanbanColumn title="In Progress" tasks={inProgressTasks} status="in-progress" />
        <KanbanColumn title="Done" tasks={doneTasks} status="done" />
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

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Simplified Tasks</h1>
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
          
          <EnhancedAddTaskModal
            open={isCreateModalOpen}
            onOpenChange={setIsCreateModalOpen}
            onAddTask={handleCreateTask}
          />
        </div>
      </div>

      <Tabs value={selectedTaskType} onValueChange={(value) => setSelectedTaskType(value as any)}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="all">All Tasks ({tasks.length})</TabsTrigger>
            <TabsTrigger value="personal">Personal ({tasks.filter(t => t.task_type === 'personal').length})</TabsTrigger>
            <TabsTrigger value="team">Team ({tasks.filter(t => t.task_type === 'team').length})</TabsTrigger>
          </TabsList>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="my-tasks-only"
              checked={myTasksOnly}
              onCheckedChange={setMyTasksOnly}
            />
            <Label htmlFor="my-tasks-only" className="text-sm font-medium">
              Only my tasks
            </Label>
          </div>
        </div>

        <TabsContent value={selectedTaskType} className="mt-6">
          {viewMode === 'list' ? <ListView /> : <KanbanView />}
        </TabsContent>
      </Tabs>

      {tasks.length === 0 && (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-muted-foreground mb-2">No tasks found</h3>
          <p className="text-muted-foreground">Create your first task to get started!</p>
        </div>
      )}
    </div>
  );
};