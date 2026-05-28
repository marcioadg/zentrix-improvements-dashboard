
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';
import { Edit2, Trash2, Calendar, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { FastTask } from '@/hooks/useFastTasks';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

interface FastTaskListProps {
  tasks: FastTask[];
  onToggleTask: (id: string) => void;
  onUpdateTask: (id: string, updates: Partial<FastTask>) => void;
  onDeleteTask: (id: string) => void;
}

export const FastTaskList: React.FC<FastTaskListProps> = ({
  tasks,
  onToggleTask,
  onUpdateTask,
  onDeleteTask,
}) => {
  const [editingTask, setEditingTask] = useState<FastTask | null>(null);
  const [processingTasks, setProcessingTasks] = useState<Set<string>>(new Set());
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    dueDate: '',
  });

  const handleEditTask = (task: FastTask) => {
    setEditingTask(task);
    setEditForm({
      title: task.title,
      description: task.description,
      dueDate: task.dueDate || '',
    });
  };

  const handleSaveEdit = () => {
    if (editingTask && editForm.title.trim()) {
      onUpdateTask(editingTask.id, {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        dueDate: editForm.dueDate || undefined,
      });
      setEditingTask(null);
    }
  };

  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    logger.log('🔄 FastTaskList: Toggle task clicked', {
      taskId,
      currentStatus,
      isProcessing: processingTasks.has(taskId),
      timestamp: new Date().toISOString()
    });

    // Prevent multiple rapid clicks
    if (processingTasks.has(taskId)) {
      logger.warn('⚠️ FastTaskList: Task already being processed, ignoring click', { taskId });
      toast.warning('Please wait, task is being updated...');
      return;
    }

    try {
      // Add to processing set
      setProcessingTasks(prev => new Set([...prev, taskId]));
      
      logger.log('📝 FastTaskList: Calling onToggleTask', { taskId });
      await onToggleTask(taskId);
      
      logger.log('✅ FastTaskList: Task toggle completed successfully', { taskId });
      
    } catch (error) {
      logger.error('❌ FastTaskList: Error toggling task', { 
        taskId, 
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      toast.error('Failed to update task. Please try again.');
    } finally {
      // Remove from processing set after a short delay
      setTimeout(() => {
        setProcessingTasks(prev => {
          const newSet = new Set(prev);
          newSet.delete(taskId);
          return newSet;
        });
      }, 500);
    }
  };

  const getStatusBadge = (status: FastTask['status']) => {
    switch (status) {
      case "todo":
        return <Badge variant="secondary">To Do</Badge>;
      case "in-progress":
        return <Badge variant="default">In Progress</Badge>;
      case "done":
        return <Badge variant="outline" className="bg-success/5 text-success">Done</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8">
        <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No tasks found. Add your first task to get started!</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {tasks.map((task) => {
          const isProcessing = processingTasks.has(task.id);
          const isOptimistic = task.isOptimistic;
          
          return (
            <div
              key={task.id}
              className={`py-2 border-b border-border transition-colors duration-150 ${
                task.status === 'done' ? 'opacity-60' : ''
              } ${isOptimistic ? 'border-dashed opacity-70' : ''} ${
                isProcessing ? 'bg-muted/50' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="relative">
                  <Checkbox
                    checked={task.status === 'done'}
                    onCheckedChange={(checked) => {
                      logger.log('📋 Checkbox change event', {
                        taskId: task.id,
                        checked,
                        currentStatus: task.status,
                        isProcessing
                      });
                      handleToggleTask(task.id, task.status);
                    }}
                    disabled={isProcessing || isOptimistic}
                    className={`mt-1 ${isProcessing ? 'opacity-50' : ''}`}
                  />
                  {isProcessing && (
                    <div className="absolute -top-1 -right-1">
                      <div className="animate-spin rounded-full h-3 w-3 border-2 border-primary border-t-transparent" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className={`text-[13px] font-medium ${task.status === 'done' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                        {task.title}
                      </h3>
                      {isOptimistic && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>Saving...</span>
                        </div>
                      )}
                      {isProcessing && (
                        <div className="flex items-center gap-1 text-xs text-primary">
                          <div className="animate-spin rounded-full h-3 w-3 border border-primary border-t-transparent" />
                          <span>Updating...</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(task.status)}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditTask(task)}
                        disabled={isProcessing || isOptimistic}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteTask(task.id)}
                        className="text-destructive hover:text-destructive/80"
                        disabled={isProcessing || isOptimistic}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {task.description && (
                    <p className="text-[11px] text-muted-foreground">{task.description}</p>
                  )}

                  <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Created: {formatDate(task.createdAt)}
                    </div>
                    
                    {task.dueDate && (
                      <div className={`flex items-center gap-1 ${
                        isOverdue(task.dueDate) && task.status !== 'done'
                          ? 'text-destructive'
                          : ''
                      }`}>
                        <Calendar className="h-3 w-3" />
                        Due: {formatDate(task.dueDate)}
                        {isOverdue(task.dueDate) && task.status !== 'done' && (
                          <span className="text-destructive font-medium">(Overdue)</span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Debug info for troubleshooting */}
                  {process.env.NODE_ENV === 'development' && (
                    <div className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">
                      ID: {task.id} | Status: {task.status} | UserID: {task.userId || 'N/A'} | Type: {task.taskType}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Task Dialog */}
      <Dialog open={!!editingTask} onOpenChange={() => setEditingTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Task title"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Task description (optional)"
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Due Date</label>
              <DatePicker
                date={editForm.dueDate ? new Date(editForm.dueDate + 'T00:00:00') : undefined}
                onSelect={(d) => setEditForm(prev => ({ ...prev, dueDate: d ? format(d, 'yyyy-MM-dd') : '' }))}
                placeholder="Pick a due date"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingTask(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
