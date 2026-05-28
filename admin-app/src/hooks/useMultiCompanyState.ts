
import { useState, useCallback, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Company } from '@/types/multiCompany';
import { fetchUserAccessibleCompanies, getCurrentCompanyFromSettings, updateUserCurrentCompany } from '@/services/multiCompanyService';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { debounce } from '@/utils/debounce';
import { companyEqual } from '@/utils/deepEqual';
import { logRefreshTrigger } from '@/utils/refreshTelemetry';


const COMPANY_STORAGE_KEY = 'selected_company_id';
const CACHE_EXPIRATION_MS = 5 * 60 * 1000; // 5 minutes

const companyCache: {
  userId?: string;
  companies?: Company[];
  currentCompanyId?: string | null;
  timestamp?: number;
  switchInProgress?: boolean;
} = {};

// localStorage helpers
const getStoredCompanyId = (): string | null => {
  try {
    return localStorage.getItem(COMPANY_STORAGE_KEY);
  } catch (error) {
    logger.warn('Failed to read from localStorage:', error);
    return null;
  }
};

const setStoredCompanyId = (companyId: string | null): void => {
  try {
    if (companyId) {
      localStorage.setItem(COMPANY_STORAGE_KEY, companyId);
      // Store company name for cross-app switching
      const comp = companyCache.companies?.find(c => c.id === companyId);
      if (comp) localStorage.setItem('zentrix_active_company_name', comp.name);
    } else {
      localStorage.removeItem(COMPANY_STORAGE_KEY);
    }
  } catch (error) {
    logger.warn('Failed to write to localStorage:', error);
  }
};

export const useMultiCompanyState = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const queryClient = useQueryClient();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  
  // Loading state (removed throttling to prevent infinite loops)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 🎯 PHASE 1: Stable user reference to prevent cascade re-renders
  const stableUserId = useMemo(() => user?.id, [user?.id]);
  const hasUser = !!stableUserId;
  
  // 🎯 PHASE 1: Subscription cleanup tracking
  const subscriptionRef = useRef<any>(null);
  const isSubscriptionActive = useRef(false);
  
  // Simple flag to prevent double-clicks during company switch
  const switchInProgressRef = useRef(false);
  // Retry once on empty company results to handle SSO auth propagation race
  const emptyResultRetryRef = useRef(false);
  const parallelLoadRef = useRef<() => Promise<void>>();

  // Helper: Check if cache is still valid
  const isCacheValid = useCallback(() => {
    if (!companyCache.timestamp) return false;
    const cacheAge = Date.now() - companyCache.timestamp;
    return cacheAge < CACHE_EXPIRATION_MS;
  }, []);

  // SINGLE SOURCE OF TRUTH: Database is the ONLY authoritative source
  const selectBestCompany = useCallback((
    accessibleCompanies: Company[], 
    databaseCompanyId: string | null
  ): Company | null => {
    if (accessibleCompanies.length === 0) return null;

    // ONLY SOURCE: Database (user_settings.current_company_id)
    if (databaseCompanyId) {
      const databaseCompany = accessibleCompanies.find(c => c.id === databaseCompanyId);
      if (databaseCompany) {
        setStoredCompanyId(databaseCompanyId);
        return databaseCompany;
      }
    }

    // No database value? Select first company and SAVE to database immediately
    const firstCompany = accessibleCompanies[0];
    
    if (stableUserId) {
      updateUserCurrentCompany(stableUserId, firstCompany.id).catch(logger.error);
    }
    
    setStoredCompanyId(firstCompany.id);
    return firstCompany;
  }, [stableUserId]);

  // 🎯 PHASE 1: Stable company reference using deep equality
  const stableCurrentCompany = useMemo(() => {
    return currentCompany;
  }, [currentCompany?.id, currentCompany?.name, currentCompany?.slug, currentCompany?.role]);

  // Enhanced parallel loading
  const parallelLoadUserCompanies = useCallback(async () => {
    // Keep ref current so setTimeout retry always calls latest version
    parallelLoadRef.current = parallelLoadUserCompanies;
    // Don't reload if a switch is in progress
    if (switchInProgressRef.current) return;
    
    if (!stableUserId) {
      setCompanies([]);
      setCurrentCompany(null);
      setLoading(true);
      setError(null);
      setStoredCompanyId(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Check for cross-app company switch BEFORE cache
      const crossAppName = localStorage.getItem('zentrix_active_company_name');
      const hasCrossAppSwitch = !!crossAppName;

      // Check cache first, but skip if cross-app switch is pending
      if (
        !hasCrossAppSwitch &&
        companyCache.userId === stableUserId &&
        companyCache.companies &&
        companyCache.currentCompanyId !== undefined &&
        isCacheValid()
      ) {
        setCompanies(companyCache.companies);
        const selectedCompany = companyCache.companies.find(c => c.id === companyCache.currentCompanyId) || 
                               companyCache.companies[0] || null;
        setCurrentCompany(selectedCompany);
          setLoading(false);
        return;
      }

      // SINGLE SOURCE: Only fetch database (localStorage is for optimistic UI only)
      const [accessibleCompanies, databaseCompanyId] = await Promise.all([
        fetchUserAccessibleCompanies(stableUserId),
        getCurrentCompanyFromSettings(stableUserId)
      ]);

      setCompanies(accessibleCompanies);

      if (accessibleCompanies.length === 0) {
        // Retry once after a short delay — handles SSO auth propagation race where
        // the JWT hasn't fully propagated to RLS policies on the first query.
        if (!emptyResultRetryRef.current) {
          emptyResultRetryRef.current = true;
          logger.warn('⚠️ useMultiCompanyState: No companies on first load — retrying in 1s (SSO race guard)');
          setTimeout(() => parallelLoadRef.current?.(), 1000);
          return;
        }
        // Second attempt also empty — genuinely no company
        emptyResultRetryRef.current = false;
        setCurrentCompany(null);
        setError(null);
        companyCache.userId = stableUserId;
        companyCache.companies = [];
        companyCache.currentCompanyId = null;
        setLoading(false);
        return;
      }
      // Reset retry flag on successful load
      emptyResultRetryRef.current = false;

      // Use cross-app company name match if pending
      let overrideCompanyId = databaseCompanyId;
      if (crossAppName) {
        const matchByName = accessibleCompanies.find(c => c.name === crossAppName);
        if (matchByName) {
          overrideCompanyId = matchByName.id;
          localStorage.removeItem('zentrix_active_company_name');
        }
      }

      // Single source of truth: Only use database value (or cross-app override)
      const selectedCompany = selectBestCompany(accessibleCompanies, overrideCompanyId);
      setCurrentCompany(selectedCompany);

      // Update cache (read-through only, database is source of truth)
      companyCache.userId = stableUserId;
      companyCache.companies = accessibleCompanies;
      if (companyCache.currentCompanyId !== databaseCompanyId) {
        companyCache.currentCompanyId = databaseCompanyId;
      }
      companyCache.timestamp = Date.now();

    } catch (error) {
      logger.error('Error loading companies:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load companies';
      setError(errorMessage);
      toastRef.current({
        title: "Error loading companies",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [stableUserId, selectBestCompany, isCacheValid]);

  const fetchUserCompanies = parallelLoadUserCompanies;

  // Enhanced switch company with error handling
  const switchCompany = useCallback(async (companyId: string) => {
    if (!stableUserId) return;

    // Prevent double-clicks
    if (switchInProgressRef.current) return;

    const targetCompany = companies.find(c => c.id === companyId);
    if (!targetCompany) {
      logger.error('switchCompany: Company not accessible:', companyId);
      toastRef.current({
        title: "Error",
        description: "Cannot switch to company - not accessible",
        variant: "destructive",
      });
      return;
    }

    // Set switch in progress flag
    switchInProgressRef.current = true;
    
    // Store original company for rollback
    const originalCompany = currentCompany;

    // 🔍 TELEMETRY: Log company switch
    logRefreshTrigger('company-switch', {
      from: originalCompany?.id,
      to: companyId,
      fromName: originalCompany?.name,
      toName: targetCompany.name,
    });

    // Clear ALL cache SYNCHRONOUSLY before switching
    companyCache.companies = undefined;
    companyCache.currentCompanyId = undefined;
    companyCache.timestamp = undefined;

    try {
      // Comprehensive cache invalidation BEFORE switching
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['userTeams'] }),
        queryClient.invalidateQueries({ queryKey: ['optimized-user-teams'] }),
        queryClient.invalidateQueries({ queryKey: ['company-users'] }),
        queryClient.invalidateQueries({ queryKey: ['unified-users'] }),
        queryClient.invalidateQueries({ queryKey: ['weekly-metrics'] }),
        queryClient.invalidateQueries({ queryKey: ['metrics-data'] }),
        queryClient.invalidateQueries({ queryKey: ['consolidated-metrics'] }),
        queryClient.invalidateQueries({ queryKey: ['team-goals'] }),
        queryClient.invalidateQueries({ queryKey: ['company-goals'] }),
        queryClient.invalidateQueries({ queryKey: ['strategic-plan'] }),
        queryClient.invalidateQueries({ queryKey: ['issues'] }),
        queryClient.invalidateQueries({ queryKey: ['issue-counts'] }),
        queryClient.invalidateQueries({ queryKey: ['meetings'] }),
        queryClient.invalidateQueries({ queryKey: ['teams'] }),
        queryClient.invalidateQueries({ queryKey: ['team-management'] }),
        queryClient.invalidateQueries({ queryKey: ['team-members'] }),
      ]);
      // Update database FIRST to ensure RLS policies see correct company
      await updateUserCurrentCompany(stableUserId, companyId);
      
      // THEN update UI state
      setCurrentCompany(targetCompany);
      setStoredCompanyId(companyId);
      companyCache.currentCompanyId = companyId;
      companyCache.timestamp = Date.now();
      
      // Non-blocking verification with retry logic
      setTimeout(async () => {
        try {
          const verifyCompanyId = await getCurrentCompanyFromSettings(stableUserId);
          if (verifyCompanyId !== companyId) {
            await updateUserCurrentCompany(stableUserId, companyId);
          }
        } catch (error) {
          // Silent fail for verification
        }
      }, 500);
      
      // Force refresh of data after company switch
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['userTeams'] }),
        queryClient.refetchQueries({ queryKey: ['optimized-user-teams'] }),
      ]);
      
      toastRef.current({
        title: "Company switched",
        description: `Now viewing ${targetCompany.name}`,
      });
    } catch (error) {
      logger.error('switchCompany: Database update failed:', error);
      
      // Revert optimistic update
      setCurrentCompany(originalCompany);
      companyCache.currentCompanyId = originalCompany?.id || null;
      setStoredCompanyId(originalCompany?.id || null);
      
      // CRITICAL FIX: Restore cache timestamp to prevent stale state
      // Without this, cache is cleared but never repopulated on error
      companyCache.timestamp = Date.now();
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to switch company';
      toastRef.current({
        title: "Error switching company",
        description: errorMessage,
        variant: "destructive",
      });
      
      // CRITICAL FIX: Trigger refresh on error to restore valid cache state
      // This ensures cache is repopulated even if switch fails
      await refreshCompanies();
      
      throw error;
    } finally {
      switchInProgressRef.current = false;
    }
  }, [stableUserId, companies, currentCompany, queryClient]);

  // Enhanced refresh with cache invalidation
  const refreshCompanies = useCallback(async () => {
    // Don't refresh if a switch is in progress
    if (switchInProgressRef.current) return;
    
    // Clear ALL cache synchronously
    companyCache.userId = undefined;
    companyCache.companies = undefined;
    companyCache.currentCompanyId = undefined;
    companyCache.timestamp = undefined;
    companyCache.switchInProgress = undefined;
    
    // Clear localStorage as well
    try {
      localStorage.removeItem(COMPANY_STORAGE_KEY);
    } catch (error) {
      // Silent fail
    }
    
    // Also invalidate React Query cache
    queryClient.invalidateQueries({ queryKey: ['companies'] });
    queryClient.invalidateQueries({ queryKey: ['userTeams'] });
    
    // Force fresh fetch from database
    await fetchUserCompanies();
  }, [fetchUserCompanies, stableUserId, queryClient]);

  // Debounced refresh to prevent cascade
  const debouncedRefreshCompanies = useCallback(
    debounce(() => {
      refreshCompanies();
    }, 1000),
    [refreshCompanies]
  );

  // Consolidated subscription management with cleanup tracking
  const setupRealtimeSubscriptions = useCallback(() => {
    if (!stableUserId) return;

    // Prevent duplicate subscriptions
    if (isSubscriptionActive.current) return;

    const channel = supabase
      .channel(`company-changes-${stableUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'company_members',
          filter: `user_id=eq.${stableUserId}`
        },
        (payload) => {
          if (switchInProgressRef.current) return;
          
          // 🔍 TELEMETRY: Log company_members realtime event
          logRefreshTrigger('realtime-company-members', {
            event: payload.eventType,
            companyId: (payload.new as any)?.company_id || (payload.old as any)?.company_id,
            currentCompanyId: companyCache.currentCompanyId,
            userId: stableUserId,
          });
          
          // Clear cache and refresh companies list
          if (stableUserId && companyCache.userId === stableUserId) {
            companyCache.companies = undefined;
            companyCache.currentCompanyId = undefined;
            companyCache.timestamp = undefined;
          }
          debouncedRefreshCompanies();
        }
      )
      .subscribe();

    isSubscriptionActive.current = true;
    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
      isSubscriptionActive.current = false;
    };
  }, [stableUserId, debouncedRefreshCompanies]);

  return {
    companies,
    currentCompany: stableCurrentCompany,
    loading: !hasUser || loading,
    error,
    switchCompany,
    refreshCompanies,
    fetchUserCompanies,
    setupRealtimeSubscriptions
  };
};
