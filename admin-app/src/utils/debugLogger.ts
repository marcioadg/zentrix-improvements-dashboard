import { logger } from '@/utils/logger';

// Environment-based logging utility with categories and levels
const isDevelopment = process.env.NODE_ENV === 'development';

export type LogCategory = 
  | 'meeting'
  | 'auth'
  | 'data'
  | 'ui'
  | 'performance'
  | 'sync'
  | 'timer'
  | 'voting'
  | 'navigation'
  | 'api'
  | 'user'
  | 'admin'
  | 'general';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogOptions {
  category?: LogCategory;
  level?: LogLevel;
  data?: any;
  force?: boolean; // Force log even in production
}

const formatMessage = (category: LogCategory | undefined, message: string, data?: any): string[] => {
  const prefix = category ? `[${category.toUpperCase()}]` : '';
  const args = [prefix, message];
  if (data !== undefined) {
    args.push(data);
  }
  return args.filter(Boolean);
};

export const debugLogger = {
  // Development-only logs
  debug: (message: string, options: LogOptions = {}) => {
    if (isDevelopment || options.force) {
      const args = formatMessage(options.category, message, options.data);
      logger.log(...args);
    }
  },

  // Info logs - shown in development, optional in production
  info: (message: string, options: LogOptions = {}) => {
    if (isDevelopment || options.force) {
      const args = formatMessage(options.category, message, options.data);
      logger.info(...args);
    }
  },

  // Warnings - always shown
  warn: (message: string, options: LogOptions = {}) => {
    const args = formatMessage(options.category, message, options.data);
    logger.warn(...args);
  },

  // Errors - always shown
  error: (message: string, options: LogOptions = {}) => {
    const args = formatMessage(options.category, message, options.data);
    logger.error(...args);
  },

  // Category-specific loggers for convenience
  meeting: {
    debug: (message: string, data?: any) => debugLogger.debug(message, { category: 'meeting', data }),
    info: (message: string, data?: any) => debugLogger.info(message, { category: 'meeting', data }),
    warn: (message: string, data?: any) => debugLogger.warn(message, { category: 'meeting', data }),
    error: (message: string, data?: any) => debugLogger.error(message, { category: 'meeting', data }),
  },

  timer: {
    debug: (message: string, data?: any) => debugLogger.debug(message, { category: 'timer', data }),
    info: (message: string, data?: any) => debugLogger.info(message, { category: 'timer', data }),
    warn: (message: string, data?: any) => debugLogger.warn(message, { category: 'timer', data }),
    error: (message: string, data?: any) => debugLogger.error(message, { category: 'timer', data }),
  },

  sync: {
    debug: (message: string, data?: any) => debugLogger.debug(message, { category: 'sync', data }),
    info: (message: string, data?: any) => debugLogger.info(message, { category: 'sync', data }),
    warn: (message: string, data?: any) => debugLogger.warn(message, { category: 'sync', data }),
    error: (message: string, data?: any) => debugLogger.error(message, { category: 'sync', data }),
  },

  auth: {
    debug: (message: string, data?: any) => debugLogger.debug(message, { category: 'auth', data }),
    info: (message: string, data?: any) => debugLogger.info(message, { category: 'auth', data }),
    warn: (message: string, data?: any) => debugLogger.warn(message, { category: 'auth', data }),
    error: (message: string, data?: any) => debugLogger.error(message, { category: 'auth', data }),
  },

  admin: {
    debug: (message: string, data?: any) => debugLogger.debug(message, { category: 'admin', data }),
    info: (message: string, data?: any) => debugLogger.info(message, { category: 'admin', data }),
    warn: (message: string, data?: any) => debugLogger.warn(message, { category: 'admin', data }),
    error: (message: string, data?: any) => debugLogger.error(message, { category: 'admin', data }),
  },

  // Legacy compatibility
  log: (...args: any[]) => {
    if (isDevelopment) {
      logger.log(...args);
    }
  }
};
