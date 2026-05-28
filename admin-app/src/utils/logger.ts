/**
 * Production-safe logger that auto-disables debug/info logs in production.
 * - debug: Development only (high-frequency, render traces, state snapshots)
 * - info: Development only (lifecycle events, fetch success)
 * - warn: Always logged (degraded states, fallbacks)
 * - error: Always logged (failures, exceptions)
 */
class Logger {
  // Use import.meta.env for Vite compatibility
  private isProduction = import.meta.env.PROD;

  error(...args: any[]) {
    console.error(...args);
  }

  warn(...args: any[]) {
    console.warn(...args);
  }

  info(...args: any[]) {
    if (this.isProduction) return;
    console.info(...args);
  }

  debug(...args: any[]) {
    if (this.isProduction) return;
    console.log(...args);
  }

  // Alias for console.log style usage
  log(...args: any[]) {
    if (this.isProduction) return;
    console.log(...args);
  }
}

export const logger = new Logger();
