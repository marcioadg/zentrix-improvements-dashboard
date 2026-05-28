/**
 * 🎯 PHASE 3: Error boundary for strategic plan access
 * Prevents strategic plan access failures from cascading
 */

import React, { Component, ReactNode } from 'react';
import { logger } from '@/utils/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class StrategicPlanErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    logger.error('🚨 StrategicPlanErrorBoundary: Caught error:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('🚨 StrategicPlanErrorBoundary: Component stack:', errorInfo.componentStack);
    
    // In development, log additional details
    if (process.env.NODE_ENV === 'development') {
      logger.error('🚨 Strategic Plan Error Details');
      logger.error('Error:', error);
      logger.error('Error Info:', errorInfo);
      logger.error('Props:', this.props);
    }
  }

  render() {
    if (this.state.hasError) {
      // Return fallback UI or hide strategic plan access
      return this.props.fallback || (
        <div className="opacity-40 cursor-not-allowed pointer-events-none">
          {/* Strategic plan is hidden due to access error */}
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground">Strategy</span>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}