
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';
import { useSimpleStrategy, QuarterlyPriority } from '@/contexts/SimpleStrategyContext';

interface QuarterlyPriorityModalProps {
  isOpen: boolean;
  onClose: () => void;
  priority: QuarterlyPriority | null;
}

export const QuarterlyPriorityModal: React.FC<QuarterlyPriorityModalProps> = ({
  isOpen,
  onClose,
  priority,
}) => {
  const { addQuarterlyPriority, updateQuarterlyPriority } = useSimpleStrategy();
  const [formData, setFormData] = useState({
    title: '',
    owner: '',
    deadline: '',
    status: 'not-started' as QuarterlyPriority['status'],
  });

  useEffect(() => {
    if (priority) {
      setFormData({
        title: priority.title,
        owner: priority.owner,
        deadline: priority.deadline,
        status: priority.status,
      });
    } else {
      setFormData({
        title: '',
        owner: '',
        deadline: '',
        status: 'not-started',
      });
    }
  }, [priority]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    if (priority) {
      updateQuarterlyPriority(priority.id, formData);
    } else {
      addQuarterlyPriority(formData);
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {priority ? 'Edit Priority' : 'Add Quarterly Priority'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Priority title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="owner">Owner</Label>
            <Input
              id="owner"
              value={formData.owner}
              onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
              placeholder="Who is responsible?"
            />
          </div>

          <div className="space-y-2">
            <Label>Deadline</Label>
            <DatePicker
              date={formData.deadline ? new Date(formData.deadline + 'T00:00:00') : undefined}
              onSelect={(d) => setFormData({ ...formData, deadline: d ? format(d, 'yyyy-MM-dd') : '' })}
              placeholder="Pick a deadline"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value: QuarterlyPriority['status']) =>
                setFormData({ ...formData, status: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="not-started">Not Started</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!formData.title.trim()}>
              {priority ? 'Update' : 'Add'} Priority
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
