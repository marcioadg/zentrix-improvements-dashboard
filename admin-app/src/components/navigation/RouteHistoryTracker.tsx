import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { logger } from '@/utils/logger';

const ROUTE_HISTORY_KEY = 'route_history';
const MAX_HISTORY_LENGTH = 10;

export const RouteHistoryTracker = () => {
  const location = useLocation();

  useEffect(() => {
    try {
      // Get current history from sessionStorage
      const historyStr = sessionStorage.getItem(ROUTE_HISTORY_KEY);
      const history: string[] = historyStr ? JSON.parse(historyStr) : [];
      
      const currentPath = location.pathname;
      
      // Don't track the same path consecutively or certain paths we don't want to track
      const skipPaths = ['/login', '/signup', '/auth/callback'];
      const shouldSkip = skipPaths.some(path => currentPath.startsWith(path));
      
      if (!shouldSkip && (history.length === 0 || history[history.length - 1] !== currentPath)) {
        // Add current path to history
        const newHistory = [...history, currentPath].slice(-MAX_HISTORY_LENGTH);
        sessionStorage.setItem(ROUTE_HISTORY_KEY, JSON.stringify(newHistory));
      }
    } catch (error) {
      logger.error('❌ RouteHistoryTracker: Error updating route history:', error);
    }
  }, [location.pathname]);

  return null; // This component doesn't render anything
};

// Utility function to get the previous route
export const getPreviousRoute = (): string | null => {
  try {
    const historyStr = sessionStorage.getItem(ROUTE_HISTORY_KEY);
    const history: string[] = historyStr ? JSON.parse(historyStr) : [];
    
    logger.log('📍 getPreviousRoute: Current history:', history);
    
    // Find the most recent route that's not a meeting route
    for (let i = history.length - 2; i >= 0; i--) {
      const route = history[i];
      if (route && !route.includes('/meeting/')) {
        logger.log('📍 getPreviousRoute: Found valid previous route:', route);
        return route;
      }
    }
    
    logger.log('📍 getPreviousRoute: No valid previous route found');
    return null;
  } catch (error) {
    logger.error('❌ RouteHistoryTracker: Error getting previous route:', error);
    return null;
  }
};

// Utility function to get a safe fallback route for a given team
export const getSafeFallbackRoute = (teamId?: string): string => {
  if (teamId) {
    return `/meetings`;  // Changed from /meeting/{teamId} to /meetings list
  }
  return '/dashboard';
};