
import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers';
import { TabsList } from '@/components/ui/tabs';
import { DraggableTab } from './DraggableTab';

export interface TabConfig {
  id: string;
  value: string;
  label: string;
}

interface DraggableTabsProps {
  tabs: TabConfig[];
  onTabsReorder: (newOrder: TabConfig[]) => void;
}

export const DraggableTabs: React.FC<DraggableTabsProps> = ({
  tabs,
  onTabsReorder,
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = tabs.findIndex((tab) => tab.id === active.id);
      const newIndex = tabs.findIndex((tab) => tab.id === over?.id);
      
      const newOrder = arrayMove(tabs, oldIndex, newIndex);
      onTabsReorder(newOrder);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToHorizontalAxis]}
    >
      <TabsList className="bg-muted p-1 rounded-lg">
        <SortableContext items={tabs.map(tab => tab.id)} strategy={horizontalListSortingStrategy}>
          {tabs.map((tab) => (
            <DraggableTab
              key={tab.id}
              id={tab.id}
              value={tab.value}
              className="px-3 sm:px-6 py-2 sm:py-3 font-medium text-sm sm:text-base data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all whitespace-nowrap"
            >
              {tab.label}
            </DraggableTab>
          ))}
        </SortableContext>
      </TabsList>
    </DndContext>
  );
};
