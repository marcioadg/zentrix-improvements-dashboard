import React, { useState, useEffect, useMemo } from 'react';
import { MobileBaseModal, useMobileModalInputFocus } from './MobileBaseModal';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUserTeams } from '@/hooks/useUserTeams';
import { useAuth } from '@/contexts/AuthContext';
import { useOptimizedActiveMeetings } from '@/hooks/meeting/useOptimizedActiveMeetings';
import { useTeamMemberSelector } from '@/hooks/useTeamMemberSelector';
import { formatElapsedTime } from '@/utils/meetingFormatters';
import { UserAvatar } from '@/components/UserAvatar';
import { logger } from '@/utils/logger';

interface MobileAddHeadlineModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (title: string, content: string, teamId?: string, meetingId?: string, ownerId?: string, targetMeetingType?: 'weekly' | 'quarterly') => void;
  defaultTeamId?: string;
  currentMeetingId?: string;
  forceUpcoming?: boolean;
}

export const MobileAddHeadlineModal: React.FC<MobileAddHeadlineModalProps> = ({
  open,
  onOpenChange,
  onAdd,
  defaultTeamId,
  currentMeetingId,
  forceUpcoming = false,
}) => {
  const { teams } = useUserTeams();
  const { user } = useAuth();
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedOwnerIds, setSelectedOwnerIds] = useState<string[]>([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [meetingContext, setMeetingContext] = useState<'active' | 'upcoming'>('active');
  const [selectedMeetingType, setSelectedMeetingType] = useState<'weekly' | 'quarterly'>('weekly');
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  
  const { meetings: allMeetings, loading: allMeetingsLoading, forceRefetch } = useOptimizedActiveMeetings();
  const activeMeetings = allMeetings.filter(m => m.status === 'active' && m.meeting_type === 'weekly');

  useEffect(() => {
    if (open && teams.length > 0 && !selectedTeamId) {
      if (defaultTeamId && teams.find(t => t.id === defaultTeamId)) {
        setSelectedTeamId(defaultTeamId);
      } else {
        setSelectedTeamId(teams[0].id);
      }
    }
  }, [open, teams, selectedTeamId, defaultTeamId]);

  useEffect(() => {
    if (open && currentMeetingId && !selectedMeetingId) {
      setSelectedMeetingId(currentMeetingId);
    }
  }, [open, currentMeetingId, selectedMeetingId]);

  useEffect(() => {
    if (open) {
      if (forceUpcoming) {
        setMeetingContext('upcoming');
      } else {
        setMeetingContext(activeMeetings.length > 0 ? 'active' : 'upcoming');
      }
    }
  }, [open, activeMeetings.length, forceUpcoming]);

  useEffect(() => {
    if (open && meetingContext === 'active') {
      forceRefetch();
    }
  }, [open, meetingContext, forceRefetch]);

  useEffect(() => {
    if (open && user?.id && selectedOwnerIds.length === 0) {
      setSelectedOwnerIds([user.id]);
    }
  }, [open, user?.id]);

  const teamIdForCreatorSelector = useMemo(() => {
    if (meetingContext === 'active' && selectedMeetingId) {
      const selectedMeeting = activeMeetings.find(m => m.id === selectedMeetingId);
      return selectedMeeting?.team_id || null;
    }
    return selectedTeamId || null;
  }, [meetingContext, selectedMeetingId, activeMeetings, selectedTeamId]);

  const { users: teamMembers, loading: teamMembersLoading } = useTeamMemberSelector(teamIdForCreatorSelector);

  useEffect(() => {
    setSelectedMeetingId('');
  }, [selectedTeamId]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      setAttemptedSubmit(true);
      return;
    }
    
    setLoading(true);
    try {
      const ownerId = selectedOwnerIds.length > 0 ? selectedOwnerIds[0] : user?.id;
      
      if (meetingContext === 'active') {
        const meetingId = selectedMeetingId || undefined;
        const selectedMeeting = activeMeetings.find(m => m.id === selectedMeetingId);
        const teamId = selectedMeeting?.team_id;
        
        await onAdd(
          title.trim(), 
          content.trim(), 
          teamId, 
          meetingId,
          ownerId
        );
      } else {
        await onAdd(
          title.trim(), 
          content.trim(), 
          selectedTeamId || undefined, 
          undefined,
          ownerId,
          selectedMeetingType
        );
      }
      
      setTitle('');
      setContent('');
      setSelectedTeamId('');
      setSelectedOwnerIds([]);
      setSelectedMeetingId('');
      setMeetingContext('active');
      setSelectedMeetingType('weekly');
      setAttemptedSubmit(false);
      onOpenChange(false);
    } catch (error) {
      logger.error('Error adding headline:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setTitle('');
    setContent('');
    setSelectedTeamId('');
    setSelectedOwnerIds([]);
    setSelectedMeetingId('');
    setMeetingContext('active');
    setSelectedMeetingType('weekly');
    setAttemptedSubmit(false);
    onOpenChange(false);
  };

  const handleInputFocus = useMobileModalInputFocus();

  return (
    <MobileBaseModal
      open={open}
      onOpenChange={onOpenChange}
      title="Add Headline"
      description="Create a new headline for team meetings"
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      submitText="Add Headline"
      loading={loading}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="headline-title" className={attemptedSubmit && !title.trim() ? 'text-destructive' : ''}>
            Title <span className="text-destructive">*</span>
          </Label>
          <Input
            id="headline-title"
            placeholder="Enter headline title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onFocus={handleInputFocus}
            className={attemptedSubmit && !title.trim() ? 'border-destructive focus-visible:ring-destructive/30' : ''}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="headline-content">Content</Label>
          <Textarea
            id="headline-content"
            placeholder="Enter headline content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onFocus={handleInputFocus}
            rows={4}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="headline-creator">
            Headline Creator <span className="text-destructive">*</span>
          </Label>
          <Select 
            value={selectedOwnerIds[0] || ''} 
            onValueChange={(value) => setSelectedOwnerIds([value])}
            disabled={teamMembersLoading || teamMembers.length === 0 || !teamIdForCreatorSelector}
          >
            <SelectTrigger>
              <SelectValue placeholder={
                teamMembersLoading 
                  ? "Loading members..." 
                  : !teamIdForCreatorSelector
                    ? "Select a team or meeting first"
                    : teamMembers.length === 0
                      ? "No team members found"
                      : "Select headline creator"
              } />
            </SelectTrigger>
            <SelectContent>
              {teamMembers.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  <div className="flex items-center gap-2">
                    <UserAvatar
                      avatarUrl={member.avatar_url}
                      fullName={member.full_name}
                      size="sm"
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">{member.full_name}</span>
                      <span className="text-xs text-muted-foreground">{member.email}</span>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Meeting Context</Label>
          <div className="flex gap-2 p-1 bg-muted rounded-lg">
            <button
              type="button"
              onClick={() => setMeetingContext('active')}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                meetingContext === 'active'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Active Meeting
            </button>
            <button
              type="button"
              onClick={() => setMeetingContext('upcoming')}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                meetingContext === 'upcoming'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Upcoming Meeting
            </button>
          </div>
        </div>

        {meetingContext === 'active' ? (
          <div className="space-y-2">
            <Label htmlFor="headline-meeting">Select Active Meeting *</Label>
            <Select 
              value={selectedMeetingId} 
              onValueChange={setSelectedMeetingId}
              disabled={activeMeetings.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  allMeetingsLoading 
                    ? "Loading meetings..." 
                    : activeMeetings.length === 0
                      ? "No active meetings found"
                      : "Select an active meeting"
                } />
              </SelectTrigger>
              <SelectContent>
                {activeMeetings.map((meeting) => {
                  const displayName = (
                    meeting.meeting_type === 'custom' && 
                    'meeting_title' in meeting && 
                    meeting.meeting_title
                  ) ? meeting.meeting_title : meeting.team_name;
                  
                  const meetingTypeLabel = meeting.meeting_type === 'custom' ? 'Custom' :
                                           meeting.meeting_type === 'quarterly' ? 'Quarterly' :
                                           meeting.meeting_type === 'annual' ? 'Annual' : 'Weekly';
                  
                  const elapsed = formatElapsedTime(meeting.started_at);
                  
                  return (
                    <SelectItem key={meeting.id} value={meeting.id}>
                      {displayName} - {meetingTypeLabel} - Running for {elapsed}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Add this headline to a currently running meeting
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="headline-team">Team *</Label>
            <Select 
              value={selectedTeamId} 
              onValueChange={setSelectedTeamId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select team" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              This headline will appear in the next weekly meeting for the selected team
            </p>
          </div>
        )}
      </div>
    </MobileBaseModal>
  );
};
