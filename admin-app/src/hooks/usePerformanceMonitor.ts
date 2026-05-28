import { useEffect, useRef } from 'react';
import React from 'react';
import { logger } from '@/utils/logger';

interface PerformanceMetrics {
  componentName: string;
  renderTime: number;
  renderCount: number;
}

const performanceLog = new Map<string, PerformanceMetrics>();

/**
 * Hook to monitor component performance and identify render bottlenecks
 */
export const usePerformanceMonitor = (componentName: string, enabled: boolean = false) => {
  const renderCount = useRef(0);
  const startTime = useRef(performance.now());

  useEffect(() => {
    if (!enabled) return;

    renderCount.current += 1;
    const endTime = performance.now();
    const renderTime = endTime - startTime.current;

    const metrics: PerformanceMetrics = {
      componentName,
      renderTime,
      renderCount: renderCount.current
    };

    performanceLog.set(componentName, metrics);

    // Log slow renders (> 16ms for 60fps)
    if (renderTime > 16) {
      logger.warn(`🐌 Slow render detected: ${componentName} took ${renderTime.toFixed(2)}ms (render #${renderCount.current})`);
    }

    // Reset start time for next render
    startTime.current = performance.now();
  });

  return {
    renderCount: renderCount.current,
    getMetrics: () => performanceLog.get(componentName),
    getAllMetrics: () => Object.fromEntries(performanceLog)
  };
};

/**
 * Higher-order component to wrap components with performance monitoring
 */
export const withPerformanceMonitor = <T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  componentName: string,
  enabled: boolean = false
) => {
  const WrappedComponent = React.memo((props: T) => {
    usePerformanceMonitor(componentName, enabled);
    return React.createElement(Component, props);
  });

  WrappedComponent.displayName = `withPerformanceMonitor(${componentName})`;
  return WrappedComponent;
};