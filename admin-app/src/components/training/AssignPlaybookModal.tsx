
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';
import { useAssignments } from '@/hooks/useAssignments';
import { useTeamsList } from '@/hooks/useTeamsList';
import { useUserList } from '@/hooks/useUserList';
import { logger } from '@/utils/logger';

interface AssignPlaybookModalProps {
  playbook: any;
  isOpen: boolean;
  onClose: () => void;
}

const VISIBILITY_OPTIONS = [
  { label: "Everyone in Company", value: "everyone" },
  { label: "Specific Teams", value: "teams" },
  { label: "Specific People", value: "people" },
  { label: "Assign (Individuals)", value: "assignments_only" }
];

export const AssignPlaybookModal: React.FC<AssignPlaybookModalProps> = ({
  playbook,
  isOpen,
  onClose
}) => {
  // Assignment state
  const [visibilityType, setVisibilityType] = useState("assignments_only");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const { assignPlaybook, setPlaybookVisibility } = useAssignments();
  const { teams } = useTeamsList();
  const { users } = useUserList();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playbook) return;

    setLoading(true);

    try {
      if (visibilityType === 'everyone') {
        await setPlaybookVisibility(playbook.id, 'everyone');
      } else if (visibilityType === 'teams') {
        await setPlaybookVisibility(playbook.id, 'teams', { teamIds: selectedTeamIds });
      } else if (visibilityType === 'people') {
        await setPlaybookVisibility(playbook.id, 'people', { userIds: selectedUserIds });
      } else {
        // assign individual
        for (const userId of selectedUserIds) {
          await assignPlaybook(playbook.id, userId, dueDate, notes);
        }
      }
      onClose();
      // Reset form
      setVisibilityType('assignments_only');
      setSelectedUserIds([]);
      setSelectedTeamIds([]);
      setDueDate('');
      setNotes('');
    } catch (error) {
      logger.error('Error assigning playbook:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!playbook) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Set Visibility / Assign "{playbook.title}"
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Visibility Selection */}
          <div>
            <Label>Show to</Label>
            <div className="flex gap-2 items-center mt-2 flex-wrap">
              {VISIBILITY_OPTIONS.map(opt => (
                <label className="flex items-center gap-1" key={opt.value}>
                  <input
                    type="radio"
                    name="visibility"
                    value={opt.value}
                    checked={visibilityType === opt.value}
                    onChange={() => setVisibilityType(opt.value)}
                  />
                  <span className="text-sm">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Teams Multi-Select */}
          {visibilityType === "teams" && (
            <div>
              <Label>Teams</Label>
              <select
                multiple
                value={selectedTeamIds}
                onChange={(e) => setSelectedTeamIds(Array.from(e.target.selectedOptions, o => o.value))}
                className="w-full px-3 py-2 border border-input rounded-md text-sm"
                required
              >
                {teams.map(team => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted-foreground">Hold Ctrl/Cmd to select multiple teams.</p>
            </div>
          )}

          {/* People Multi-Select */}
          {visibilityType === "people" && (
            <div>
              <Label>Users</Label>
              <select
                multiple
                value={selectedUserIds}
                onChange={(e) => setSelectedUserIds(Array.from(e.target.selectedOptions, o => o.value))}
                className="w-full px-3 py-2 border border-input rounded-md text-sm"
                required
              >
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.full_name} ({user.email})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted-foreground">Hold Ctrl/Cmd to select multiple users.</p>
            </div>
          )}

          {/* Assign (Individuals) */}
          {visibilityType === "assignments_only" && (
            <div>
              <Label>Assign to User(s)</Label>
              <select
                multiple
                value={selectedUserIds}
                onChange={(e) => setSelectedUserIds(Array.from(e.target.selectedOptions, o => o.value))}
                className="w-full px-3 py-2 border border-input rounded-md text-sm"
                required
              >
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.full_name} ({user.email})
                  </option>
                ))}
              </select>
              <div className="flex gap-2 mt-2">
                <div className="flex-1">
                  <Label>Due Date (Optional)</Label>
                  <DatePicker
                    date={dueDate ? new Date(dueDate + 'T00:00:00') : undefined}
                    onSelect={(d) => setDueDate(d ? format(d, 'yyyy-MM-dd') : '')}
                    placeholder="Pick a due date"
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add notes..."
                    rows={2}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' :
                (visibilityType === "assignments_only" ? 'Assign Playbook' : 'Set Visibility')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
