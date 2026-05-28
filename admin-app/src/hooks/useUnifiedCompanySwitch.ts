import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { endCurrentActivitySession, startNewActivitySession } from '@/hooks/useActivityTracking';
import { logger } from '@/utils/logger';

// Unified company switch handler that coordinates all data invalidation
export const useUnifiedCompanySwitch = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { switchCompany: originalSwitchCompany } = useMultiCompany();

  const switchCompany = useCallback(async (companyId: string) => {
    logger.log('🔄 useUnifiedCompanySwitch: Starting company switch to:', companyId);

    try {
      // STEP 1: End current activity session FIRST (explicit, awaited)
      logger.log('🛑 useUnifiedCompanySwitch: Ending current activity session');
      await endCurrentActivitySession('company_switch');

      // STEP 2: Invalidate company-specific caches (surgical, not full clear)
      // ✅ FIX: queryClient.clear() was too aggressive - it removes ALL cached data
      // causing a "full page reload" visual effect. Instead, invalidate specific keys.
      logger.log('🧹 useUnifiedCompanySwitch: Invalidating company-specific caches');
      await queryClient.invalidateQueries({ predicate: (query) => {
        // Invalidate queries that contain company or team data
        const key = query.queryKey;
        if (!Array.isArray(key)) return false;
        const keyString = JSON.stringify(key).toLowerCase();
        return keyString.includes('metric') || 
               keyString.includes('team') || 
               keyString.includes('issue') ||
               keyString.includes('goal') ||
               keyString.includes('company');
      }});

      // STEP 3: Execute the company switch
      logger.log('🔄 useUnifiedCompanySwitch: Executing company switch');
      await originalSwitchCompany(companyId);

      // STEP 4: Force refetch critical data for new company
      logger.log('🔄 useUnifiedCompanySwitch: Refetching critical data');
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['company-teams'] }),
        queryClient.refetchQueries({ queryKey: ['simplified-metrics'] }),
        queryClient.refetchQueries({ queryKey: ['simplified-issue-counts'] }),
      ]);

      // STEP 5: Explicitly start new session for new company (with duplicate check)
      if (user?.id) {
        logger.log('🔄 useUnifiedCompanySwitch: Starting new session for company:', companyId);
        await startNewActivitySession(user.id, companyId);
      }

      logger.log('✅ useUnifiedCompanySwitch: Company switch completed successfully');
    } catch (error) {
      logger.error('❌ useUnifiedCompanySwitch: Switch failed:', error);
      throw error;
    }
  }, [originalSwitchCompany, queryClient]);

  return { switchCompany };
};