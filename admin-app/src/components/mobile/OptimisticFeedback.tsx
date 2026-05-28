import React from 'react';
import { cn } from '@/lib/utils';
import { Check, Loader2 } from 'lucide-react';

type OptimisticState = 'idle' | 'pending' | 'success' | 'error';

interface OptimisticFeedbackProps {
  state: OptimisticState;
  children: React.ReactNode;
  className?: string;
  successDuration?: number;
}

/**
 * OptimisticFeedback shows visual state for async operations
 * - Idle: normal display
 * - Pending: subtle pulse + spinner
 * - Success: brief green flash + checkmark
 * - Error: brief red flash
 */
export const OptimisticFeedback: React.FC<OptimisticFeedbackProps> = ({
  state,
  children,
  className,
}) => {
  const stateStyles = {
    idle: '',
    pending: 'opacity-70',
    success: 'animate-[pulse_0.3s_ease-out]',
    error: 'animate-[shake_0.3s_ease-out]',
  };

  const borderStyles = {
    idle: 'border-border/50',
    pending: 'border-primary/30',
    success: 'border-[var(--success)]/50',
    error: 'border-destructive/50',
  };

  return (
    <div
      className={cn(
        "relative transition-all duration-200",
        stateStyles[state],
        className
      )}
    >
      {/* Success/Error indicator overlay */}
      {state === 'success' && (
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-success rounded-full flex items-center justify-center animate-scale-in z-10">
          <Check className="h-3 w-3 text-white" />
        </div>
      )}
      
      {/* Loading spinner overlay */}
      {state === 'pending' && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-[6px] z-10">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      )}
      
      {children}
    </div>
  );
};

// Custom hook for managing optimistic state
export const useOptimisticState = (initialState: OptimisticState = 'idle') => {
  const [state, setState] = React.useState<OptimisticState>(initialState);
  const timeoutRef = React.useRef<NodeJS.Timeout>();

  const setSuccess = React.useCallback((duration = 1500) => {
    setState('success');
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setState('idle'), duration);
  }, []);

  const setError = React.useCallback((duration = 2000) => {
    setState('error');
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setState('idle'), duration);
  }, []);

  const setPending = React.useCallback(() => {
    setState('pending');
  }, []);

  const reset = React.useCallback(() => {
    setState('idle');
    clearTimeout(timeoutRef.current);
  }, []);

  React.useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  return { state, setSuccess, setError, setPending, reset };
};
