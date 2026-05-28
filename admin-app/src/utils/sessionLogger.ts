import { logger } from '@/utils/logger';

interface LogEntry {
  timestamp: number;
  count: number;
}

class SessionLogger {
  private static STORAGE_KEY = 'metric_warnings_logged';
  private static SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  
  private static getLoggedMetrics(): Record<string, LogEntry> {
    try {
      const stored = sessionStorage.getItem(this.STORAGE_KEY);
      if (!stored) return {};
      
      const parsed = JSON.parse(stored);
      const now = Date.now();
      
      // Clean up old entries
      const cleaned: Record<string, LogEntry> = {};
      for (const [key, entry] of Object.entries(parsed)) {
        const logEntry = entry as LogEntry;
        if (now - logEntry.timestamp < this.SESSION_DURATION) {
          cleaned[key] = logEntry;
        }
      }
      
      return cleaned;
    } catch {
      return {};
    }
  }
  
  private static saveLoggedMetrics(logged: Record<string, LogEntry>): void {
    try {
      sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(logged));
    } catch {
      // Ignore storage errors
    }
  }
  
  static logOncePerMetric(metricId: string, message: string, data?: any): boolean {
    const logged = this.getLoggedMetrics();
    const key = `metric_${metricId}`;
    
    if (logged[key]) {
      // Already logged this metric, increment count but don't log again
      logged[key].count++;
      this.saveLoggedMetrics(logged);
      return false;
    }
    
    // First time logging this metric
    logged[key] = {
      timestamp: Date.now(),
      count: 1
    };
    this.saveLoggedMetrics(logged);
    
    // Log the warning
    logger.warn(message, data);
    return true;
  }
  
  static hasBeenLogged(metricId: string): boolean {
    const logged = this.getLoggedMetrics();
    return !!logged[`metric_${metricId}`];
  }
}

export { SessionLogger };
