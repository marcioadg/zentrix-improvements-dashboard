
import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, X, Send } from 'lucide-react';

interface InlineTaskCreatorProps {
  onSubmit: (
    title: string, 
    description: string,
    teamSelection: { type: 'personal' | 'team'; teamId?: string },
    status?: 'todo' | 'in-progress' | 'done'
  ) => void;
  loading?: boolean;
  defaultStatus?: 'todo' | 'in-progress' | 'done' | 'inprogress';
  forcePersonal?: boolean;
}

export const InlineTaskCreator: React.FC<InlineTaskCreatorProps> = ({ 
  onSubmit, 
  loading = false,
  defaultStatus = 'todo',
  forcePersonal = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus when opened
  useEffect(() => {
    if (isOpen && titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    // Always use personal when forcePersonal is true (for Kanban inline creation)
    const teamSelectionData = forcePersonal 
      ? { type: 'personal' as const }
      : { type: 'personal' as const }; // Default to personal for all inline creation
    const normalizedStatus: 'todo' | 'in-progress' | 'done' = defaultStatus === 'inprogress' ? 'in-progress' : defaultStatus;

    onSubmit(title.trim(), description.trim(), teamSelectionData, normalizedStatus);
    // Reset form
    setTitle('');
    setDescription('');
    setIsOpen(false);
  };

  const handleCancel = () => {
    setTitle('');
    setDescription('');
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
    }
    if (e.key === 'Enter' && e.metaKey) {
      handleSubmit(e as any);
    }
  };

  const getStatusIndicator = () => {
    const normalized = defaultStatus === 'inprogress' ? 'in-progress' : defaultStatus;
    switch (normalized) {
      case 'todo':
        return { label: 'Not Started', color: 'bg-muted border-border' };
      case 'in-progress':
        return { label: 'In Progress', color: 'bg-accent/20 border-accent/40' };
      case 'done':
        return { label: 'Completed', color: 'bg-primary/10 border-primary/20' };
      default:
        return { label: 'Not Started', color: 'bg-muted border-border' };
    }
  };

  if (!isOpen) {
    return (
      <Button
        variant="ghost"
        className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-background/50"
        onClick={() => setIsOpen(true)}
      >
        <Plus className="h-4 w-4 mr-2" />
        Add a task...
      </Button>
    );
  }

  const statusInfo = getStatusIndicator();

  return (
    <Card className={`border transition-all duration-200 ${statusInfo.color}`}>
      <CardContent className="p-3">
        <form onSubmit={handleSubmit} className="space-y-3" onKeyDown={handleKeyDown}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-muted-foreground">
              Creating personal task in: {statusInfo.label}
            </span>
          </div>
          
          <Input
            ref={titleInputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title..."
            className="text-sm"
          />
          
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)..."
            rows={2}
            className="text-sm resize-none"
          />
          
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              ⌘+Enter to submit, Esc to cancel
            </div>
            <div className="flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleCancel}
                title="Cancel"
              >
                <X className="h-4 w-4" />
              </Button>
              <Button
                type="submit"
                size="icon"
                disabled={loading || !title.trim()}
                title="Add task"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
