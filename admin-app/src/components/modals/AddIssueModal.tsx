
import React, { useState, useEffect } from 'react';
import { BaseModal } from './BaseModal';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff } from 'lucide-react';
import { useUserTeams } from '@/hooks/useUserTeams';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useAuth } from '@/contexts/AuthContext';

interface AddIssueModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (issueData: {
    title: string;
    description?: string;
    issueType: 'short_term' | 'long_term';
    teamId: string;
    ownerId?: string;
    isPublic?: boolean;
  }) => Promise<boolean>;
  defaultTeamId?: string;
  defaultIssueType?: 'short_term' | 'long_term';
}

export const AddIssueModal: React.FC<AddIssueModalProps> = ({
  open,
  onOpenChange,
  onAdd,
  defaultTeamId,
  defaultIssueType = 'short_term',
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState(defaultTeamId || '');
  const [ownerId, setOwnerId] = useState('');
  const [issueType, setIssueType] = useState<'short_term' | 'long_term'>(defaultIssueType);
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const { teams } = useUserTeams();
  const { members } = useTeamMembers(selectedTeamId);
  const { user } = useAuth();

  // Set default team when modal opens or defaultTeamId changes
  useEffect(() => {
    if (open) {
      if (defaultTeamId) {
        setSelectedTeamId(defaultTeamId);
      } else if (teams.length === 1) {
        setSelectedTeamId(teams[0].id);
      }
      setIssueType(defaultIssueType);
    }
  }, [open, defaultTeamId, teams, defaultIssueType]);

  // Smart owner auto-selection
  useEffect(() => {
    if (!user) return;
    
    // Case 1: No team selected - default to current user
    if (!selectedTeamId) {
      if (!ownerId) {
        setOwnerId(user.id);
      }
      return;
    }
    
    // Case 2: Team selected - check membership
    if (members.length > 0) {
      const currentUserIsMember = members.some(m => m.user_id === user.id);
      if (currentUserIsMember) {
        // User is a member - set them if not already set
        if (!ownerId || !members.some(m => m.user_id === ownerId)) {
          setOwnerId(user.id);
        }
      } else {
        // User is NOT a member - select first member
        if (!ownerId || !members.some(m => m.user_id === ownerId)) {
          setOwnerId(members[0].user_id);
        }
      }
    }
  }, [members, user, selectedTeamId, ownerId]);

  const handleSave = async () => {
    if (!title.trim() || !selectedTeamId) {
      setAttemptedSubmit(true);
      return;
    }

    setLoading(true);
    const success = await onAdd({
      title: title.trim(),
      description: description.trim() || undefined,
      issueType,
      teamId: selectedTeamId,
      ownerId: ownerId || undefined,
      isPublic: issueType === 'long_term' ? isPublic : false,
    });

    if (success) {
      resetForm();
      onOpenChange(false);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setSelectedTeamId(defaultTeamId || '');
    setOwnerId('');
    setIssueType(defaultIssueType);
    setIsPublic(false);
    setAttemptedSubmit(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  const getMemberName = (userId: string) => {
    const member = members.find(m => m.user_id === userId);
    return member?.profiles?.full_name || member?.profiles?.email || 'Unknown';
  };

  return (
    <BaseModal
      open={open}
      onOpenChange={handleOpenChange}
      title="Add Issue"
      onSubmit={handleSave}
      submitText="Add Issue"
      submitDisabled={!title.trim() || !selectedTeamId}
      loading={loading}
      mobileKeyboardAware
    >
      <div className="space-y-4">
        <div>
          <label className={`text-sm font-medium mb-2 block ${attemptedSubmit && !title.trim() ? 'text-destructive' : 'text-foreground'}`}>
            Title *
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Issue title..."
            className={attemptedSubmit && !title.trim() ? 'border-destructive focus-visible:ring-destructive/30' : ''}
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
          <label className={`text-sm font-medium mb-2 block ${attemptedSubmit && !selectedTeamId ? 'text-destructive' : 'text-foreground'}`}>
            Team *
          </label>
          <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
            <SelectTrigger className={attemptedSubmit && !selectedTeamId ? 'border-destructive focus-visible:ring-destructive/30' : ''}>
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
              <SelectValue placeholder={!selectedTeamId ? "You (select team first)" : "Select owner"} />
            </SelectTrigger>
            <SelectContent className="z-[200] bg-background">
              {!selectedTeamId && user ? (
                <SelectItem value={user.id}>
                  {user.user_metadata?.full_name || user.email || 'You'}
                </SelectItem>
              ) : (
                members.map((member) => (
                  <SelectItem key={member.user_id} value={member.user_id}>
                    {getMemberName(member.user_id)}
                  </SelectItem>
                ))
              )}
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
              <Label htmlFor="is_public_add" className="text-sm font-medium cursor-pointer">
                Make public to company
              </Label>
            </div>
            <Switch
              id="is_public_add"
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
