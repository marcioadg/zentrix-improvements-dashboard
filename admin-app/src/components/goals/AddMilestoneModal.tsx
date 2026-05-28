import React, { useState } from 'react';
import { useGoalMilestones } from '@/hooks/useGoalMilestones';
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

interface AddMilestoneModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goalId: string;
  goalTitle: string;
}

export const AddMilestoneModal: React.FC<AddMilestoneModalProps> = ({
  open,
  onOpenChange,
  goalId,
  goalTitle,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [progress, setProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addMilestone } = useGoalMilestones(goalId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) return;
    
    setIsSubmitting(true);
    
    try {
      const success = await addMilestone(
        title.trim(),
        description.trim() || undefined,
        dueDate || undefined,
        progress
      );
      
      if (success) {
        setTitle('');
        setDescription('');
        setDueDate('');
        setProgress(0);
        onOpenChange(false);
      }
    } catch (error) {
      logger.error('Error adding milestone:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setTitle('');
      setDescription('');
      setDueDate('');
      setProgress(0);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Milestone</DialogTitle>
          <DialogDescription>
            Add a milestone to track progress for "{goalTitle}"
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
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !title.trim()}>
              {isSubmitting ? 'Adding...' : 'Add Milestone'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};