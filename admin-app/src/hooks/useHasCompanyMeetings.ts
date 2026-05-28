import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { logger } from '@/lib/logger';

interface UseHasCompanyMeetingsResult {
  hasMeetings: boolean;
  loading: boolean;
}

export const useHasCompanyMeetings = (): UseHasCompanyMeetingsResult => {
  const { currentCompany } = useMultiCompanyAccess();
  const [hasMeetings, setHasMeetings] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      if (!currentCompany?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { count, error } = await supabase
          .from('meetings_state')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', currentCompany.id)
          .limit(1);

        if (cancelled) return;
        if (error) {
          logger.warn('useHasCompanyMeetings: query failed', error);
          setHasMeetings(true);
        } else {
          setHasMeetings((count ?? 0) > 0);
        }
      } catch (err) {
        if (!cancelled) {
          logger.warn('useHasCompanyMeetings: unexpected error', err);
          setHasMeetings(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    check();
    return () => { cancelled = true; };
  }, [currentCompany?.id]);

  return { hasMeetings, loading };
};
