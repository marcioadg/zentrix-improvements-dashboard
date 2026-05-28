
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { BaseModal } from './BaseModal';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff } from 'lucide-react';
import { UserTeamSelector } from '@/components/shared/UserTeamSelector';
import { useUserTeams } from '@/hooks/useUserTeams';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { logger } from '@/utils/logger';

interface Issue {
  id: string;
  title: string;
  description?: string;
  created_by: string;
  owner_id: string;
  team_id: string;
  issue_type: 'short_term' | 'long_term';
  is_public?: boolean;
}

interface EditIssueModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  issue: Issue | null;
  onSave: (updates: Partial<Issue>) => Promise<boolean>;
}

export const EditIssueModal: React.FC<EditIssueModalProps> = ({
  open,
  onOpenChange,
  issue,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [issueType, setIssueType] = useState<'short_term' | 'long_term'>('short_term');
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const { teams } = useUserTeams();
  
  // Only fetch team members when we have a team selected and avoid re-fetching unnecessarily
  const { members } = useTeamMembers(selectedTeamId);

  // Memoize the issue ID to prevent unnecessary useEffect triggers
  const issueId = useMemo(() => issue?.id, [issue?.id]);

  // Initialize form data only when the issue changes or modal opens
  useEffect(() => {
    if (open && issue) {
      logger.log('🔧 EditIssueModal: Initializing form with issue data:', issue.id);
      setTitle(issue.title);
      setDescription(issue.description || '');
      setOwnerId(issue.owner_id);
      setSelectedTeamId(issue.team_id);
      setIssueType(issue.issue_type);
      setIsPublic(issue.is_public || false);
      setInitialized(true);
    } else if (!open) {
      // Reset form when modal closes
      setInitialized(false);
    }
  }, [open, issue?.id]); // Only depend on open state and issue ID

  const handleSave = useCallback(async () => {
    if (!issue || !title.trim() || !initialized) {
      logger.warn('🚨 EditIssueModal: Cannot save - missing required data');
      return;
    }

    logger.log('🔧 EditIssueModal: Saving issue changes:', { issueId: issue.id, title });
    setLoading(true);
    try {
      const updates = {
        title: title.trim(),
        description: description.trim() || null,
        owner_id: ownerId,
        team_id: selectedTeamId,
        issue_type: issueType,
        is_public: isPublic,
      };

      const success = await onSave(updates);
      if (success) {
        onOpenChange(false);
      }
    } catch (error) {
      logger.error('🚨 EditIssueModal: Error saving issue:', error);
    } finally {
      setLoading(false);
    }
  }, [issue, title, description, ownerId, selectedTeamId, issueType, isPublic, initialized, onSave, onOpenChange]);

  // Memoize member name getter to prevent re-renders
  const getMemberName = useCallback((userId: string) => {
    const member = members.find(m => m.user_id === userId);
    return member?.profiles?.full_name || member?.profiles?.email || 'Unknown';
  }, [members]);

  // Don't render until form is initialized to prevent flash of empty inputs
  if (!initialized && issue) {
    return null;
  }

  return (
    <BaseModal
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Issue"
      onSubmit={handleSave}
      submitText="Save Changes"
      submitDisabled={!title.trim() || !selectedTeamId || loading}
      loading={loading}
    >
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">Title</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Issue title..."
            autoFocus={false} // Prevent auto-focus that could cause re-render issues
          />
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">Description</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description..."
            className="min-h-[80px]"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">Team</label>
          <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
            <SelectTrigger>
              <SelectValue placeholder="Select team" />
            </SelectTrigger>
            <SelectContent className="z-[200] bg-background">
              {teams.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">Owner</label>
          <Select value={ownerId} onValueChange={setOwnerId}>
            <SelectTrigger>
              <SelectValue placeholder="Select owner" />
            </SelectTrigger>
            <SelectContent className="z-[200] bg-background">
              {members.map((member) => (
                <SelectItem key={member.user_id} value={member.user_id}>
                  {getMemberName(member.user_id)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">Type</label>
          <Select value={issueType} onValueChange={(value) => setIssueType(value as 'short_term' | 'long_term')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[200] bg-background">
              <SelectItem value="short_term">Short-term</SelectItem>
              <SelectItem value="long_term">Long-term</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {issueType === 'long_term' && (
          <div className="flex items-center justify-between space-x-2">
            <div className="flex items-center gap-2">
              {isPublic ? (
                <Eye className="h-4 w-4 text-primary" />
              ) : (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              )}
              <Label htmlFor="is_public" className="text-sm font-medium cursor-pointer">
                Make public to company
              </Label>
            </div>
            <Switch
              id="is_public"
              checked={isPublic}
              onCheckedChange={setIsPublic}
              className="data-[state=checked]:bg-primary"
            />
          </div>
        )}

        {isPublic && issueType === 'long_term' && (
          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-md">
            Public issues will be visible to all teams in your company
          </div>
        )}
      </div>
    </BaseModal>
  );
};
