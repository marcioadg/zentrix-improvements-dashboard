import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MobileBaseModal, useMobileModalInputFocus } from './MobileBaseModal';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff } from 'lucide-react';
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

interface MobileEditIssueModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  issue: Issue | null;
  onSave: (updates: Partial<Issue>) => Promise<boolean>;
}

// Inner content component that uses the focus context
const MobileEditIssueContent: React.FC<{
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  selectedTeamId: string;
  setSelectedTeamId: (v: string) => void;
  ownerId: string;
  setOwnerId: (v: string) => void;
  issueType: 'short_term' | 'long_term';
  setIssueType: (v: 'short_term' | 'long_term') => void;
  isPublic: boolean;
  setIsPublic: (v: boolean) => void;
  teams: any[];
  members: any[];
  getMemberName: (userId: string) => string;
}> = ({
  title, setTitle,
  description, setDescription,
  selectedTeamId, setSelectedTeamId,
  ownerId, setOwnerId,
  issueType, setIssueType,
  isPublic, setIsPublic,
  teams, members, getMemberName
}) => {
  const handleInputFocus = useMobileModalInputFocus();

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">Title</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Issue title..."
          onFocus={handleInputFocus}
          autoFocus={false}
        />
      </div>

      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">Description</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description..."
          className="min-h-[80px]"
          onFocus={handleInputFocus}
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
            <Label htmlFor="is_public_mobile" className="text-sm font-medium cursor-pointer">
              Make public to company
            </Label>
          </div>
          <Switch
            id="is_public_mobile"
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
  );
};

export const MobileEditIssueModal: React.FC<MobileEditIssueModalProps> = ({
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
  const { members } = useTeamMembers(selectedTeamId);

  const issueId = useMemo(() => issue?.id, [issue?.id]);

  // Initialize form data when issue changes or modal opens
  useEffect(() => {
    if (open && issue) {
      setTitle(issue.title);
      setDescription(issue.description || '');
      setOwnerId(issue.owner_id);
      setSelectedTeamId(issue.team_id);
      setIssueType(issue.issue_type);
      setIsPublic(issue.is_public || false);
      setInitialized(true);
    } else if (!open) {
      setInitialized(false);
    }
  }, [open, issue?.id]);

  const handleSave = useCallback(async () => {
    if (!issue || !title.trim() || !initialized) {
      return;
    }

    setLoading(true);
    try {
      const updates = {
        title: title.trim(),
        description: description.trim() || undefined,
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
      logger.error('MobileEditIssueModal: Error saving issue:', error);
    } finally {
      setLoading(false);
    }
  }, [issue, title, description, ownerId, selectedTeamId, issueType, isPublic, initialized, onSave, onOpenChange]);

  const getMemberName = useCallback((userId: string) => {
    const member = members.find(m => m.user_id === userId);
    return member?.profiles?.full_name || member?.profiles?.email || 'Unknown';
  }, [members]);

  if (!initialized && issue) {
    return null;
  }

  return (
    <MobileBaseModal
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Issue"
      description="Configure settings for this issue"
      onSubmit={handleSave}
      submitText="Save Changes"
      submitDisabled={!title.trim() || !selectedTeamId || loading}
      loading={loading}
    >
      <MobileEditIssueContent
        title={title}
        setTitle={setTitle}
        description={description}
        setDescription={setDescription}
        selectedTeamId={selectedTeamId}
        setSelectedTeamId={setSelectedTeamId}
        ownerId={ownerId}
        setOwnerId={setOwnerId}
        issueType={issueType}
        setIssueType={setIssueType}
        isPublic={isPublic}
        setIsPublic={setIsPublic}
        teams={teams}
        members={members}
        getMemberName={getMemberName}
      />
    </MobileBaseModal>
  );
};
