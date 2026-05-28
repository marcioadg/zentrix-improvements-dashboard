import { cn } from "@/lib/utils";

interface OptimizedSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

export function OptimizedSkeleton({
  className,
  variant = 'rectangular',
  width,
  height,
  animation = 'wave',
  ...props
}: OptimizedSkeletonProps) {
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-md',
  };

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'skeleton-shimmer',
    none: '',
  };

  return (
    <div
      className={cn(
        'bg-muted',
        variantClasses[variant],
        animationClasses[animation],
        className
      )}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
      }}
      {...props}
    />
  );
}

// Pre-built skeleton patterns for common use cases
export function CardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <OptimizedSkeleton variant="text" height={24} width="60%" />
      <OptimizedSkeleton variant="text" height={16} width="100%" />
      <OptimizedSkeleton variant="text" height={16} width="80%" />
      <div className="flex gap-2 mt-4">
        <OptimizedSkeleton variant="rectangular" height={32} width={80} />
        <OptimizedSkeleton variant="rectangular" height={32} width={80} />
      </div>
    </div>
  );
}

export function ListItemSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 border-b">
      <OptimizedSkeleton variant="circular" width={40} height={40} />
      <div className="flex-1 space-y-2">
        <OptimizedSkeleton variant="text" height={16} width="70%" />
        <OptimizedSkeleton variant="text" height={14} width="40%" />
      </div>
    </div>
  );
}

export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <div className="flex items-center gap-4 p-4 border-b">
      {Array.from({ length: columns }).map((_, i) => (
        <OptimizedSkeleton key={i} variant="text" height={16} width="100%" className="flex-1" />
      ))}
    </div>
  );
}
