import React, { useState, useEffect } from 'react';
import { GoalMilestone, useGoalMilestones } from '@/hooks/useGoalMilestones';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ElasticSlider } from '@/components/ui/elastic-slider';
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';
import { logger } from '@/utils/logger';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface EditMilestoneModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  milestone: GoalMilestone;
}

export const EditMilestoneModal: React.FC<EditMilestoneModalProps> = ({
  open,
  onOpenChange,
  milestone,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [progress, setProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { updateMilestone } = useGoalMilestones(milestone.goal_id);

  // Initialize form with milestone data
  useEffect(() => {
    if (milestone) {
      setTitle(milestone.title);
      setDescription(milestone.description || '');
      setDueDate(milestone.due_date || '');
      setProgress(milestone.progress || 0);
    }
  }, [milestone]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) return;
    
    setIsSubmitting(true);
    
    try {
      const success = await updateMilestone(milestone.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        due_date: dueDate || undefined,
        progress: progress,
      });
      
      if (success) {
        onOpenChange(false);
      }
    } catch (error) {
      logger.error('Error updating milestone:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Milestone</DialogTitle>
          <DialogDescription>
            Update the milestone details
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter milestone title"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Due Date</Label>
            <DatePicker
              date={dueDate ? new Date(dueDate + 'T00:00:00') : undefined}
              onSelect={(d) => setDueDate(d ? format(d, 'yyyy-MM-dd') : '')}
              placeholder="Pick a target date"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="progress">Progress: {progress}%</Label>
              <ElasticSlider
                value={[progress]}
                onValueChange={(value) => setProgress(value[0])}
                max={100}
                step={5}
                className="w-full"
              />
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !title.trim()}>
              {isSubmitting ? 'Updating...' : 'Update Milestone'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};