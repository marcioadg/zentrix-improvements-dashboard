
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
  task_type: 'personal' | 'team' | 'product';
  team_id?: string;
  created_at: string;
}

interface SimpleTaskListProps {
  tasks: Task[];
  onStatusChange: (taskId: string, status: 'todo' | 'inprogress' | 'done') => void;
  onDelete: (taskId: string) => void;
}

export const SimpleTaskList: React.FC<SimpleTaskListProps> = ({
  tasks,
  onStatusChange,
  onDelete
}) => {
  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">No tasks found. Create your first task to get started!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-0">
      {tasks.map((task) => (
        <div key={task.id} className="py-2 border-b border-border transition-colors duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 flex-1">
                <Checkbox
                  checked={task.status === 'done'}
                  onCheckedChange={(checked) =>
                    onStatusChange(task.id, checked ? 'done' : 'todo')
                  }
                />
                <div className="flex-1">
                  <h3 className={`text-[13px] font-medium ${task.status === 'done' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {task.title}
                  </h3>
                  {task.description && (
                    <p className="text-[11px] text-muted-foreground mt-1">{task.description}</p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Badge variant={task.status === 'done' ? 'secondary' : 'default'}>
                  {task.status === 'todo' ? 'To Do' : task.status === 'inprogress' ? 'In Progress' : 'Done'}
                </Badge>
                
                {task.task_type === 'personal' && (
                  <Badge variant="outline">Personal</Badge>
                )}
                
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
        </div>
      ))}
    </div>
  );
};
