import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface Segment {
  id: string;
  label: string;
  count?: number;
}

interface MobileSegmentedControlProps {
  segments: Segment[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

/**
 * Premium segmented control - Linear/Notion inspired
 * - Taller touch targets (py-3)
 * - Bold active state
 * - Elevated sliding indicator with shadow
 * - High-contrast count badges
 */
export const MobileSegmentedControl: React.FC<MobileSegmentedControlProps> = ({
  segments,
  value,
  onChange,
  className,
  disabled = false,
}) => {
  const [pressedId, setPressedId] = useState<string | null>(null);
  const activeIndex = segments.findIndex(s => s.id === value);

  return (
    <div
      className={cn(
        "relative flex p-1 bg-muted/60 rounded-xl gap-1",
        disabled && "opacity-50 pointer-events-none",
        className
      )}
    >
      {/* Elevated sliding indicator */}
      <div
        className="absolute top-1 bottom-1 bg-background rounded-lg shadow-md transition-all duration-200 ease-out"
        style={{
          left: `calc(${activeIndex * (100 / segments.length)}% + 4px)`,
          width: `calc(${100 / segments.length}% - 8px)`,
        }}
      />

      {segments.map((segment) => {
        const isActive = value === segment.id;
        const isPressed = pressedId === segment.id;
        const hasHighCount = segment.count !== undefined && segment.count > 5;
        
        return (
          <button
            key={segment.id}
            onClick={() => !disabled && onChange(segment.id)}
            onTouchStart={() => setPressedId(segment.id)}
            onTouchEnd={() => setPressedId(null)}
            onTouchCancel={() => setPressedId(null)}
            onMouseDown={() => setPressedId(segment.id)}
            onMouseUp={() => setPressedId(null)}
            onMouseLeave={() => setPressedId(null)}
            disabled={disabled}
            className={cn(
              "relative z-10 flex-1 py-2 px-3 rounded-lg text-sm",
              "transition-all duration-150 ease-out",
              "flex items-center justify-center gap-1.5",
              "touch-manipulation select-none",
              isActive
                ? "text-foreground font-bold"
                : "text-muted-foreground font-semibold hover:text-foreground/80",
              isPressed && "scale-[0.96] opacity-80"
            )}
          >
            <span>{segment.label}</span>
            {segment.count !== undefined && (
              <span
                className={cn(
                  "text-xs font-normal tabular-nums",
                  "transition-all duration-200",
                  isActive
                    ? "text-foreground/70"
                    : "text-muted-foreground/60"
                )}
              >
                ({segment.count})
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
