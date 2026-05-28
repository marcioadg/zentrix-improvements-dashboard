
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { useSimpleStrategy, QuarterlyPriority } from '@/contexts/SimpleStrategyContext';
import { QuarterlyPriorityModal } from '../modals/QuarterlyPriorityModal';

export const QuarterlyPrioritiesSection: React.FC = () => {
  const { data, removeQuarterlyPriority } = useSimpleStrategy();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPriority, setEditingPriority] = useState<QuarterlyPriority | null>(null);

  const handleEdit = (priority: QuarterlyPriority) => {
    setEditingPriority(priority);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingPriority(null);
    setIsModalOpen(true);
  };

  const getStatusColor = (status: QuarterlyPriority['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-success/10 text-success';
      case 'in-progress':
        return 'bg-primary/10 text-primary';
      case 'not-started':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base font-semibold">
            90-Day Priorities
          </Label>
          <p className="text-sm text-muted-foreground mt-1">
            Top 5 priorities for the next 90 days
          </p>
        </div>
        {data.quarterlyPriorities.length < 5 && (
          <Button onClick={handleAdd} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Priority
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {data.quarterlyPriorities.map((priority) => (
          <div
            key={priority.id}
            className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h4 className="font-medium">{priority.title}</h4>
                <Badge className={getStatusColor(priority.status)}>
                  {priority.status.replace('-', ' ')}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Owner: {priority.owner || 'Unassigned'}</span>
                <span>Due: {priority.deadline || 'No deadline'}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEdit(priority)}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeQuarterlyPriority(priority.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}

        {data.quarterlyPriorities.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No 90-day priorities yet.</p>
            <Button onClick={handleAdd} size="sm" className="mt-2">
              Add your first priority
            </Button>
          </div>
        )}
      </div>

      <QuarterlyPriorityModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingPriority(null);
        }}
        priority={editingPriority}
      />
    </div>
  );
};
