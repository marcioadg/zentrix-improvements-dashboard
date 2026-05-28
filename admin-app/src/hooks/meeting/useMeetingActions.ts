import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ActionDialogState, MeetingWithTeam } from '@/types/meetingList';
import { formatElapsedTime, formatDuration } from '@/utils/meetingFormatters';
import { useSendRecapEmail } from '@/hooks/meeting/useSendRecapEmail';
import { logger } from '@/lib/logger';

export const useMeetingActions = (
  deleteMeeting: (id: string) => Promise<void>,
  finalizeMeeting: (id: string, teamId: string) => Promise<{ companyId?: string | null }>
) => {
  const navigate = useNavigate();
  const { sendRecapEmail, isSending } = useSendRecapEmail();
  
  const [actionDialog, setActionDialog] = useState<ActionDialogState>({
    open: false,
    type: 'delete',
    meetingId: '',
    teamId: '',
    teamName: '',
    duration: ''
  });
  const [actionLoading, setActionLoading] = useState(false);
  
  // Checkbox state for sending recap email (default: true)
  const [sendRecapEmailChecked, setSendRecapEmailChecked] = useState(true);

  const handleJoinMeeting = useCallback((teamId: string, meetingType: string) => {
    navigate(`/meeting/${teamId}/${meetingType}`);
  }, [navigate]);

  const handleDeleteClick = useCallback((meeting: MeetingWithTeam) => {
    logger.debug('🗑️ useMeetingActions: Delete clicked for meeting:', meeting.id, meeting.team_name);
    const duration = meeting.total_duration_seconds 
      ? formatDuration(meeting.total_duration_seconds)
      : undefined;
      
    setActionDialog({
      open: true,
      type: 'delete',
      meetingId: meeting.id,
      teamId: meeting.team_id,
      teamName: meeting.team_name,
      duration
    });
    // Reset checkbox for next time
    setSendRecapEmailChecked(true);
  }, []);

  const handleFinalizeClick = useCallback((meeting: MeetingWithTeam) => {
    const duration = formatElapsedTime(meeting.started_at);
    
    setActionDialog({
      open: true,
      type: 'finalize',
      meetingId: meeting.id,
      teamId: meeting.team_id,
      teamName: meeting.team_name,
      duration
    });
    // Reset checkbox for next time
    setSendRecapEmailChecked(true);
  }, []);

  const handleConfirmAction = useCallback(async () => {
    logger.debug('✅ useMeetingActions: Confirming action:', actionDialog.type, 'for meeting:', actionDialog.meetingId);
    setActionLoading(true);
    try {
      if (actionDialog.type === 'delete') {
        logger.debug('🗑️ useMeetingActions: Calling deleteMeeting for:', actionDialog.meetingId);
        await deleteMeeting(actionDialog.meetingId);
      } else {
        logger.debug('🏁 useMeetingActions: Calling finalizeMeeting for:', actionDialog.meetingId);
        const result = await finalizeMeeting(actionDialog.meetingId, actionDialog.teamId);
        
        // Send email immediately if checkbox is checked
        if (sendRecapEmailChecked) {
          logger.debug('📧 useMeetingActions: Sending recap email');
          await sendRecapEmail({
            meetingId: actionDialog.meetingId,
            teamId: actionDialog.teamId,
            companyId: result.companyId
          });
        } else {
          logger.debug('📧 useMeetingActions: Skipping recap email (user unchecked)');
        }
      }
      setActionDialog(prev => ({ ...prev, open: false }));
    } catch (error) {
      logger.error('🚨 useMeetingActions: Action failed:', error);
      // Error handling is done in the hooks
    } finally {
      setActionLoading(false);
    }
  }, [actionDialog, deleteMeeting, finalizeMeeting, sendRecapEmail, sendRecapEmailChecked]);

  return {
    actionDialog,
    setActionDialog,
    actionLoading: actionLoading || isSending,
    handleJoinMeeting,
    handleDeleteClick,
    handleFinalizeClick,
    handleConfirmAction,
    // Email checkbox state
    sendRecapEmailChecked,
    setSendRecapEmailChecked
  };
};