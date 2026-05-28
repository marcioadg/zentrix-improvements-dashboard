import React, { createContext, useContext, useRef, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { trackUserLoggedIn, trackUserLoggedOut } from '@/lib/statsigAnalytics';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

// Main routes to track for pages_viewed
const MAIN_ROUTES = [
  '/dashboard',
  '/tasks',
  '/goals',
  '/issues',
  '/metrics',
  '/meetings',
  '/people',
  '/strategy',
  '/org-chart',
  '/tools',
  '/settings',
  '/analytics',
  '/profile',
];

interface SessionAnalyticsContextType {
  incrementPagesViewed: () => void;
  incrementActionsTaken: () => void;
  getPagesViewed: () => number;
  getActionsTaken: () => number;
}

const SessionAnalyticsContext = createContext<SessionAnalyticsContextType | undefined>(undefined);

export const SessionAnalyticsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { currentCompany } = useMultiCompany();
  const location = useLocation();
  
  // Counters stored in refs to avoid re-renders
  const pagesViewedRef = useRef(0);
  const actionsTakenRef = useRef(0);
  const sessionStartRef = useRef<Date | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const lastRouteRef = useRef<string | null>(null);
  const hasLoggedInRef = useRef(false);
  
  // Generate session ID on first mount
  useEffect(() => {
    sessionIdRef.current = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    sessionStartRef.current = new Date();
    pagesViewedRef.current = 0;
    actionsTakenRef.current = 0;
  }, []);

  // Track login event
  useEffect(() => {
    if (user && !hasLoggedInRef.current) {
      hasLoggedInRef.current = true;
      try {
        trackUserLoggedIn({
          user_id: user.id,
          company_id: currentCompany?.id || null,
          session_id: sessionIdRef.current || undefined,
        });
        logger.log('📊 SessionAnalytics: user_logged_in tracked');
      } catch (e) {
        logger.warn('Failed to track user login:', e);
      }
    }
  }, [user, currentCompany?.id]);

  // Track logout and session_duration on auth state change
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' && hasLoggedInRef.current) {
        const sessionEnd = new Date();
        const durationMinutes = sessionStartRef.current 
          ? Math.round((sessionEnd.getTime() - sessionStartRef.current.getTime()) / (1000 * 60))
          : 0;

        try {
          // Track logout with session duration data included
          trackUserLoggedOut({
            user_id: user?.id,
            session_id: sessionIdRef.current || undefined,
            session_duration_minutes: durationMinutes,
            pages_viewed: pagesViewedRef.current,
            actions_taken: actionsTakenRef.current,
          });
          
          logger.log('📊 SessionAnalytics: user_logged_out tracked', {
            duration: durationMinutes,
            pages: pagesViewedRef.current,
            actions: actionsTakenRef.current,
          });
        } catch (e) {
          logger.warn('Failed to track user logout:', e);
        }

        // Reset refs for new session
        hasLoggedInRef.current = false;
        pagesViewedRef.current = 0;
        actionsTakenRef.current = 0;
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id]);

  // Track main route changes
  useEffect(() => {
    const currentPath = location.pathname;
    
    // Check if this is a main route
    const isMainRoute = MAIN_ROUTES.some(route => currentPath.startsWith(route));
    
    // Only count if it's a main route AND different from last route
    if (isMainRoute && currentPath !== lastRouteRef.current) {
      pagesViewedRef.current += 1;
      lastRouteRef.current = currentPath;
      logger.log('📊 SessionAnalytics: page viewed', currentPath, '- total:', pagesViewedRef.current);
    }
  }, [location.pathname]);

  // Track button clicks globally
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Check if clicked element or its parent is a button
      const isButton = 
        target.tagName === 'BUTTON' ||
        target.closest('button') !== null ||
        target.getAttribute('role') === 'button' ||
        target.closest('[role="button"]') !== null;
      
      if (isButton) {
        actionsTakenRef.current += 1;
        logger.log('📊 SessionAnalytics: action taken - total:', actionsTakenRef.current);
      }
    };

    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, []);

  const incrementPagesViewed = useCallback(() => {
    pagesViewedRef.current += 1;
  }, []);

  const incrementActionsTaken = useCallback(() => {
    actionsTakenRef.current += 1;
  }, []);

  const getPagesViewed = useCallback(() => pagesViewedRef.current, []);
  const getActionsTaken = useCallback(() => actionsTakenRef.current, []);

  return (
    <SessionAnalyticsContext.Provider value={{
      incrementPagesViewed,
      incrementActionsTaken,
      getPagesViewed,
      getActionsTaken,
    }}>
      {children}
    </SessionAnalyticsContext.Provider>
  );
};

export const useSessionAnalytics = () => {
  const context = useContext(SessionAnalyticsContext);
  if (context === undefined) {
    throw new Error('useSessionAnalytics must be used within a SessionAnalyticsProvider');
  }
  return context;
};
