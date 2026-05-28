
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';
import { Goal } from '@/hooks/useGoals';
import { logger } from '@/utils/logger';

interface GoalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: Goal | null;
  onSave: (goalData: { title: string; description?: string; status?: Goal['status']; target_date?: string }) => void;
  onDelete?: () => void;
}

export const GoalModal: React.FC<GoalModalProps> = ({
  open,
  onOpenChange,
  goal,
  onSave,
  onDelete
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<Goal['status']>('on_track');
  const [targetDate, setTargetDate] = useState('');

  useEffect(() => {
    if (goal) {
      setTitle(goal.title);
      setDescription(goal.description || '');
      setStatus(goal.status);
      setTargetDate(goal.target_date || '');
    } else {
      setTitle('');
      setDescription('');
      setStatus('on_track');
      setTargetDate('');
    }
  }, [goal]);

  const handleSave = () => {
    // Dispatch optimistic event for onboarding when creating new goals
    if (!goal) {
      logger.log('🎯 GoalModal: Dispatching optimistic goal creation event for onboarding');
      window.dispatchEvent(new CustomEvent('optimistic-goal-creation'));
    }
    
    onSave({
      title,
      description: description || undefined,
      status,
      target_date: targetDate || undefined
    });
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{goal ? 'Edit Goal' : 'Add Goal'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter goal title"
            />
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter goal description"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as Goal['status'])}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="not_started">Not Started</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="on_track">On Track</SelectItem>
                <SelectItem value="at_risk">At Risk</SelectItem>
                <SelectItem value="off_track">Off Track</SelectItem>
                <SelectItem value="complete">Complete</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Target Date</Label>
            <DatePicker
              date={targetDate ? new Date(targetDate + 'T00:00:00') : undefined}
              onSelect={(d) => setTargetDate(d ? format(d, 'yyyy-MM-dd') : '')}
              placeholder="Pick a target date"
            />
          </div>

          <div className="flex justify-between pt-4">
            <div>
              {goal && onDelete && (
                <Button variant="destructive" onClick={handleDelete}>
                  Delete
                </Button>
              )}
            </div>
            <div className="space-x-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={!title.trim()}>
                {goal ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
