import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

interface RecapEmailData {
  meetingId: string;
  teamId: string;
  companyId?: string | null;
}

export const useSendRecapEmail = () => {
  const [isSending, setIsSending] = useState(false);

  const sendRecapEmail = useCallback(async (data: RecapEmailData) => {
    const { meetingId, teamId, companyId } = data;
    
    if (!meetingId || !teamId) {
      logger.warn('useSendRecapEmail: Missing meetingId or teamId, skipping email');
      return false;
    }

    setIsSending(true);
    
    try {
      logger.debug('📧 useSendRecapEmail: Sending meeting recap email', { meetingId, teamId, companyId });
      
      const response = await supabase.functions.invoke('send-meeting-recap', {
        body: {
          meetingId,
          teamId,
          companyId
        }
      });

      if (response.error) {
        logger.warn('📧 useSendRecapEmail: Meeting recap email failed:', response.error);
        return false;
      }

      logger.debug('📧 useSendRecapEmail: Meeting recap email sent successfully:', response.data);
      return true;
      
    } catch (error) {
      logger.error('📧 useSendRecapEmail: Meeting recap email error:', error);
      return false;
    } finally {
      setIsSending(false);
    }
  }, []);

  return {
    sendRecapEmail,
    isSending
  };
};
