import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

interface CacheEntry {
  data: any;
  timestamp: number;
  route: string;
}

export const useRouteAwareCaching = (cacheKey: string, data: any) => {
  const location = useLocation();
  const routeCacheRef = useRef<Map<string, CacheEntry>>(new Map());
  
  // Save data when leaving metrics page
  useEffect(() => {
    if (location.pathname !== '/metrics' && data) {
      routeCacheRef.current.set(cacheKey, {
        data,
        timestamp: Date.now(),
        route: '/metrics'
      });
    }
  }, [location.pathname, cacheKey, data]);
  
  // Restore data when returning to metrics page
  const getCachedForRoute = (key: string) => {
    const cached = routeCacheRef.current.get(key);
    if (!cached) return null;
    
    // Keep cache for 30 minutes
    if (Date.now() - cached.timestamp > 30 * 60 * 1000) {
      routeCacheRef.current.delete(key);
      return null;
    }
    
    return cached.data;
  };
  
  // Clear expired cache entries periodically
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      const keysToDelete: string[] = [];
      
      routeCacheRef.current.forEach((entry, key) => {
        if (now - entry.timestamp > 30 * 60 * 1000) {
          keysToDelete.push(key);
        }
      });
      
      keysToDelete.forEach(key => {
        routeCacheRef.current.delete(key);
      });
    }, 5 * 60 * 1000); // Check every 5 minutes
    
    return () => clearInterval(cleanup);
  }, []);
  
  return { getCachedForRoute };
};
