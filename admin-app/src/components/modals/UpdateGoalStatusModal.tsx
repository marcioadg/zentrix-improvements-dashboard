
import React, { useState } from 'react';
import { BaseModal } from './BaseModal';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useGoals } from '@/hooks/useGoals';
import { Goal } from '@/hooks/useGoals';

interface UpdateGoalStatusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goalId?: string;
}

export const UpdateGoalStatusModal: React.FC<UpdateGoalStatusModalProps> = ({ 
  open, 
  onOpenChange,
  goalId 
}) => {
  const { goals, updateGoalStatus, updateGoal } = useGoals();
  const [loading, setLoading] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState(goalId || '');
  const [status, setStatus] = useState<Goal['status']>('on_track');
  const [notes, setNotes] = useState('');

  const selectedGoal = goals.find(g => g.id === selectedGoalId);

  React.useEffect(() => {
    if (selectedGoal) {
      setStatus(selectedGoal.status);
    }
  }, [selectedGoal]);

  React.useEffect(() => {
    if (goalId) {
      setSelectedGoalId(goalId);
    }
  }, [goalId]);

  const handleSubmit = async () => {
    if (!selectedGoalId) return;

    setLoading(true);
    try {
      await updateGoalStatus(selectedGoalId, status);
      if (notes.trim()) {
        await updateGoal(selectedGoalId, { description: notes.trim() });
      }
      handleCancel();
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setSelectedGoalId(goalId || '');
    setStatus('on_track');
    setNotes('');
    onOpenChange(false);
  };

  const getStatusColor = (status: Goal['status']) => {
    switch (status) {
      case 'not_started': return 'secondary';
      case 'in_progress': return 'default';
      case 'on_track': return 'default';
      case 'at_risk': return 'destructive';
      case 'off_track': return 'destructive';
      case 'complete': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: Goal['status']) => {
    switch (status) {
      case 'not_started': return 'Not Started';
      case 'in_progress': return 'In Progress';
      case 'on_track': return 'On Track';
      case 'at_risk': return 'At Risk';
      case 'off_track': return 'Off Track';
      case 'complete': return 'Complete';
      default: return status;
    }
  };

  const isValid = selectedGoalId.length > 0;

  return (
    <BaseModal
      open={open}
      onOpenChange={onOpenChange}
      title="Update Goal Status"
      description="Update the status of your goal and add notes"
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      submitText="Update Status"
      submitDisabled={!isValid}
      loading={loading}
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="goal">Select Goal *</Label>
          <Select 
            value={selectedGoalId} 
            onValueChange={(value) => setSelectedGoalId(value)}
            disabled={!!goalId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a goal to update" />
            </SelectTrigger>
            <SelectContent>
              {goals.map((goal) => (
                <SelectItem key={goal.id} value={goal.id}>
                  <div className="flex items-center justify-between w-full">
                    <span>{goal.title}</span>
                    <Badge variant={getStatusColor(goal.status)} className="ml-2 text-xs">
                      {getStatusLabel(goal.status)}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedGoal && (
          <div className="p-3 bg-muted rounded-lg">
            <div className="font-medium">{selectedGoal.title}</div>
            {selectedGoal.description && (
              <div className="text-sm text-muted-foreground mt-1">
                {selectedGoal.description}
              </div>
            )}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm">Current status:</span>
              <Badge variant={getStatusColor(selectedGoal.status)}>
                {getStatusLabel(selectedGoal.status)}
              </Badge>
            </div>
          </div>
        )}

        <div>
          <Label htmlFor="status">New Status</Label>
          <Select 
            value={status} 
            onValueChange={(value: Goal['status']) => setStatus(value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="not_started">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>
                  Not Started
                </div>
              </SelectItem>
              <SelectItem value="in_progress">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-warning rounded-full"></div>
                  In Progress
                </div>
              </SelectItem>
              <SelectItem value="on_track">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-success rounded-full"></div>
                  On Track
                </div>
              </SelectItem>
              <SelectItem value="at_risk">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-warning/70 rounded-full"></div>
                  At Risk
                </div>
              </SelectItem>
              <SelectItem value="off_track">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-destructive rounded-full"></div>
                  Off Track
                </div>
              </SelectItem>
              <SelectItem value="complete">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  Complete
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="notes">Notes (Optional)</Label>
          <Textarea
            id="notes"
            placeholder="Add any notes about this status update..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>
      </div>
    </BaseModal>
  );
};
