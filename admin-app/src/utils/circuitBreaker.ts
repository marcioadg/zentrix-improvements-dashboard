import { logger } from '@/utils/logger';

interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeout: number;
  monitoringPeriod: number;
}

enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

class CircuitBreaker {
  private state = CircuitState.CLOSED;
  private failureCount = 0;
  private lastFailureTime = 0;
  private nextAttemptTime = 0;

  constructor(private options: CircuitBreakerOptions) {}

  async execute<T>(operation: () => Promise<T>, operationName: string): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttemptTime) {
        const error = new Error(`Circuit breaker is OPEN for ${operationName}. Try again later.`);
        logger.warn(`🚫 CircuitBreaker: ${error.message}`);
        throw error;
      } else {
        this.state = CircuitState.HALF_OPEN;
        logger.log(`🔄 CircuitBreaker: Moving to HALF_OPEN state for ${operationName}`);
      }
    }

    try {
      const result = await operation();
      
      if (this.state === CircuitState.HALF_OPEN) {
        logger.log(`✅ CircuitBreaker: Operation succeeded, closing circuit for ${operationName}`);
        this.reset();
      }
      
      return result;
    } catch (error) {
      this.recordFailure(operationName);
      throw error;
    }
  }

  private recordFailure(operationName: string) {
    // Reset failure count if last failure was outside the monitoring window
    if (this.lastFailureTime > 0 && this.options.monitoringPeriod > 0 &&
        Date.now() - this.lastFailureTime > this.options.monitoringPeriod) {
      this.failureCount = 0;
    }

    this.failureCount++;
    this.lastFailureTime = Date.now();

    logger.warn(`⚠️ CircuitBreaker: Failure #${this.failureCount} for ${operationName}`);

    if (this.failureCount >= this.options.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = Date.now() + this.options.resetTimeout;
      logger.error(`🚫 CircuitBreaker: Opening circuit for ${operationName}. Next attempt at ${new Date(this.nextAttemptTime).toISOString()}`);
    }
  }

  private reset() {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.nextAttemptTime = 0;
  }

  // Public method to force reset the circuit breaker
  forceReset() {
    this.reset();
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime
    };
  }
}

// Global circuit breakers for different operations
export const teamsFetchCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5, // Increased threshold
  resetTimeout: 10000, // Reduced to 10 seconds
  monitoringPeriod: 60000 // 1 minute
});

// Force reset the teams circuit breaker on initialization
teamsFetchCircuitBreaker.forceReset();

export const metricsFetchCircuitBreaker = new CircuitBreaker({
  failureThreshold: 3,
  resetTimeout: 30000,
  monitoringPeriod: 60000
});

export const tasksFetchCircuitBreaker = new CircuitBreaker({
  failureThreshold: 3,
  resetTimeout: 30000,
  monitoringPeriod: 60000
});

// New circuit breakers for RLS operations
export const rlsPoliciesFetchCircuitBreaker = new CircuitBreaker({
  failureThreshold: 2,
  resetTimeout: 15000, // 15 seconds
  monitoringPeriod: 30000 // 30 seconds
});

export const rlsTablesFetchCircuitBreaker = new CircuitBreaker({
  failureThreshold: 2,
  resetTimeout: 15000,
  monitoringPeriod: 30000
});

export const rlsStatsFetchCircuitBreaker = new CircuitBreaker({
  failureThreshold: 2,
  resetTimeout: 15000,
  monitoringPeriod: 30000
});
