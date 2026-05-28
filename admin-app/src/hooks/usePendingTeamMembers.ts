
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { logger } from '@/utils/logger';

interface PendingMember {
  id: string;
  email: string;
  full_name: string | null;
}

export const usePendingTeamMembers = (teamId: string | null) => {
  const { currentCompany } = useMultiCompany();
  const [pendingMembers, setPendingMembers] = useState<PendingMember[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPendingMembers = useCallback(async () => {
    if (!teamId || !currentCompany?.id) {
      setPendingMembers([]);
      return;
    }

    setLoading(true);
    try {
      // Query invitations where team_ids array contains this team
      const { data, error } = await supabase
        .from('invitations')
        .select('id, email, full_name')
        .eq('company_id', currentCompany?.id)
        .eq('status', 'pending')
        .contains('team_ids', [teamId]);

      if (error) throw error;

      setPendingMembers(data || []);
    } catch (error) {
      logger.error('Error fetching pending team members:', error);
      setPendingMembers([]);
    } finally {
      setLoading(false);
    }
  }, [teamId, currentCompany?.id]);

  useEffect(() => {
    fetchPendingMembers();
  }, [fetchPendingMembers]);

  return { pendingMembers, loading, refetch: fetchPendingMembers };
};
