import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle
} from '@/components/ui/responsive-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';
import { Plus } from 'lucide-react';
import { getDefaultDueDate } from '@/utils/taskUtils';
interface TeamOption {
  id: string;
  name: string;
}
interface AddTaskModalProps {
  teamOptions: TeamOption[];
  onAddTask: (title: string, description?: string, teamSelection?: {
    type: 'personal' | 'team';
    teamId?: string;
  }, dueDate?: string) => Promise<boolean>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}
export const AddTaskModal: React.FC<AddTaskModalProps> = ({
  teamOptions,
  onAddTask,
  open,
  onOpenChange
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    team_id: 'personal',
    due_date: getDefaultDueDate()
  });
  const handleAddTask = useCallback(async () => {
    if (!newTask.title.trim()) return;
    const teamSelection = newTask.team_id === 'personal' ? {
      type: 'personal' as const
    } : {
      type: 'team' as const,
      teamId: newTask.team_id
    };
    const success = await onAddTask(newTask.title, newTask.description || undefined, teamSelection, newTask.due_date || undefined);
    if (success) {
      setNewTask({
        title: '',
        description: '',
        team_id: 'personal',
        due_date: getDefaultDueDate()
      });
      setIsOpen(false);
    }
  }, [newTask, onAddTask]);
  return <ResponsiveDialog open={isOpen} onOpenChange={setIsOpen}>
      <ResponsiveDialogContent className="sm:max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Add New Task</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <div className="space-y-4">
          <Input 
            value={newTask.title} 
            onChange={e => setNewTask(prev => ({
              ...prev,
              title: e.target.value
            }))} 
            placeholder="What needs to be done?" 
            autoComplete="off"
            autoFocus 
          />
          
          <Textarea value={newTask.description} onChange={e => setNewTask(prev => ({
          ...prev,
          description: e.target.value
        }))} placeholder="Add details... (optional)" rows={3} className="resize-none" />

          <Select value={newTask.team_id} onValueChange={value => setNewTask(prev => ({
          ...prev,
          team_id: value
        }))}>
            <SelectTrigger aria-label="Select destination (personal or team)">
              <SelectValue placeholder="Select team or Personal" />
            </SelectTrigger>
            <SelectContent className="bg-background">
              <SelectItem value="personal">Personal Tasks</SelectItem>
              {teamOptions.map(team => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DatePicker
            date={newTask.due_date ? new Date(newTask.due_date + 'T00:00:00') : undefined}
            onSelect={(d) => setNewTask(prev => ({
              ...prev,
              due_date: d ? format(d, 'yyyy-MM-dd') : ''
            }))}
            placeholder="Pick a due date"
          />

          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
            <Button variant="outline" onClick={() => setIsOpen(false)} className="flex-1 min-h-[48px]">
              Cancel
            </Button>
            <Button onClick={handleAddTask} disabled={!newTask.title.trim()} className="flex-1 min-h-[48px]">
              Add Task
            </Button>
          </div>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>;
};