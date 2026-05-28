import React, { useEffect, useRef } from 'react';
import { Archive, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSwipeGestures } from '@/hooks/useSwipeGestures';

interface SwipeAction {
  icon: React.ReactNode;
  label: string;
  color: string; // Tailwind bg class like 'bg-green-500'
  onAction: () => void;
}

interface SwipeableCardProps {
  children: React.ReactNode;
  leftAction?: SwipeAction;
  rightAction?: SwipeAction;
  className?: string;
  disabled?: boolean;
  onSwipeStart?: () => void;
}

const defaultLeftAction: SwipeAction = {
  icon: <Check className="h-5 w-5" />,
  label: 'Complete',
  color: 'bg-status-success',
  onAction: () => {},
};

const defaultRightAction: SwipeAction = {
  icon: <Archive className="h-5 w-5" />,
  label: 'Archive',
  color: 'bg-status-warning',
  onAction: () => {},
};

export const SwipeableCard: React.FC<SwipeableCardProps> = ({
  children,
  leftAction = defaultLeftAction,
  rightAction = defaultRightAction,
  className,
  disabled = false,
  onSwipeStart,
}) => {
  const SWIPE_THRESHOLD = 40; // Lowered for iOS
  const MAX_SWIPE = 120;

  // Prevent the synthetic click that happens after a touch-swipe from triggering child onClick (e.g. opening a modal)
  const suppressClickRef = useRef(false);
  const suppressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const suppressClickBriefly = () => {
    suppressClickRef.current = true;
    if (suppressTimerRef.current) clearTimeout(suppressTimerRef.current);
    suppressTimerRef.current = setTimeout(() => {
      suppressClickRef.current = false;
    }, 350);
  };

  useEffect(() => {
    return () => {
      if (suppressTimerRef.current) clearTimeout(suppressTimerRef.current);
    };
  }, []);

  const { ref, handlers, swipeDistance, isSwiping } = useSwipeGestures({
    threshold: SWIPE_THRESHOLD,
    velocityThreshold: 0, // Allow slow, deliberate swipes
    onSwipeRight: () => {
      if (disabled) return;
      suppressClickBriefly();
      leftAction?.onAction();
    },
    onSwipeLeft: () => {
      if (disabled) return;
      suppressClickBriefly();
      rightAction?.onAction();
    },
    onSwipeStart: () => {
      if (disabled) return;
      suppressClickBriefly();
      onSwipeStart?.();
    },
  });

  const translateX = disabled ? 0 : Math.max(-MAX_SWIPE, Math.min(MAX_SWIPE, swipeDistance.x));
  const absX = Math.abs(translateX);
  const swipeProgress = Math.min(absX / SWIPE_THRESHOLD, 1);
  const isSwipingLeft = translateX < 0;
  const isSwipingRight = translateX > 0;

  // Determine which action is being shown during swipe (visual hint only)
  const activeAction = isSwipingRight ? leftAction : isSwipingLeft ? rightAction : null;
  const activeColor = activeAction?.color || 'bg-muted';

  // Scale icon based on progress
  const iconScale = 0.6 + swipeProgress * 0.4;
  const iconOpacity = swipeProgress;

  return (
    <div className="relative overflow-hidden rounded-[6px]">
      {/* Dynamic colored background that reveals during swipe */}
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-100",
          isSwiping && absX > 10 ? 'opacity-100' : 'opacity-0',
          activeColor
        )}
      >
        {/* Left action indicator (swipe right) */}
        {isSwipingRight && leftAction && (
          <div
            className="absolute left-0 top-0 bottom-0 flex items-center gap-2 px-5 text-white"
            style={{ opacity: iconOpacity }}
          >
            <div className="transition-transform duration-100" style={{ transform: `scale(${iconScale})` }}>
              {leftAction.icon}
            </div>
            <span
              className={cn(
                "text-sm font-semibold whitespace-nowrap transition-all duration-100",
                swipeProgress > 0.5 ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2"
              )}
            >
              {leftAction.label}
            </span>
          </div>
        )}

        {/* Right action indicator (swipe left) */}
        {isSwipingLeft && rightAction && (
          <div
            className="absolute right-0 top-0 bottom-0 flex items-center gap-2 px-5 text-white"
            style={{ opacity: iconOpacity }}
          >
            <span
              className={cn(
                "text-sm font-semibold whitespace-nowrap transition-all duration-100",
                swipeProgress > 0.5 ? "opacity-100 translate-x-0" : "opacity-0 translate-x-2"
              )}
            >
              {rightAction.label}
            </span>
            <div className="transition-transform duration-100" style={{ transform: `scale(${iconScale})` }}>
              {rightAction.icon}
            </div>
          </div>
        )}
      </div>

      {/* Card content */}
      <div
        ref={!disabled ? ref : undefined}
        {...(!disabled && handlers)}
        className={cn(
          'relative z-10 bg-card transition-transform',
          isSwiping ? 'duration-0' : 'duration-200',
          className
        )}
        style={{
          transform: `translateX(${translateX}px)`,
          WebkitUserSelect: 'none',
          userSelect: 'none',
          touchAction: 'pan-y',
        }}
        onClickCapture={(e) => {
          if (suppressClickRef.current) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        {children}
      </div>
    </div>
  );
};
