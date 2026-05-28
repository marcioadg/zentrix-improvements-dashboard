
import React, { useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { useSubscription } from '@/hooks/useSubscription';
import { useProfile } from '@/hooks/useProfile';
import { logger } from '@/utils/logger';
import { isMobileOrTabletDevice } from '@/utils/mobileDetection';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, session, loading } = useAuth();
  const { currentCompany, loading: companyLoading, refreshCompanies } = useMultiCompany();
  const { subscription, loading: subscriptionLoading } = useSubscription();
  const { profile, loading: profileLoading } = useProfile();

  // hasInitialized tracks first stable auth+company state resolution
  const hasInitialized = useRef(false);
  // retryAttempted tracks whether we've done a defensive re-fetch before redirecting to onboarding
  const retryAttempted = useRef(false);
  // emptyCompanyCount counts how many consecutive renders have seen companyLoading=false, currentCompany=null
  const emptyCompanyCount = useRef(0);

  // Determine if this is an onboarding path where users might not have company/subscription yet
  const isOnboardingPath = window.location.pathname.startsWith('/onboarding') || 
                          window.location.pathname.startsWith('/new-company');
  const isSettingsPath = window.location.pathname.startsWith('/settings') || 
                         window.location.pathname.startsWith('/m/settings');
  
  // Check if this is a mobile route (/m/*) - these routes bypass subscription
  const isMobileRoute = window.location.pathname.startsWith('/m/');
  
  // Check if running on mobile platform (Capacitor native app) or mobile-sized viewport (iPads, tablets)
  const isMobileApp = isMobileOrTabletDevice();

  // Mark initialization complete after first successful auth + company resolution
  // IMPORTANT: Only set hasInitialized when company data is definitively loaded
  // (companyLoading=false). This prevents the race condition where:
  // 1. companyLoading transitions false briefly before companies are fully fetched
  // 2. hasInitialized becomes true
  // 3. A subsequent re-render (e.g. from SIGNED_IN event) sees currentCompany=null + hasInitialized=true → wrong redirect
  useEffect(() => {
    if (!hasInitialized.current && !loading && !!user && !companyLoading) {
      if (currentCompany) {
        // User has a company — safe to mark as initialized
        hasInitialized.current = true;
        retryAttempted.current = false;
        emptyCompanyCount.current = 0;
        if (process.env.NODE_ENV === 'development') {
          logger.debug('ProtectedRoute: Initialization complete (with company)', {
            userId: user?.id,
            companyId: currentCompany?.id,
          });
        }
      } else {
        // User has no company after loading. Don't immediately redirect.
        // Do a defensive re-fetch first in case this was a timing issue.
        emptyCompanyCount.current += 1;
        if (emptyCompanyCount.current >= 2 && retryAttempted.current) {
          // Two consecutive renders with empty company, and we've already retried — genuine new user
          hasInitialized.current = true;
          if (process.env.NODE_ENV === 'development') {
            logger.debug('ProtectedRoute: Initialization complete (no company, after retry)', {
              userId: user?.id,
            });
          }
        } else if (!retryAttempted.current) {
          // First time seeing empty company — trigger a defensive re-fetch
          retryAttempted.current = true;
          if (process.env.NODE_ENV === 'development') {
            logger.debug('ProtectedRoute: No company after loading — triggering defensive re-fetch');
          }
          refreshCompanies().catch(err => logger.warn('ProtectedRoute: Defensive re-fetch failed:', err));
        }
      }
    }
  }, [loading, user, companyLoading, currentCompany, refreshCompanies]);

  // Remove sensitive auth state logging in production
  // Skip subscription-related logging on mobile for Apple compliance
  if (process.env.NODE_ENV === 'development' && !isMobileRoute && !isMobileApp) {
    logger.debug('ProtectedRoute: Checking auth state', {
      loading,
      hasUser: !!user,
      hasSession: !!session,
      subscribed: subscription.subscribed,
      subscriptionLoading,
      companyLoading,
      isOnboardingPath,
      initialized: hasInitialized.current,
    });
  }

  // Always wait for auth loading. For non-onboarding routes, also wait for company data
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // After auth is ready, wait for company data on non-onboarding routes
  if (user && companyLoading && !isOnboardingPath && !isSettingsPath) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // While we're waiting for a defensive re-fetch (retryAttempted but not hasInitialized yet),
  // show a spinner instead of redirecting to onboarding.
  if (user && !companyLoading && !currentCompany && !hasInitialized.current && retryAttempted.current && !isOnboardingPath && !isSettingsPath) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user || !session) {
    // Preserve the current path as redirect parameter so user returns here after login
    const currentPath = window.location.pathname + window.location.search;
    const redirectParam = currentPath !== '/' ? `?redirect=${encodeURIComponent(currentPath)}` : '';
    return <Navigate to={`/login${redirectParam}`} replace />;
  }

  // Check if user profile is loaded
  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Block access if user account is deactivated (role='inactive')
  if (profile?.role === 'inactive') {
    if (process.env.NODE_ENV === 'development') {
      logger.debug('ProtectedRoute: User account is deactivated, redirecting to deactivated page', {
        userId: user?.id,
        profileRole: profile?.role,
        currentPath: window.location.pathname
      });
    }
    return <Navigate to="/account-deactivated" replace />;
  }

  // If user has no company and isn't on settings/onboarding, redirect to onboarding
  // Guard: only redirect after initialization is confirmed complete (with retry)
  if (!currentCompany && !companyLoading && hasInitialized.current && !isSettingsPath && !isOnboardingPath) {
    if (process.env.NODE_ENV === 'development') {
      logger.debug('ProtectedRoute: Redirecting to onboarding - no company (confirmed after retry)', {
        hasCurrentCompany: !!currentCompany,
        currentPath: window.location.pathname
      });
    }
    return <Navigate to="/onboarding" replace />;
  }

  // Allow access to settings and onboarding paths even without subscription
  if (isSettingsPath || isOnboardingPath) {
    return <>{children}</>;
  }

  // MOBILE ROUTES OR MOBILE PLATFORM: Skip ALL subscription checks
  // This ensures no traces of payment/subscription logic appear on:
  // - Native mobile apps (isMobileApp)
  // - Mobile web routes (/m/* paths)
  if (isMobileApp || isMobileRoute) {
    return <>{children}</>;
  }

  // WEB ONLY: Use subscription data for redirect decision
  // Skip billing redirect for users in onboarding variant A/B test — they need to see
  // the dashboard first so the MeetingWizard or SpotlightTour can appear.
  const hasOnboardingVariant = (() => {
    try { return !!sessionStorage.getItem('onboarding_variant'); } catch { return false; }
  })();

  const justOnboarded = (() => {
    try { return sessionStorage.getItem('just_onboarded') === '1'; } catch { return false; }
  })();

  // Clear the flag once the subscription check confirms access, so a later
  // trial expiry in the same session still triggers the billing redirect.
  if (justOnboarded && !subscriptionLoading && subscription.subscribed) {
    try { sessionStorage.removeItem('just_onboarded'); } catch {}
  }

  if (!subscriptionLoading && !subscription.subscribed && !!currentCompany && !window.location.pathname.startsWith('/checkout') && !hasOnboardingVariant && !justOnboarded) {
    if (process.env.NODE_ENV === 'development') {
      logger.debug('ProtectedRoute: Redirecting due to inactive subscription', {
        subscribed: subscription.subscribed,
        currentPath: window.location.pathname,
        isMobile: isMobileOrTabletDevice()
      });
    }
    return <Navigate to="/settings?tab=billing" replace />;
  }

  return <>{children}</>;
};
