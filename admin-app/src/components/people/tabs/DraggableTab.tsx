
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TabsTrigger } from '@/components/ui/tabs';
import { GripVertical } from 'lucide-react';

interface DraggableTabProps {
  id: string;
  value: string;
  children: React.ReactNode;
  className?: string;
}

export const DraggableTab: React.FC<DraggableTabProps> = ({
  id,
  value,
  children,
  className = "",
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-1 ${isDragging ? 'z-50' : ''}`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted rounded transition-colors flex items-center justify-center"
        title="Drag to reorder tabs"
      >
        <GripVertical className="h-3 w-3" />
      </div>
      <TabsTrigger 
        value={value} 
        className={`${className} ${isDragging ? 'opacity-50' : ''}`}
      >
        {children}
      </TabsTrigger>
    </div>
  );
};
