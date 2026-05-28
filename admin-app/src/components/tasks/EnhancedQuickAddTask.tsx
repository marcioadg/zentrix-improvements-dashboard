import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';
import { Plus, Calendar, Loader2, X } from 'lucide-react';
import { getDefaultDueDate } from '@/utils/taskUtils';
import { useUserTeams } from '@/hooks/useUserTeams';
import { useCompanyUsers } from '@/hooks/useCompanyUsers';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useProfile } from '@/hooks/useProfile';
import { MultiUserSelector } from '@/components/shared/MultiUserSelector';
import { logger } from '@/utils/logger';

interface EnhancedQuickAddTaskProps {
  onAddTask: (
    title: string,
    description?: string,
    dueDate?: string,
    taskType?: 'personal' | 'team',
    teamId?: string,
    teamName?: string,
    assignedTo?: string[],
    splitPerMember?: boolean
  ) => Promise<void>;
  isCreating: boolean;
  canCreateTasks: boolean;
  currentUserId?: string;
  defaultOwnerId?: string;
  defaultTeamId?: string;
  autoExpand?: boolean;
}

export const EnhancedQuickAddTask: React.FC<EnhancedQuickAddTaskProps> = ({
  onAddTask,
  isCreating,
  canCreateTasks,
  currentUserId,
  defaultOwnerId,
  defaultTeamId,
  autoExpand = false
}) => {
  const { teams } = useUserTeams();
  const { users: companyUsers } = useCompanyUsers();
  const { profile } = useProfile();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(getDefaultDueDate());

  const [teamSelection, setTeamSelection] = useState<string>(defaultTeamId ?? 'personal');
  const [assignedTo, setAssignedTo] = useState<string[]>(
    defaultOwnerId ? [defaultOwnerId] : currentUserId ? [currentUserId] : []
  );
  const [splitPerMember, setSplitPerMember] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Derived selection and members for owner filtering
  const isPersonal = teamSelection === 'personal';
  const selectedTeamId = isPersonal ? '' : teamSelection;
  const { members: teamMembers } = useTeamMembers(selectedTeamId);

  const selectableUsers = isPersonal
    ? companyUsers.filter(u => u.id === (currentUserId || '')).map(u => ({
        id: u.id,
        full_name: u.full_name || u.email || 'You',
        email: u.email,
        avatar_url: (u as any).avatar_url
      }))
    : teamMembers.map(m => ({
        id: m.user_id,
        full_name: m.profiles?.full_name || m.profiles?.email || 'Member',
        email: m.profiles?.email || '',
        avatar_url: m.profiles?.avatar_url
      }));

  // Normalize assignees based on destination
  useEffect(() => {
    const ids = selectableUsers.map(o => o.id);
    if (isPersonal) {
      if (currentUserId) setAssignedTo([currentUserId]);
    } else {
      const validIds = assignedTo.filter(id => ids.includes(id));
      if (validIds.length !== assignedTo.length) {
        if (validIds.length > 0) {
          setAssignedTo(validIds);
        } else {
          const fallback = currentUserId && ids.includes(currentUserId) ? currentUserId : ids[0];
          setAssignedTo(fallback ? [fallback] : []);
        }
      }
    }
  }, [isPersonal, selectedTeamId, teamMembers, companyUsers, currentUserId]);

  // Keep form open; no outside-click auto-collapse
  useEffect(() => {
    // Intentionally left blank: we no longer auto-close on outside clicks
  }, [isExpanded]);

  // Ensure default assignees are set on mount/changes
  useEffect(() => {
    if (assignedTo.length === 0) {
      const defaultId = defaultOwnerId || currentUserId;
      if (defaultId) setAssignedTo([defaultId]);
    }
  }, [defaultOwnerId, currentUserId]);

  // Sync destination when the parent's selected team filter changes
  useEffect(() => {
    setTeamSelection(defaultTeamId ?? 'personal');
  }, [defaultTeamId]);

  // Auto-expand when navigated to with openAddTask state
  useEffect(() => {
    if (autoExpand && !isExpanded) {
      setIsExpanded(true);
    }
  }, [autoExpand]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    logger.log('🎯 EnhancedQuickAddTask: handleSubmit called', {
      title: title.trim(),
      canCreateTasks,
      isCreating,
      titleLength: title.trim().length,
      teamSelection
    });
    
    if (!title.trim() || !canCreateTasks || isCreating) {
      logger.log('🛑 EnhancedQuickAddTask: Validation failed', {
        hasTitle: !!title.trim(),
        canCreateTasks,
        isCreating
      });
      return;
    }
    
    try {
      // Determine task destination
      const isPersonal = teamSelection === 'personal';
      const selectedTeam = isPersonal ? undefined : teams.find(t => t.id === teamSelection);

      // Fall back to current user if no one is assigned
      const finalAssignedTo = assignedTo.length > 0 ? assignedTo : (currentUserId ? [currentUserId] : []);

      logger.log('🚀 EnhancedQuickAddTask: About to call onAddTask', {
        title: title.trim(),
        description: description.trim(),
        dueDate,
        assignedTo: finalAssignedTo,
        splitPerMember,
        taskType: isPersonal ? 'personal' : 'team',
        teamId: selectedTeam?.id,
        teamName: selectedTeam?.name,
      });

      await onAddTask(
        title.trim(),
        description.trim(),
        dueDate,
        isPersonal ? 'personal' : 'team',
        selectedTeam?.id,
        selectedTeam?.name,
        finalAssignedTo,
        splitPerMember,
      );

      // Reset form with new defaults
      setTitle('');
      setDescription('');
      setDueDate(getDefaultDueDate());
      setTeamSelection(defaultTeamId ?? 'personal');
      setAssignedTo(defaultOwnerId ? [defaultOwnerId] : currentUserId ? [currentUserId] : []);
      setSplitPerMember(false);
      setIsExpanded(false);
    } catch (error) {
      logger.error('Error adding task:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInputFocus = () => {
    if (!isExpanded) {
      setIsExpanded(true);
    }
  };

  const handleCancel = () => {
    setTitle('');
    setDescription('');
    setDueDate(getDefaultDueDate());
    setTeamSelection(defaultTeamId ?? 'personal');
    setAssignedTo(defaultOwnerId ? [defaultOwnerId] : currentUserId ? [currentUserId] : []);
    setSplitPerMember(false);
    setIsExpanded(false);
  };

  if (!canCreateTasks) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
        <p className="text-sm">Setting up task system...</p>
      </div>
    );
  }

  return (
    <div className="relative">
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          data-quick-add-form
          className={`border rounded-lg transition-all duration-200 ${isExpanded ? 'bg-card shadow-md' : 'bg-card hover:shadow-md hover:border-border/60'} border-dashed border-2`}
        >
        <div className="p-3">
          <div className="flex items-center gap-3 w-full">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyPress={handleKeyPress}
              onFocus={handleInputFocus}
              placeholder="+ Add Task"
              className="border-0 bg-transparent p-0 text-sm font-medium focus-visible:ring-0 focus-visible:ring-offset-0 h-auto"
              disabled={isCreating}
            />
          </div>
        </div>

        {isExpanded && (
          <div
            className="px-4 pb-4 space-y-4 border-t bg-muted/20"
            data-quick-add-expanded
          >
            <div className="pt-4 space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Description (optional)</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add details about this task..."
                rows={2}
                disabled={isCreating}
                className="resize-none text-sm"
              />
            </div>

            {/* Destination selection: Personal or Team */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Destination</Label>
              <Select
                value={teamSelection}
                onValueChange={(value) => {
                  logger.log('EnhancedQuickAddTask: team selection changed to', value);
                  setTeamSelection(value);
                }}
                disabled={isCreating}
              >
                <SelectTrigger aria-label="Select destination (personal or team)" className="text-sm">
                  <SelectValue placeholder="Select team or Personal" />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  <SelectItem value="personal">Personal Tasks</SelectItem>
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Assign to */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Assign To</Label>
              {isPersonal ? (
                <Input
                  value={profile?.full_name || profile?.email || 'You'}
                  disabled
                  className="text-sm bg-muted"
                />
              ) : (
                <MultiUserSelector
                  users={selectableUsers}
                  selectedUserIds={assignedTo}
                  onSelectionChange={(ids) => {
                    logger.log('EnhancedQuickAddTask: assignees changed to', ids);
                    setAssignedTo(ids);
                  }}
                  placeholder="Select members..."
                  headerInfo={{
                    title: 'Assign Task',
                    description: 'Select team members to assign this task to'
                  }}
                />
              )}
            </div>

            {/* Split per member checkbox */}
            {!isPersonal && assignedTo.length > 1 && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="splitPerMember"
                  checked={splitPerMember}
                  onCheckedChange={(checked) => setSplitPerMember(checked === true)}
                />
                <Label htmlFor="splitPerMember" className="text-xs font-medium text-muted-foreground cursor-pointer">
                  Create individual task for each member
                </Label>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Due Date</Label>
              <DatePicker
                date={dueDate ? new Date(dueDate + 'T00:00:00') : undefined}
                onSelect={(d) => setDueDate(d ? format(d, 'yyyy-MM-dd') : '')}
                placeholder="Pick a due date"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                disabled={isCreating}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!title.trim() || isCreating}
                size="sm"
                className="text-xs"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="h-3 w-3 mr-1" />
                    Add Task
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};