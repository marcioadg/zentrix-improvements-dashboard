
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';
import { Trash2, Edit, Save, X, Calendar, AlertCircle, Users } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'done';
  task_type: 'personal' | 'team';
  team_id?: string;
  team_name?: string;
  created_at: string;
  is_archived: boolean;
  due_date?: string;
}

interface EnhancedStaticTaskListProps {
  tasks: Task[];
  onStatusChange: (taskId: string, status: 'todo' | 'in-progress' | 'done') => void;
  onUpdateTask: (taskId: string, updates: Partial<Pick<Task, 'title' | 'description' | 'due_date'>>) => void;
  onDelete: (taskId: string) => void;
}

export const EnhancedStaticTaskList: React.FC<EnhancedStaticTaskListProps> = ({
  tasks,
  onStatusChange,
  onUpdateTask,
  onDelete
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    due_date: ''
  });

  const startEditing = (task: Task) => {
    setEditingId(task.id);
    setEditForm({
      title: task.title,
      description: task.description || '',
      due_date: task.due_date || ''
    });
  };

  const saveEdit = () => {
    if (editingId && editForm.title.trim()) {
      onUpdateTask(editingId, {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        due_date: editForm.due_date || undefined
      });
      setEditingId(null);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done': return 'secondary';
      case 'in-progress': return 'default';
      default: return 'outline';
    }
  };

  const getTaskTypeColor = (taskType: string) => {
    switch (taskType) {
      case 'team': return 'bg-primary/10 text-primary border-primary/30';
      case 'personal': return 'bg-success/10 text-success border-success/30';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date() && new Date().toDateString() !== new Date(dueDate).toDateString();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

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
    <div className="space-y-3">
      {tasks.map((task) => (
        <Card key={task.id}>
          <CardContent className="p-4">
            {editingId === task.id ? (
              <div className="space-y-4">
                <Input
                  value={editForm.title}
                  onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                  placeholder="Task title"
                />
                <Textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                  placeholder="Task description"
                  rows={2}
                />
                <div>
                  <label className="text-sm font-medium mb-2 block">Due Date</label>
                  <DatePicker
                    date={editForm.due_date ? new Date(editForm.due_date + 'T00:00:00') : undefined}
                    onSelect={(d) => setEditForm({...editForm, due_date: d ? format(d, 'yyyy-MM-dd') : ''})}
                    placeholder="Pick a due date"
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveEdit}>
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={cancelEdit}>
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1">
                  <Checkbox
                    checked={task.status === 'done'}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        onStatusChange(task.id, 'done');
                      } else {
                        onStatusChange(task.id, task.status === 'in-progress' ? 'in-progress' : 'todo');
                      }
                    }}
                  />
                  <div className="flex-1">
                    <h3 className={`font-medium ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
                      {task.title}
                    </h3>
                    {task.description && (
                      <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                    )}
                    {task.due_date && (
                      <div className="flex items-center gap-1 mt-2">
                        {isOverdue(task.due_date) && task.status !== 'done' && (
                          <AlertCircle className="h-3 w-3 text-destructive" />
                        )}
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span className={`text-xs ${isOverdue(task.due_date) && task.status !== 'done' ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                          Due {formatDate(task.due_date)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Badge variant={getStatusColor(task.status) as any}>
                    {task.status === 'todo' ? 'Not Started' : task.status === 'in-progress' ? 'In Progress' : 'Completed'}
                  </Badge>
                  
                  <Badge className={getTaskTypeColor(task.task_type)}>
                    {task.task_type === 'team' ? (
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {task.team_name || 'Team'}
                      </div>
                    ) : (
                      'Personal'
                    )}
                  </Badge>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => startEditing(task)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  
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
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
