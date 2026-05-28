
import React, { useState, useEffect, useMemo } from 'react';
import { BaseModal } from './BaseModal';
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

interface AddHeadlineModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (title: string, content: string, teamId?: string, meetingId?: string, ownerId?: string, targetMeetingType?: 'weekly' | 'quarterly') => void;
  defaultTeamId?: string;
  currentMeetingId?: string;
  forceUpcoming?: boolean; // Force "Upcoming Meeting" context (for mobile)
}

export const AddHeadlineModal: React.FC<AddHeadlineModalProps> = ({
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
  
  // Fetch ALL active meetings across all teams (for "Active Meeting" context)
  const { meetings: allMeetings, loading: allMeetingsLoading, forceRefetch } = useOptimizedActiveMeetings();
  const activeMeetings = allMeetings.filter(m => m.status === 'active' && m.meeting_type === 'weekly');

  // Auto-select team (default if provided, otherwise first team)
  useEffect(() => {
    if (open && teams.length > 0 && !selectedTeamId) {
      if (defaultTeamId && teams.find(t => t.id === defaultTeamId)) {
        logger.log('🎯 AddHeadlineModal: Auto-selecting default team:', defaultTeamId);
        setSelectedTeamId(defaultTeamId);
      } else {
        logger.log('🎯 AddHeadlineModal: Auto-selecting first team:', teams[0].id);
        setSelectedTeamId(teams[0].id);
      }
    }
  }, [open, teams, selectedTeamId, defaultTeamId]);

  // Pre-select current meeting if provided and set context to 'active'
  useEffect(() => {
    if (open && currentMeetingId && !selectedMeetingId) {
      setSelectedMeetingId(currentMeetingId);
    }
  }, [open, currentMeetingId, selectedMeetingId]);

  // Auto-default toggle based on active meetings across all teams (unless forceUpcoming)
  useEffect(() => {
    if (open) {
      if (forceUpcoming) {
        setMeetingContext('upcoming');
      } else {
        setMeetingContext(activeMeetings.length > 0 ? 'active' : 'upcoming');
      }
    }
  }, [open, activeMeetings.length, forceUpcoming]);

  // Force refetch active meetings when modal opens to ensure fresh data
  useEffect(() => {
    if (open && meetingContext === 'active') {
      logger.log('🔄 AddHeadlineModal: Forcing refetch of active meetings for fresh data');
      forceRefetch();
    }
  }, [open, meetingContext, forceRefetch]);

  // Auto-assign current user as owner when modal opens
  useEffect(() => {
    if (open && user?.id && selectedOwnerIds.length === 0) {
      setSelectedOwnerIds([user.id]);
    }
  }, [open, user?.id]);

  // Determine which team to use for fetching members (for headline creator selector)
  const teamIdForCreatorSelector = useMemo(() => {
    if (meetingContext === 'active' && selectedMeetingId) {
      // Extract team_id from selected active meeting
      const selectedMeeting = activeMeetings.find(m => m.id === selectedMeetingId);
      return selectedMeeting?.team_id || null;
    }
    // For upcoming meetings, use the selected team
    return selectedTeamId || null;
  }, [meetingContext, selectedMeetingId, activeMeetings, selectedTeamId]);

  // Fetch team members for the headline creator selector
  const { users: teamMembers, loading: teamMembersLoading } = useTeamMemberSelector(teamIdForCreatorSelector);

  // Reset meeting selection when team changes
  useEffect(() => {
    setSelectedMeetingId('');
  }, [selectedTeamId]);

  const handleSubmit = async () => {
    logger.log('📝 AddHeadlineModal: Starting headline submission');
    logger.log('📝 AddHeadlineModal: Form values:', {
      title: title.trim(),
      content: content.trim(),
      selectedTeamId,
      selectedMeetingId,
      selectedOwnerIds,
      currentMeetingId,
      defaultTeamId,
      meetingContext,
      selectedMeetingType
    });
    
    if (!title.trim()) {
      setAttemptedSubmit(true);
      logger.error('❌ AddHeadlineModal: Title is required');
      return;
    }
    
    setLoading(true);
    try {
      const ownerId = selectedOwnerIds.length > 0 ? selectedOwnerIds[0] : user?.id;
      
      if (meetingContext === 'active') {
        // Active meeting: use selected meeting_id (from active meetings dropdown)
        const meetingId = selectedMeetingId || undefined;
        
        // Extract team_id from the selected active meeting
        const selectedMeeting = activeMeetings.find(m => m.id === selectedMeetingId);
        const teamId = selectedMeeting?.team_id;
        
        logger.log('📝 AddHeadlineModal: Creating for active meeting:', {
          title: title.trim(),
          content: content.trim(),
          teamId,
          meetingId,
          ownerId
        });
        
        await onAdd(
          title.trim(), 
          content.trim(), 
          teamId, 
          meetingId,
          ownerId
        );
      } else {
        // Upcoming meeting: pass target_meeting_type instead of meeting_id
        logger.log('📝 AddHeadlineModal: Creating for upcoming meeting:', {
          title: title.trim(),
          content: content.trim(),
          teamId: selectedTeamId || undefined,
          meetingId: undefined,
          ownerId,
          targetMeetingType: selectedMeetingType
        });
        
        await onAdd(
          title.trim(), 
          content.trim(), 
          selectedTeamId || undefined, 
          undefined,  // No specific meeting_id
          ownerId,
          selectedMeetingType  // Pass the meeting type
        );
      }
      
      logger.log('✅ AddHeadlineModal: Successfully called onAdd');
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
      logger.error('❌ AddHeadlineModal: Error in handleSubmit:', error);
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

  return (
    <BaseModal
      open={open}
      onOpenChange={onOpenChange}
      title="Add Headline"
      description="Create a new headline for team meetings"
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      submitText="Add Headline"
      loading={loading}
      mobileKeyboardAware
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
            rows={4}
          />
        </div>

        {/* Headline Creator - Always visible */}
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
            <SelectContent className="bg-background">
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

        {/* Meeting Context Toggle */}
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

        {/* Conditional sections based on toggle */}
        {meetingContext === 'active' ? (
          // Active Meeting: Show dropdown of ALL active meetings across all teams
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
              <SelectContent className="bg-background">
                {activeMeetings.map((meeting) => {
                  // Safely check for meeting_title property
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
          // Upcoming Meeting: Show Team selector + Meeting Type selector
          <>
            <div className="space-y-2">
              <Label htmlFor="headline-team">Team *</Label>
              <Select 
                value={selectedTeamId} 
                onValueChange={setSelectedTeamId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent className="bg-background">
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
          </>
        )}
      </div>
    </BaseModal>
  );
};
