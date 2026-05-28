import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Users, CheckCircle2, Clock, AlertTriangle, Loader2, Calendar, Search } from 'lucide-react';
import { useFastTasks, FastTask } from '@/hooks/useFastTasks';
import { useUserTeams } from '@/hooks/useUserTeams';
import { EditFastTaskModal } from '@/components/modals/EditFastTaskModal';
import { TaskSection } from './TaskSection';
import { celebrate } from '@/lib/celebration';
import { TasksSkeleton } from './TasksSkeleton';
import { logger } from '@/utils/logger';

export const TasksPageRefactored = () => {
  logger.log('🔄 TasksPageRefactored: Component rendering with new layout');
  const {
    tasks,
    loading,
    addTask,
    updateTask,
    archiveTask,
    pendingArchives,
    undoArchive,
    taskCounts
  } = useFastTasks();

  const { teams } = useUserTeams();

  const [editingTask, setEditingTask] = useState<FastTask | null>(null);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>(['personal']);
  const [searchTerm, setSearchTerm] = useState('');

  // Team options including personal
  const teamOptions = useMemo(() => [
    { id: 'personal', name: 'Personal', color: 'var(--text-secondary)' },
    ...teams.map(team => ({
      id: team.id,
      name: team.name,
      color: 'var(--text-secondary)'
    }))
  ], [teams]);

  // Filter tasks based on selected teams and search
  const filteredTasks = useMemo(() => {
    let filtered = tasks.filter(task => {
      // Filter by team selection
      if (task.taskType === 'personal') {
        if (!selectedTeamIds.includes('personal')) return false;
      } else if (task.taskType === 'team' && task.teamId) {
        if (!selectedTeamIds.includes(task.teamId)) return false;
      }
      
      // Filter by search term
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return task.title.toLowerCase().includes(searchLower) ||
               task.description?.toLowerCase().includes(searchLower) ||
               task.teamName?.toLowerCase().includes(searchLower);
      }
      
      return true;
    });
    
    return filtered;
  }, [tasks, selectedTeamIds, searchTerm]);

  // Group tasks by status
  const tasksByStatus = useMemo(() => ({
    todo: filteredTasks.filter(t => t.status === 'todo'),
    inprogress: filteredTasks.filter(t => t.status === 'in-progress'), 
    done: filteredTasks.filter(t => t.status === 'done')
  }), [filteredTasks]);

  // Count tasks by status
  const filteredTaskCounts = useMemo(() => ({
    todo: tasksByStatus.todo.length,
    inprogress: tasksByStatus.inprogress.length,
    done: tasksByStatus.done.length,
    total: filteredTasks.length
  }), [tasksByStatus, filteredTasks]);

  const handleTeamToggle = useCallback((teamId: string) => {
    setSelectedTeamIds(prev => 
      prev.includes(teamId) 
        ? prev.filter(id => id !== teamId)
        : [...prev, teamId]
    );
  }, []);

  const handleAddTask = useCallback(async (
    title: string, 
    description: string, 
    status: 'todo' | 'inprogress' | 'done',
    taskType: 'personal' | 'team',
    teamId?: string,
    dueDate?: string
  ) => {
    try {
      const normalizedStatus: 'todo' | 'in-progress' | 'done' = status === 'inprogress' ? 'in-progress' : status;
      if (taskType === 'personal') {
        await addTask(title, description, dueDate, 'personal', undefined, undefined, undefined, normalizedStatus);
      } else {
        await addTask(title, description, dueDate, 'team', teamId, undefined, undefined, normalizedStatus);
      }
    } catch (error) {
      logger.error('Failed to create task:', error);
      throw error;
    }
  }, [addTask]);

  const handleEditTask = useCallback((task: FastTask) => {
    logger.log('🔧 TasksPageRefactored: Starting task edit', { taskId: task.id, task });
    setEditingTask(task);
  }, []);

  const handleUpdateTask = useCallback(async (taskId: string, updates: Partial<FastTask>) => {
    try {
      logger.log('🔧 TasksPageRefactored: Updating task', { taskId, updates });
      await updateTask(taskId, updates);
      setEditingTask(null);
    } catch (error) {
      logger.error('❌ TasksPageRefactored: Failed to update task:', error);
      throw error;
    }
  }, [updateTask]);

  const handleToggleTask = useCallback(async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    
    // Celebrate when task is completed
    if (newStatus === 'done') {
      celebrate();
    }
    
    await updateTask(taskId, { status: newStatus });
  }, [tasks, updateTask]);

  // Show loading state
  if (loading) {
    return <TasksSkeleton taskCount={6} showFilters={true} showQuickAdd={false} />;
  }

  return (
    <div className="space-y-6 animate-content-in">
      {/* Header */}
      <div>
        <h1 className="mobile-h3 tracking-tight mb-2">Tasks</h1>
        <p className="mobile-body text-muted-foreground">
          Manage your personal and team tasks efficiently
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search tasks..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-muted/30 border-0 focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-primary transition-all duration-200"
        />
      </div>

      {/* Team Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Filter by Teams
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {teamOptions.map(team => (
              <div key={team.id} className="flex items-center space-x-2">
                <Checkbox
                  id={team.id}
                  checked={selectedTeamIds.includes(team.id)}
                  onCheckedChange={() => handleTeamToggle(team.id)}
                />
                <label
                  htmlFor={team.id}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2 cursor-pointer"
                >
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: team.color }}
                  />
                  <span className="truncate">{team.name}</span>
                </label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Task Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">To Do</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{filteredTaskCounts.todo}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{filteredTaskCounts.inprogress}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{filteredTaskCounts.done}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredTaskCounts.total}</div>
          </CardContent>
        </Card>
      </div>

      {/* Task Sections - Stacked vertically with consistent alignment */}
      <div className="space-y-6 -mx-0">
        {/* In Progress Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <h2 className="text-lg font-semibold">In Progress</h2>
            <span className="text-sm font-normal bg-muted px-2 py-1 rounded-full">
              {filteredTaskCounts.inprogress}
            </span>
          </div>
          <TaskSection
            title="In Progress"
            status="inprogress"
            tasks={tasksByStatus.inprogress}
            count={filteredTaskCounts.inprogress}
            teams={teams}
            onAddTask={handleAddTask}
            onToggleTask={handleToggleTask}
            onUpdateTask={handleUpdateTask}
            onArchiveTask={archiveTask}
            onEditTask={handleEditTask}
            pendingArchives={pendingArchives}
            onUndoArchive={undoArchive}
            hideHeader={true}
          />
        </div>

        {/* To Do Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">To Do</h2>
            <span className="text-sm font-normal bg-muted px-2 py-1 rounded-full">
              {filteredTaskCounts.todo}
            </span>
          </div>
          <TaskSection
            title="To Do"
            status="todo"
            tasks={tasksByStatus.todo}
            count={filteredTaskCounts.todo}
            teams={teams}
            onAddTask={handleAddTask}
            onToggleTask={handleToggleTask}
            onUpdateTask={handleUpdateTask}
            onArchiveTask={archiveTask}
            onEditTask={handleEditTask}
            pendingArchives={pendingArchives}
            onUndoArchive={undoArchive}
            hideHeader={true}
          />
        </div>

        {/* Completed Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <h2 className="text-lg font-semibold">Completed</h2>
            <span className="text-sm font-normal bg-muted px-2 py-1 rounded-full">
              {filteredTaskCounts.done}
            </span>
          </div>
          <TaskSection
            title="Completed"
            status="done"
            tasks={tasksByStatus.done}
            count={filteredTaskCounts.done}
            teams={teams}
            onAddTask={handleAddTask}
            onToggleTask={handleToggleTask}
            onUpdateTask={handleUpdateTask}
            onArchiveTask={archiveTask}
            onEditTask={handleEditTask}
            pendingArchives={pendingArchives}
            onUndoArchive={undoArchive}
            hideHeader={true}
          />
        </div>
      </div>

      {/* Edit Task Modal */}
      {editingTask && (
        <EditFastTaskModal
          open={!!editingTask}
          onOpenChange={(open) => !open && setEditingTask(null)}
          task={editingTask}
          onUpdate={handleUpdateTask}
          teams={teams}
        />
      )}
    </div>
  );
};