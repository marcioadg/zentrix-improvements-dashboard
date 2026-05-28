import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface ProgressiveSkeletonProps {
  count: number;
  itemComponent: React.ComponentType<{ index: number }>;
  delay?: number; // Delay between items (ms)
  className?: string;
}

/**
 * Progressive skeleton reveal - shows skeleton items one by one
 * Creates perception of faster loading by revealing content progressively
 */
export const ProgressiveSkeleton: React.FC<ProgressiveSkeletonProps> = ({
  count,
  itemComponent: ItemComponent,
  delay = 50,
  className,
}) => {
  const [visibleCount, setVisibleCount] = useState(1);

  useEffect(() => {
    if (visibleCount >= count) return;

    const timer = setTimeout(() => {
      setVisibleCount((prev) => Math.min(prev + 1, count));
    }, delay);

    return () => clearTimeout(timer);
  }, [visibleCount, count, delay]);

  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: visibleCount }).map((_, index) => (
        <div
          key={index}
          className="animate-fade-in"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <ItemComponent index={index} />
        </div>
      ))}
    </div>
  );
};
