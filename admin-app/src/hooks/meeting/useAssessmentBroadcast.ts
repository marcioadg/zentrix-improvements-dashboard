import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AssessmentWithProfile } from './useCompanyAssessment';

export interface AssessmentSubmittedPayload {
  userId: string;
  isSubmitted: boolean;
  timestamp: string;
  assessment?: AssessmentWithProfile;
}

interface UseAssessmentBroadcastProps {
  teamId: string;
  onRemoteSubmission: (payload: AssessmentSubmittedPayload) => void;
}

export const useAssessmentBroadcast = ({ teamId, onRemoteSubmission }: UseAssessmentBroadcastProps) => {
  const { user } = useAuth();
  const clientIdRef = useRef(`client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Setup broadcast channel
  useEffect(() => {
    if (!teamId) return;

    const channelName = `meeting:${teamId}:assessment-submit`;
    const channel = supabase.channel(channelName);

    channel
      .on('broadcast', { event: 'assessment_submitted' }, ({ payload }) => {
        // Ignore self-broadcasts
        if (payload.clientId === clientIdRef.current) return;
        
        onRemoteSubmission({
          userId: payload.userId,
          isSubmitted: payload.isSubmitted,
          timestamp: payload.timestamp,
          assessment: payload.assessment
        });
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teamId, onRemoteSubmission]);

  // Broadcast submission with full assessment data
  const publishSubmission = useCallback(async (isSubmitted: boolean, assessment?: AssessmentWithProfile) => {
    if (!channelRef.current || !user?.id) return;

    await channelRef.current.send({
      type: 'broadcast',
      event: 'assessment_submitted',
      payload: {
        clientId: clientIdRef.current,
        userId: user.id,
        isSubmitted,
        timestamp: new Date().toISOString(),
        assessment
      }
    });
  }, [user?.id]);

  return { publishSubmission };
};
