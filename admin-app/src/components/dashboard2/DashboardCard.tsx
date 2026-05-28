
import React, { useState, useMemo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GripVertical, MoreHorizontal } from 'lucide-react';
import { ResizeHandle } from './ResizeHandle';

interface CardLayout {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DashboardCardProps {
  id: string;
  title: string;
  layout: CardLayout;
  children: React.ReactNode;
  onResize: (cardId: string, newWidth: number, newHeight: number) => void;
}

export const DashboardCard: React.FC<DashboardCardProps> = ({
  id,
  title,
  layout,
  children,
  onResize,
}) => {
  const [isResizing, setIsResizing] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  // Memoize style to prevent unnecessary recalculations
  const style = useMemo(() => ({
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition,
    gridColumn: `span ${layout.width}`,
    gridRow: `span ${layout.height}`,
    minHeight: `${layout.height * 150}px`,
  }), [transform, transition, isDragging, layout.width, layout.height]);

  const handleResizeStart = () => {
    setIsResizing(true);
  };

  const handleResizeEnd = (newWidth: number, newHeight: number) => {
    setIsResizing(false);
    onResize(id, newWidth, newHeight);
  };

  // Memoize className to prevent unnecessary recalculations
  const cardClassName = useMemo(() => 
    `relative group ${isDragging ? 'z-50 opacity-75' : ''} ${isResizing ? 'z-40' : ''}`,
    [isDragging, isResizing]
  );

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={cardClassName}
    >
      <Card className="h-full border-2 hover:border-border transition-colors">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <div className="flex items-center gap-1">
            <button
              className="p-1 hover:bg-muted rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              aria-label="Drag to reorder"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </button>
            <button className="p-1 hover:bg-muted rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1" aria-label="More options">
              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 h-full overflow-hidden">
          {children}
        </CardContent>
        <ResizeHandle
          onResizeStart={handleResizeStart}
          onResizeEnd={handleResizeEnd}
          currentWidth={layout.width}
          currentHeight={layout.height}
          minWidth={1}
          minHeight={1}
          maxWidth={6}
          maxHeight={4}
        />
      </Card>
    </div>
  );
};
