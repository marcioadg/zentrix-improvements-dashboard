import React, { useState, useEffect } from 'react';
import { useTasksPageOptimized } from '@/hooks/useTasksPageOptimized';
import { useTaskTeamSelection } from '@/hooks/useTaskTeamSelection';
import { logger } from '@/utils/logger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { AlertTriangle, Clock, Users, CheckCircle2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

export const TasksPageOptimized = () => {
  const [performanceStart] = useState(performance.now());
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>(['personal']);
  
  // Use optimized tasks page hook with selected team IDs
  const { 
    tasks, 
    teams,
    taskCounts, 
    loading, 
    error, 
    refetch 
  } = useTasksPageOptimized(selectedTeamIds);

  const { updateSelection } = useTaskTeamSelection(teams);

// Performance monitoring
  useEffect(() => {
    if (!loading) {
      const loadTime = performance.now() - performanceStart;
      logger.info(`TasksPageOptimized loaded in ${loadTime.toFixed(2)}ms`);
    }
  }, [loading, performanceStart]);

  const handleTeamSelection = (teamId: string, checked: boolean) => {
    let newSelectedTeamIds;
    if (checked) {
      newSelectedTeamIds = [...selectedTeamIds, teamId];
    } else {
      newSelectedTeamIds = selectedTeamIds.filter(id => id !== teamId);
    }
    setSelectedTeamIds(newSelectedTeamIds);
    updateSelection(newSelectedTeamIds);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-center min-h-96">
          <LoadingSpinner size="lg" label="Loading optimized tasks..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Card className="border-red-200 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              Error Loading Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700 mb-4">{error}</p>
            <Button onClick={refetch} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalTasks = taskCounts.reduce((sum, count) => sum + count.totalCount, 0);
  const completedTasks = tasks.filter(task => task.status === 'done').length;
  const inProgressTasks = tasks.filter(task => task.status === 'inprogress').length;
  const todoTasks = tasks.filter(task => task.status === 'todo').length;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Optimized Tasks</h1>
        <p className="text-muted-foreground">
          High-performance task management with real-time updates
        </p>
      </div>

      {/* Team Selection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Selection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="personal"
                checked={selectedTeamIds.includes('personal')}
                onCheckedChange={(checked) => handleTeamSelection('personal', checked as boolean)}
              />
              <label htmlFor="personal" className="text-sm font-medium">
                Personal Tasks
                <Badge variant="secondary" className="ml-2">
                  {taskCounts.find(tc => tc.id === 'personal')?.totalCount || 0}
                </Badge>
              </label>
            </div>
            
            {teams.map(team => (
              <div key={team.id} className="flex items-center space-x-2">
                <Checkbox
                  id={team.id}
                  checked={selectedTeamIds.includes(team.id)}
                  onCheckedChange={(checked) => handleTeamSelection(team.id, checked as boolean)}
                />
                <label htmlFor={team.id} className="text-sm font-medium">
                  {team.name}
                  <Badge variant="secondary" className="ml-2">
                    {taskCounts.find(tc => tc.id === team.id)?.totalCount || 0}
                  </Badge>
                </label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Task Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTasks}</div>
            <p className="text-xs text-muted-foreground">
              Across {selectedTeamIds.length} selected team{selectedTeamIds.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">To Do</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{todoTasks}</div>
            <p className="text-xs text-muted-foreground">
              {totalTasks > 0 ? ((todoTasks / totalTasks) * 100).toFixed(1) : 0}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{inProgressTasks}</div>
            <p className="text-xs text-muted-foreground">
              {totalTasks > 0 ? ((inProgressTasks / totalTasks) * 100).toFixed(1) : 0}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{completedTasks}</div>
            <p className="text-xs text-muted-foreground">
              {totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : 0}% of total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tasks List */}
      <Card>
        <CardHeader>
          <CardTitle>Tasks ({tasks.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No tasks found for the selected teams.</p>
              <Button className="mt-4" onClick={refetch}>
                Refresh Tasks
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map(task => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex-1">
                    <h3 className="font-medium">{task.title}</h3>
                    {task.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {task.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge
                        variant={
                          task.status === 'done' 
                            ? 'default' 
                            : task.status === 'inprogress' 
                            ? 'secondary' 
                            : 'outline'
                        }
                      >
                        {task.status === 'todo' ? 'To Do' : 
                         task.status === 'inprogress' ? 'In Progress' : 
                         'Done'}
                      </Badge>
                      <Badge variant="outline">
                        {task.task_type === 'personal' ? 'Personal' : 
                         task.task_type === 'team' ? 'Team' : 
                         'Product'}
                      </Badge>
                      {task.due_date && (
                        <Badge variant="outline" className="text-xs">
                          Due: {new Date(task.due_date).toLocaleDateString()}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TasksPageOptimized;
