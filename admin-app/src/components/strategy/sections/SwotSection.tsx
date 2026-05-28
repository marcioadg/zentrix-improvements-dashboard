import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSimpleStrategy, SwotData } from '@/contexts/SimpleStrategyContext';
import { Plus, X, GripVertical, Pencil } from 'lucide-react';
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
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SwotSectionProps {
  category: keyof SwotData;
  placeholder: string;
  color: 'neutral' | 'emerald' | 'red' | 'blue' | 'orange';
}

interface SortableItemProps {
  id: string;
  text: string;
  isEditing: boolean;
  editText: string;
  onEdit: (id: string, text: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onRemove: (id: string) => void;
  onEditTextChange: (value: string) => void;
}

const SortableItem: React.FC<SortableItemProps> = ({
  id,
  text,
  isEditing,
  editText,
  onEdit,
  onSave,
  onCancel,
  onRemove,
  onEditTextChange,
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
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group rounded-lg border border-border/50 bg-card/50 hover:bg-card/70 transition-all duration-200"
    >
      {isEditing ? (
        <div className="flex gap-2 p-3">
          <Input
            value={editText}
            onChange={(e) => onEditTextChange(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && onSave()}
            className="flex-1 border-0 bg-transparent focus-visible:ring-1"
            autoFocus
          />
          <Button size="sm" onClick={onSave} className="h-7 px-2 text-xs">
            Save
          </Button>
          <Button size="sm" variant="ghost" onClick={onCancel} className="h-7 px-2 text-xs">
            Cancel
          </Button>
        </div>
      ) : (
        <div className="flex items-start justify-between px-3 py-2.5 min-w-0">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <button
              className="cursor-grab opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground flex-shrink-0 mt-0.5"
              aria-label="Drag to reorder"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4" />
            </button>
            <span className="flex-1 text-sm text-foreground break-words overflow-hidden min-w-0">
              {text}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit(id, text)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
              title="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onRemove(id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
              title="Delete"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const SwotSection: React.FC<SwotSectionProps> = ({ 
  category, 
  placeholder, 
  color 
}) => {
  const { data, addSwotItem, updateSwotItem, removeSwotItem, reorderSwotItems } = useSimpleStrategy();
  const [newItemText, setNewItemText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const items = data.swotData[category]
    .map((item, index) => ({ ...item, order: item.order ?? index }))
    .sort((a, b) => a.order - b.order);
    
  const maxItems = 10;
  const canAddMore = items.length < maxItems;

  const handleAddItem = useCallback(() => {
    if (newItemText.trim() && canAddMore) {
      addSwotItem(category, newItemText.trim());
      setNewItemText('');
    }
  }, [newItemText, canAddMore, addSwotItem, category]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddItem();
    }
  }, [handleAddItem]);

  const startEditing = useCallback((id: string, currentText: string) => {
    setEditingId(id);
    setEditText(currentText);
  }, []);

  const saveEdit = useCallback(() => {
    if (editText.trim() && editingId) {
      updateSwotItem(category, editingId, editText.trim());
    }
    setEditingId(null);
    setEditText('');
  }, [editText, editingId, updateSwotItem, category]);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditText('');
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedItems = arrayMove(items, oldIndex, newIndex);
        const itemIds = reorderedItems.map(item => item.id);
        reorderSwotItems(category, itemIds);
      }
    }
  }, [items, reorderSwotItems, category]);

  return (
    <div className="space-y-3">
      {/* Existing items with drag and drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={items.map(item => item.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1.5">
            {items.map((item) => (
              <SortableItem
                key={item.id}
                id={item.id}
                text={item.text}
                isEditing={editingId === item.id}
                editText={editText}
                onEdit={startEditing}
                onSave={saveEdit}
                onCancel={cancelEdit}
                onRemove={() => removeSwotItem(category, item.id)}
                onEditTextChange={setEditText}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add new item */}
      {canAddMore && (
        <div className="flex items-center gap-2 mt-3">
          <Input
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            className="flex-1 border-0 border-b border-border/40 rounded-none bg-transparent px-0 py-2 focus-visible:ring-0 focus-visible:border-primary/60 placeholder:text-muted-foreground/40 text-sm"
          />
          <Button
            onClick={handleAddItem}
            disabled={!newItemText.trim()}
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-muted-foreground/60 hover:text-foreground hover:bg-muted/40"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Item count indicator */}
      <div className="text-xs text-muted-foreground/40 text-right mt-2">
        {items.length} / {maxItems}
      </div>
    </div>
  );
};
