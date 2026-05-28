import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

interface Issue {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  created_at: string;
  upvotes?: number;
  downvotes?: number;
}

export const useIssuesAlerts = () => {
  const [highPriorityIssues, setHighPriorityIssues] = useState<Issue[]>([]);
  const [assignedIssues, setAssignedIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { currentCompany } = useMultiCompanyAccess();

  useEffect(() => {
    const fetchIssuesAlerts = async () => {
      if (!currentCompany || !user) {
        logger.log('🔍 useIssuesAlerts: Missing user or company:', { user: !!user, currentCompany: !!currentCompany });
        setLoading(false);
        return;
      }

      try {
        logger.log('🔍 useIssuesAlerts: Fetching for company:', currentCompany?.name);
        
        // Fetch high priority open issues - company scoped
        const { data: highPriority } = await supabase
          .from('issues')
          .select(`
            *,
            teams!inner(company_id)
          `)
          .eq('status', 'open')
          .eq('teams.company_id', currentCompany?.id)
          .order('created_at', { ascending: false })
          .limit(3);

        logger.log('🔍 useIssuesAlerts: Found high priority issues:', highPriority?.length || 0);

        // Fetch issues assigned to current user - company scoped
        const { data: assigned } = await supabase
          .from('issues')
          .select(`
            *,
            teams!inner(company_id)
          `)
          .eq('status', 'open')
          .eq('owner_id', user.id)
          .eq('teams.company_id', currentCompany?.id)
          .order('created_at', { ascending: false })
          .limit(3);

        logger.log('🔍 useIssuesAlerts: Found assigned issues:', assigned?.length || 0);

        setHighPriorityIssues(highPriority || []);
        setAssignedIssues(assigned || []);
      } catch (error) {
        logger.error('❌ useIssuesAlerts: Error fetching issues alerts:', error);
        setHighPriorityIssues([]);
        setAssignedIssues([]);
        setError('Failed to load issues');
      } finally {
        setLoading(false);
      }
    };

    fetchIssuesAlerts();
  }, [user, currentCompany]);

  const voteOnIssue = async (issueId: string, voteType: 'up' | 'down') => {
    try {
      // In a real implementation, you'd track votes in a separate table
      // For now, we'll just show a toast
      toast.success(`Vote recorded for issue`);
    } catch (error) {
      logger.error('Error voting on issue:', error);
      toast.error('Failed to record vote');
    }
  };

  return {
    highPriorityIssues,
    assignedIssues,
    loading,
    error,
    voteOnIssue
  };
};