import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';

export const useMeetingDataFetcher = () => {
  const { currentCompany } = useMultiCompany();

  const fetchMeetingsData = useCallback(async (teamIds: string[]) => {
    if (teamIds.length === 0) {
      return [];
    }

    // Build query to fetch both team-based and member-based meetings
    const { data: meetingsData, error: meetingsError } = await supabase
      .from('meetings_state')
      .select(`
        *,
        meeting_results!left (
          meeting_ratings,
          total_duration_seconds
        )
      `)
      .eq('status', 'active')
      .or(`team_id.in.(${teamIds.join(',')}),and(team_id.is.null,company_id.eq.${currentCompany?.id})`)
      .order('started_at', { ascending: false });

    if (meetingsError) {
      logger.error('useMeetingDataFetcher: Error fetching meetings:', meetingsError);
      throw new Error(`Failed to fetch meetings: ${meetingsError.message}`);
    }

    return meetingsData || [];
  }, [currentCompany?.id]);

  return {
    fetchMeetingsData
  };
};
