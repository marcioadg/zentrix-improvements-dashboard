import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface MobileTooltipProps {
  children: React.ReactElement;
  content: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const MobileTooltip: React.FC<MobileTooltipProps> = ({
  children,
  content,
  position = 'top',
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-foreground',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-foreground',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-foreground',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-foreground',
  };

  return (
    <div className="relative inline-block">
      {React.cloneElement(children, {
        onClick: (e: React.MouseEvent) => {
          e.stopPropagation();
          setIsVisible(!isVisible);
          children.props.onClick?.(e);
        },
      })}

      {isVisible && (
        <>
          {/* Backdrop to close tooltip */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsVisible(false)}
          />

          {/* Tooltip content */}
          <div
            className={cn(
              'absolute z-50 min-w-[200px] max-w-[280px]',
              'px-3 py-2 rounded-lg',
              'bg-foreground text-background',
              'text-sm leading-relaxed',
              'shadow-lg',
              'animate-in fade-in-0 zoom-in-95',
              positionClasses[position]
            )}
          >
            {content}
            {/* Arrow */}
            <div
              className={cn(
                'absolute w-0 h-0',
                'border-4 border-transparent',
                arrowClasses[position]
              )}
            />
          </div>
        </>
      )}
    </div>
  );
};
