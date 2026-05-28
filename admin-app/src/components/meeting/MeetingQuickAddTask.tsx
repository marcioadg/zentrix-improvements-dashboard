
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, Calendar, Loader2, ChevronDown } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { UnifiedTeamTask } from '@/types/tasks';
import { getDefaultDueDate } from '@/utils/taskUtils';
import { MultiUserSelector } from '@/components/shared/MultiUserSelector';
import { MultiAssigneeDisplay } from '@/components/shared/MultiAssigneeDisplay';
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';
import { logger } from '@/utils/logger';

interface MeetingQuickAddTaskProps {
  teamId: string;
  onTaskCreate?: (taskData: Partial<UnifiedTeamTask>) => Promise<any>;
  loading?: boolean;
  prefilledData?: {
    title?: string;
    description?: string;
    ownerId?: string; // Issue owner becomes task owner
  };
}

export const MeetingQuickAddTask: React.FC<MeetingQuickAddTaskProps> = ({ 
  teamId,
  onTaskCreate,
  loading = false,
  prefilledData
}) => {
  const { profile } = useProfile();
  const { members, loading: membersLoading } = useTeamMembers(teamId);
  
  const [title, setTitle] = useState(prefilledData?.title || '');
  const [description, setDescription] = useState(prefilledData?.description || '');
  // Always default to 7 days from now
  const [dueDate, setDueDate] = useState(getDefaultDueDate());
  // Default assignees: issue owner (if from issue) or current user
  const [assignedTo, setAssignedTo] = useState<string[]>(
    prefilledData?.ownerId ? [prefilledData.ownerId] : (profile?.id ? [profile.id] : [])
  );
  const [showDetails, setShowDetails] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !onTaskCreate || isCreating) return;
    
    setIsCreating(true);
    try {
      logger.log('📝 MeetingQuickAddTask: Creating task:', { 
        title, 
        teamId, 
        assignedTo,
        isFromIssue: !!prefilledData?.ownerId
      });
      
      const taskData: Partial<UnifiedTeamTask> = {
        title: title.trim(),
        description: description.trim(),
        team_id: teamId,
        assigned_to: assignedTo, // Already an array
        due_date: dueDate || null,
        completed: false,
        archived: false,
      };
      
      await onTaskCreate(taskData);
      
      // Reset form with defaults
      setTitle('');
      setDescription('');
      setDueDate(getDefaultDueDate()); // Reset to new 7-day default
      setAssignedTo(profile?.id ? [profile.id] : []); // Reset to current user
      setShowDetails(false);
      
      logger.log('✅ MeetingQuickAddTask: Task created successfully');
    } catch (error) {
      logger.error('❌ MeetingQuickAddTask: Error creating task:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleUserSelectionChange = (userIds: string[]) => {
    setAssignedTo(userIds);
  };

  const isFormDisabled = loading || isCreating;

  // Transform team members for avatar selection
  const selectableUsers = members.map(member => ({
    id: member.user_id,
    full_name: member.profiles?.full_name || member.profiles?.email || 'Unknown User',
    email: member.profiles?.email,
    avatar_url: member.profiles?.avatar_url
  }));

  // Transform assignees for display
  const assigneeProfiles = assignedTo.map(userId => {
    const user = selectableUsers.find(u => u.id === userId);
    return user ? {
      id: user.id,
      full_name: user.full_name,
      avatar_url: user.avatar_url
    } : null;
  }).filter(Boolean) as Array<{ id: string; full_name: string; avatar_url?: string }>;

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex gap-1.5 items-start">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="What needs to be done? (Press Enter to add)"
          className="flex-1 h-10"
          autoFocus
          disabled={isFormDisabled}
        />
        
        {/* Multi-user selector for task assignment */}
        <MultiUserSelector
          users={selectableUsers}
          selectedUserIds={assignedTo}
          onSelectionChange={handleUserSelectionChange}
          placeholder="Assign to..."
          headerInfo={{ 
            title: 'Assign Task', 
            description: 'Select team members to assign this task to' 
          }}
          className="shrink-0"
          compact={true}
        />
        
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowDetails(!showDetails)}
          disabled={isFormDisabled}
          className="h-10 px-3"
        >
          <Calendar className="h-4 w-4" />
        </Button>
        <Button 
          type="submit"
          disabled={!title.trim() || isFormDisabled}
          className="h-10 px-3"
        >
          {isCreating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
              Adding...
            </>
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </Button>
      </div>

      <div className="space-y-4">
        {isFormDisabled && !isCreating && (
          <div className="text-sm text-muted-foreground">
            Loading task system...
          </div>
        )}

        {showDetails && (
          <div className="space-y-4 p-3 border rounded-lg bg-muted/20">
            {/* Description */}
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add details about this task..."
                rows={2}
                disabled={isFormDisabled}
              />
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <Label>Due Date</Label>
              <DatePicker
                date={dueDate ? new Date(dueDate + 'T00:00:00') : undefined}
                onSelect={(d) => setDueDate(d ? format(d, 'yyyy-MM-dd') : '')}
                placeholder="Pick a due date"
              />
            </div>

            {/* Assignment Info */}
            {prefilledData?.ownerId && (
              <div className="text-xs text-muted-foreground">
                Task assigned to issue owner
              </div>
            )}
            
            {/* Show current assignments */}
            {assignedTo.length > 0 && (
              <div className="space-y-2">
                <Label>Assigned To</Label>
                <MultiAssigneeDisplay
                  assignees={assigneeProfiles}
                  size="sm"
                  maxVisible={5}
                  showOwnerFirst={false}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </form>
  );
};
