
import React, { createContext, useContext, useEffect, useMemo, useCallback } from 'react';
import { MultiCompanyContextType } from '@/types/multiCompany';
import { useMultiCompanyState } from '@/hooks/useMultiCompanyState';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/utils/logger';

const MultiCompanyContext = createContext<MultiCompanyContextType | undefined>(undefined);

export const useMultiCompany = () => {
  const context = useContext(MultiCompanyContext);
  if (!context) {
    throw new Error('useMultiCompany must be used within a MultiCompanyProvider');
  }
  return context;
};

// Memoized provider to prevent unnecessary re-renders
export const MultiCompanyProvider: React.FC<{ children: React.ReactNode }> = React.memo(({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const {
    companies,
    currentCompany,
    loading,
    error,
    switchCompany,
    refreshCompanies,
    fetchUserCompanies,
    setupRealtimeSubscriptions
  } = useMultiCompanyState();

  // STABILIZED: Only fetch companies when auth is ready and user exists
  const stableUserId = useMemo(() => user?.id, [user?.id]);
  
  // Batch the initial data loading to reduce waterfall
  // NOTE: We intentionally fetch companies on ALL routes including /onboarding.
  // Previously we skipped it on /onboarding to avoid unnecessary fetches for new users,
  // but this caused a deadlock: if ProtectedRoute redirected to /onboarding (incorrectly,
  // due to a race condition), companies would never be fetched, and the user would be
  // stuck on onboarding even though they have a company.
  // Fetching on /onboarding is safe: the Onboarding page handles both new users (no company)
  // and existing users (has company via refreshCompanies + navigate to dashboard).
  useEffect(() => {
    if (!authLoading && stableUserId) {
      fetchUserCompanies().catch(err => logger.error('Failed to fetch company data:', err));
      // setupRealtimeSubscriptions returns a cleanup function — capture it for proper teardown
      const cleanupSubscriptions = setupRealtimeSubscriptions();
      return () => {
        if (typeof cleanupSubscriptions === 'function') {
          cleanupSubscriptions();
        }
      };
    }
  }, [stableUserId, authLoading, fetchUserCompanies, setupRealtimeSubscriptions]);

  // Enhanced switchCompany with consistent reference
  const enhancedSwitchCompany = useCallback(async (companyId: string) => {
    try {
      await switchCompany(companyId);
    } catch (error) {
      logger.error('Error switching company:', error);
      throw error; // Re-throw to allow proper error handling
    }
  }, [switchCompany]);

  // Stable context value with proper memoization
  const contextValue = useMemo(() => {
    return {
      companies,
      currentCompany,
      loading: authLoading || loading,
      error,
      switchCompany: enhancedSwitchCompany,
      refreshCompanies,
    };
  }, [
    companies,
    currentCompany,
    authLoading,
    loading,
    error,
    enhancedSwitchCompany,
    refreshCompanies,
  ]);

  return (
    <MultiCompanyContext.Provider value={contextValue}>
      {children}
    </MultiCompanyContext.Provider>
  );
});

MultiCompanyProvider.displayName = 'MultiCompanyProvider';
