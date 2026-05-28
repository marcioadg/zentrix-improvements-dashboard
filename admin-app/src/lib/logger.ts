/**
 * Re-export the main logger from utils for backward compatibility.
 * This ensures all imports from '@/lib/logger' use the production-safe logger.
 */
export { logger } from '@/utils/logger';
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';
