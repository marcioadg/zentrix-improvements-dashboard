import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckSquare, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTasksGoalsSummary } from '@/hooks/useTasksGoalsSummary';
import { formatDistanceToNow } from 'date-fns';

export const TasksGoalsSummary: React.FC = () => {
  const { recentTasks, loading, markTaskComplete } = useTasksGoalsSummary();

  if (loading) {
    return (
      <Card className="h-[400px]">
        <CardHeader>
          <CardTitle>Your Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-[400px]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>Your Tasks</CardTitle>
        <Button variant="outline" size="sm" asChild>
          <Link to="/tasks">
            <Plus className="w-4 h-4 mr-2" />
            Add New
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 overflow-y-auto max-h-[320px]">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <CheckSquare className="w-4 h-4" />
            <h4 className="text-sm font-medium">Recent Tasks</h4>
          </div>
          <div className="space-y-2">
            {recentTasks.slice(0, 3).map((task) => (
              <div key={task.id} className="flex items-center gap-3 p-2 bg-muted/50 rounded">
                <button
                  type="button"
                  onClick={() => markTaskComplete(task.id)}
                  aria-label={`Mark "${task.title}" as complete`}
                  className="flex items-center justify-center min-w-[44px] min-h-[44px] -m-2 p-0 shrink-0 group"
                >
                  <span className="block w-4 h-4 border-2 border-primary rounded group-hover:bg-primary group-hover:border-primary transition-colors group-focus-visible:outline-none group-focus-visible:ring-2 group-focus-visible:ring-primary group-focus-visible:ring-offset-1" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{task.title}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {task.priority}
                    </Badge>
                    {task.due_date && (
                      <span className="text-xs text-muted-foreground">
                        Due {formatDistanceToNow(new Date(task.due_date), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {recentTasks.length === 0 && (
              <p className="text-sm text-muted-foreground">No pending tasks</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};