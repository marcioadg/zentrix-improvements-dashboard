
import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InlineEditableItemProps {
  id: string;
  text: string;
  isEditing: boolean;
  editValue: string;
  onEditValueChange: (value: string) => void;
  onStartEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  className?: string;
  rightIcon?: React.ReactNode;
}

export const InlineEditableItem: React.FC<InlineEditableItemProps> = ({
  id,
  text,
  isEditing,
  editValue,
  onEditValueChange,
  onStartEdit,
  onSave,
  onCancel,
  onDelete,
  onKeyDown,
  className,
  rightIcon,
}) => {
  if (isEditing) {
    return (
      <div className={cn("flex gap-2 p-3 rounded-lg border border-border/50 bg-card/50", className)}>
        <Input
          value={editValue}
          onChange={(e) => onEditValueChange(e.target.value)}
          onKeyDown={onKeyDown}
          className="flex-1 border-0 bg-transparent focus-visible:ring-1"
          autoFocus
        />
        <Button onClick={onSave} size="sm" variant="ghost" className="h-8 w-8 p-0 text-success hover:text-success/80">
          <Check className="h-4 w-4" />
        </Button>
        <Button onClick={onCancel} size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("group flex items-center gap-2 p-3 rounded-lg border border-border/50 bg-card/50 hover:bg-card/70 transition-all duration-200", className)}>
      <div 
        className="flex-1 text-sm leading-relaxed whitespace-pre-wrap break-words cursor-pointer text-foreground hover:text-foreground/80 transition-colors"
        onClick={onStartEdit}
      >
        {text}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {rightIcon}
        <Button 
          onClick={onDelete} 
          size="sm" 
          variant="ghost" 
          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive transition-colors"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
