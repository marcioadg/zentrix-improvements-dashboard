import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { useCurrentUserPermissionLevel } from '@/hooks/useUserPermissionLevel';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { requestDeduplicator } from '@/utils/requestDeduplicator';

interface AccessiblePlan {
  id: string;
  title: string;
  team_id: string;
  team_name: string;
  company_shared: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// 🎯 PHASE 4: Enhanced strategic plan access cache with request deduplication
const strategicPlanCache = new Map<string, {
  canView: boolean;
  plans: AccessiblePlan[];
  shouldShow: boolean;
  timestamp: number;
}>();

const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes cache

export const useStrategicPlanAccess = () => {
  const { user } = useAuth();
  const { currentCompany } = useMultiCompanyAccess();
  const { permissionLevel } = useCurrentUserPermissionLevel();
  const [canViewStrategicPlans, setCanViewStrategicPlans] = useState<boolean>(false);
  const [accessiblePlans, setAccessiblePlans] = useState<AccessiblePlan[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // 🎯 PHASE 3: Remove loading state thrashing with stable reference
  const [isInitializing, setIsInitializing] = useState(true);
  const stableLoadingRef = useRef(true);
  
  // 🎯 PHASE 3: Stable cached value for UI decisions - prevents blinking
  const [stableShouldShow, setStableShouldShow] = useState<boolean>(false);
  const lastCompanyIdRef = useRef<string | null>(null);

  // 🎯 PHASE 3: Stable company ID to prevent unnecessary re-fetches
  const stableCompanyId = useMemo(() => {
    return currentCompany?.id || null;
  }, [currentCompany?.id]);

  // 🎯 PHASE 4: Optimized access check with request deduplication
  useEffect(() => {
    const checkAccess = async () => {
      if (!user?.id || !stableCompanyId) {
        setCanViewStrategicPlans(false);
        setAccessiblePlans([]);
        setStableShouldShow(false);
        stableLoadingRef.current = false;
        setIsInitializing(false);
        return;
      }

      // Check cache first
      const cacheKey = `${user.id}-${stableCompanyId}`;
      const cached = strategicPlanCache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
        logger.debug('🎯 StrategicPlan: Using cached access data');
        setCanViewStrategicPlans(cached.canView);
        setAccessiblePlans(cached.plans);
        setStableShouldShow(cached.shouldShow);
        stableLoadingRef.current = false;
        setIsInitializing(false);
        return;
      }

      try {
        stableLoadingRef.current = true;
        setError(null);

        // 🎯 PHASE 4: Deduplicated parallel fetch for better performance
        const [canView, plans] = await Promise.all([
          requestDeduplicator.deduplicate(
            `strategic-plan-access-${user.id}-${stableCompanyId}`,
            async () => {
              const { data, error } = await supabase.rpc('can_user_view_strategic_plans', {
                p_user_id: user.id,
                p_company_id: stableCompanyId
              });
              if (error) throw error;
              return data || false;
            },
            CACHE_DURATION
          ),
          requestDeduplicator.deduplicate(
            `strategic-plans-${user.id}-${stableCompanyId}`,
            async () => {
              const { data, error } = await supabase.rpc('get_accessible_strategic_plans', {
                p_user_id: user.id,
                p_company_id: stableCompanyId
              });
              if (error) throw error;
              return data || [];
            },
            CACHE_DURATION
          )
        ]);

        setCanViewStrategicPlans(canView);
        setAccessiblePlans(plans);

        // 🎯 PHASE 3: Calculate stable shouldShow value with member restrictions
        // Members can only see Strategy if there are publicly shared plans
        let shouldShow: boolean;
        if (permissionLevel === 'member') {
          // For members, only show if there are publicly shared plans
          shouldShow = plans.some(plan => plan.company_shared);
        } else {
          // For managers, directors, and super admins, use original logic
          shouldShow = canView || plans.some(plan => plan.company_shared);
        }
        setStableShouldShow(shouldShow);

        // Update cache
        strategicPlanCache.set(cacheKey, {
          canView,
          plans,
          shouldShow,
          timestamp: Date.now()
        });

        // Clean old cache entries
        if (strategicPlanCache.size > 10) {
          const oldestKey = Array.from(strategicPlanCache.keys())[0];
          strategicPlanCache.delete(oldestKey);
        }

      } catch (err) {
        logger.error('Strategic plan access check failed:', err);
        setError(err instanceof Error ? err.message : 'Failed to check access');
        setCanViewStrategicPlans(false);
        setAccessiblePlans([]);
        setStableShouldShow(false);
      } finally {
        stableLoadingRef.current = false;
        setIsInitializing(false);
      }
    };

    // 🎯 PHASE 3: Immediate execution - no debouncing
    checkAccess();
    
    // Track company changes for cache invalidation
    if (lastCompanyIdRef.current !== stableCompanyId) {
      lastCompanyIdRef.current = stableCompanyId;
    }
  }, [user?.id, stableCompanyId, permissionLevel]);

  // 🎯 PHASE 4: Enhanced refetch with cache invalidation
  const refetch = useCallback(() => {
    if (user?.id && stableCompanyId) {
      const cacheKey = `${user.id}-${stableCompanyId}`;
      strategicPlanCache.delete(cacheKey);
      
      // Invalidate request deduplicator cache
      requestDeduplicator.invalidateCache(`strategic-plan-access-${user.id}-${stableCompanyId}`);
      requestDeduplicator.invalidateCache(`strategic-plans-${user.id}-${stableCompanyId}`);
      
      setIsInitializing(true);
      stableLoadingRef.current = true;
    }
  }, [user?.id, stableCompanyId]);

  // 🎯 PHASE 3: Stable shouldShow calculation with error boundary protection and member restrictions
  const shouldShowStrategyPage = useMemo(() => {
    try {
      // During initialization, use stable cached value
      if (isInitializing) {
        return stableShouldShow;
      }
      
      // Apply member restrictions: Members can only see Strategy if there are publicly shared plans
      if (permissionLevel === 'member') {
        return accessiblePlans.some(plan => plan.company_shared);
      }
      
      // For managers, directors, and super admins, use original logic
      return canViewStrategicPlans || accessiblePlans.some(plan => plan.company_shared);
    } catch (error) {
      logger.error('🚨 StrategicPlan: Error calculating shouldShow:', error);
      return stableShouldShow; // Fallback to stable value
    }
  }, [isInitializing, stableShouldShow, canViewStrategicPlans, accessiblePlans, permissionLevel]);

  return {
    canViewStrategicPlans,
    accessiblePlans,
    shouldShowStrategyPage,
    loading: stableLoadingRef.current,
    error,
    refetch
  };
};