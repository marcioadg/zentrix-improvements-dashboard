
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2 } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'inprogress' | 'done';
  task_type: 'personal';
  created_at: string;
  is_archived: boolean;
}

interface StaticTaskListProps {
  tasks: Task[];
  onStatusChange: (taskId: string, status: 'todo' | 'inprogress' | 'done') => void;
  onDelete: (taskId: string) => void;
}

export const StaticTaskList: React.FC<StaticTaskListProps> = ({
  tasks,
  onStatusChange,
  onDelete
}) => {
  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">No tasks found. This is the static version!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <Card key={task.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 flex-1">
                <Checkbox
                  checked={task.status === 'done'}
                  onCheckedChange={(checked) => 
                    onStatusChange(task.id, checked ? 'done' : 'todo')
                  }
                />
                <div className="flex-1">
                  <h3 className={`font-medium ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
                    {task.title}
                  </h3>
                  {task.description && (
                    <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Badge variant={task.status === 'done' ? 'secondary' : 'default'}>
                  {task.status === 'todo' ? 'To Do' : task.status === 'inprogress' ? 'In Progress' : 'Done'}
                </Badge>
                
                <Badge variant="outline">Personal</Badge>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(task.id)}
                  className="h-8 w-8 p-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
