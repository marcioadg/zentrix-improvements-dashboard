import { useCallback } from 'react';

/**
 * Hook that provides production-safe logging methods
 * Automatically disables debug/info logs in production
 */
export const useProductionSafeLogging = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const log = useCallback((level: 'error' | 'warn' | 'info' | 'debug', message: string, data?: any) => {
    if (!isDevelopment && (level === 'debug' || level === 'info')) {
      return; // Skip debug/info logs in production
    }
    
    const emoji = {
      error: '❌',
      warn: '⚠️',
      info: 'ℹ️',
      debug: '🔍'
    }[level];
    
    console[level === 'debug' ? 'log' : level](`${emoji} ${message}`, data || '');
  }, [isDevelopment]);

  return {
    error: useCallback((message: string, data?: any) => log('error', message, data), [log]),
    warn: useCallback((message: string, data?: any) => log('warn', message, data), [log]),
    info: useCallback((message: string, data?: any) => log('info', message, data), [log]),
    debug: useCallback((message: string, data?: any) => log('debug', message, data), [log]),
    isDevelopment
  };
};