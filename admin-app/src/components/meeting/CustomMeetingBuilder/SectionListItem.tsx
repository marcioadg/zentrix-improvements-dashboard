import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Edit2, Lock, Sparkles } from 'lucide-react';
import { AgendaItem } from '@/types/meeting';
import { Input } from '@/components/ui/input';

interface SectionListItemProps {
  section: AgendaItem;
  index: number;
  isSelected: boolean;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
  onUpdate: (index: number, updates: Partial<AgendaItem>) => void;
}

export const SectionListItem = ({ 
  section, 
  index, 
  isSelected, 
  onEdit, 
  onDelete,
  onUpdate
}: SectionListItemProps) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDuration, setIsEditingDuration] = useState(false);
  const [title, setTitle] = useState(section.title);
  const [duration, setDuration] = useState(section.duration);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: section.id,
    disabled: section.required // Disable dragging for required sections
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleTitleSave = () => {
    if (title.trim() && title !== section.title) {
      onUpdate(index, { title: title.trim() });
    } else {
      setTitle(section.title);
    }
    setIsEditingTitle(false);
  };

  const handleDurationSave = () => {
    if (duration > 0 && duration !== section.duration) {
      onUpdate(index, { duration });
    } else {
      setDuration(section.duration);
    }
    setIsEditingDuration(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onEdit(index)}
      className={`
        flex items-center gap-2 p-3 rounded-lg border border-border bg-card cursor-pointer hover:bg-accent/50 transition-colors
        ${isSelected ? 'ring-2 ring-primary' : ''}
        ${isDragging ? 'shadow-lg' : ''}
      `}
    >
      {/* Drag Handle or Lock Icon */}
      {!section.required ? (
        <button
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      ) : (
        <div className="p-1" title="Required section">
          <Lock className="h-4 w-4 text-muted-foreground" />
        </div>
      )}

      {/* Section Info */}
      <div className="flex-1 min-w-0 space-y-1">
        {/* Title - Editable */}
        <div className="flex items-center gap-1">
          {isEditingTitle ? (
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleSave();
                if (e.key === 'Escape') {
                  setTitle(section.title);
                  setIsEditingTitle(false);
                }
              }}
              autoFocus
              className="h-6 text-sm font-medium"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <>
              <span className="font-medium text-sm text-foreground truncate flex items-center gap-1">
                {section.title}
                {section.type === 'custom_section' && (
                  <span title="Custom Section">
                    <Sparkles className="h-3 w-3 text-primary" />
                  </span>
                )}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditingTitle(true);
                }}
                className="p-0.5 hover:bg-muted rounded transition-colors flex-shrink-0"
                title="Edit title"
              >
                <Edit2 className="h-3 w-3 text-muted-foreground" />
              </button>
            </>
          )}
        </div>

        {/* Duration - Editable */}
        <div className="flex items-center gap-1">
          {isEditingDuration ? (
            <div className="flex items-center gap-1">
              <Input
                type="number"
                min="1"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 1)}
                onBlur={handleDurationSave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleDurationSave();
                  if (e.key === 'Escape') {
                    setDuration(section.duration);
                    setIsEditingDuration(false);
                  }
                }}
                autoFocus
                className="h-5 w-14 text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                onClick={(e) => e.stopPropagation()}
              />
              <span className="text-xs text-muted-foreground">min</span>
            </div>
          ) : (
            <>
              <span className="text-xs text-muted-foreground">
                {section.duration} min
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditingDuration(true);
                }}
                className="p-0.5 hover:bg-muted rounded transition-colors flex-shrink-0"
                title="Edit duration"
              >
                <Edit2 className="h-3 w-3 text-muted-foreground" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Delete Button or Lock Icon */}
      {!section.required ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(index);
          }}
          className="p-1.5 hover:bg-destructive/10 rounded transition-colors"
          title="Delete section"
        >
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </button>
      ) : (
        <div className="p-1.5" title="Required section - cannot be deleted">
          <Lock className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      )}
    </div>
  );
};
