
import React, { memo, forwardRef } from 'react';
import { useVirtualization } from '@/hooks/useVirtualization';

interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  height: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  overscan?: number;
}

const VirtualizedListComponent = memo(forwardRef<HTMLDivElement, VirtualizedListProps<any>>(
  ({ items, itemHeight, height, renderItem, className = '', overscan = 5 }, ref) => {
    const { virtualizedItems, totalHeight, handleScroll } = useVirtualization(items, {
      itemHeight,
      containerHeight: height,
      overscan
    });

    return (
      <div
        ref={ref}
        className={`relative overflow-auto ${className}`}
        style={{ height }}
        onScroll={handleScroll}
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          {virtualizedItems.map(({ index, item, style }) => (
            <div key={index} style={style}>
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>
    );
  }
));

VirtualizedListComponent.displayName = 'VirtualizedList';

// Export with proper generic typing
export const VirtualizedList = VirtualizedListComponent as <T>(
  props: VirtualizedListProps<T> & { ref?: React.Ref<HTMLDivElement> }
) => React.ReactElement;
