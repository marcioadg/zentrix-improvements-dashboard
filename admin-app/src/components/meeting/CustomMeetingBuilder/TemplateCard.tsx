import { useState, useRef, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Pencil, Check, X, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { CustomMeetingTemplate } from '@/types/meeting';
import { useTemplateRename } from '@/hooks/meeting/useTemplateRename';
import { useTemplateShare } from '@/hooks/meeting/useTemplateShare';

interface TemplateCardProps {
  template: CustomMeetingTemplate;
  isSelected: boolean;
  onSelect: () => void;
  currentUserId: string | null;
  onDelete: (templateId: string) => void;
}

export function TemplateCard({ template, isSelected, onSelect, currentUserId, onDelete }: TemplateCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(template.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const { renameTemplate, isRenaming } = useTemplateRename();
  const { updateSharedStatus, isUpdating } = useTemplateShare();

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    if (editedName.trim() && editedName !== template.name) {
      renameTemplate({ templateId: template.id, newName: editedName.trim() });
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedName(template.name);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const sectionCount = template.sections?.length || 0;
  const lastEdited = formatDistanceToNow(new Date(template.updated_at), { addSuffix: true });
  const isOwner = currentUserId && template.owner_id === currentUserId;

  const handleSharedToggle = (checked: boolean) => {
    updateSharedStatus({ templateId: template.id, shared: checked });
  };

  return (
    <div
      className={`
        group relative rounded-lg border p-4 transition-all cursor-pointer
        ${isSelected 
          ? 'border-primary bg-primary/5 shadow-sm' 
          : 'border-border bg-card hover:border-primary/50 hover:shadow-sm'
        }
      `}
      onClick={!isEditing ? onSelect : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="flex items-center gap-2 mb-2">
              <Input
                ref={inputRef}
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleSave}
                disabled={isRenaming}
                className="h-8 text-sm"
              />
              <Button
                size="icon"
                variant="ghost"
                aria-label="Save name"
                className="h-8 w-8 shrink-0"
                onClick={handleSave}
                disabled={isRenaming}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Cancel rename"
                className="h-8 w-8 shrink-0"
                onClick={handleCancel}
                disabled={isRenaming}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <h3 className="font-medium text-sm truncate mb-2">{template.name}</h3>
          )}
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{sectionCount} section{sectionCount !== 1 ? 's' : ''}</span>
            <span>•</span>
            <span>Edited {lastEdited}</span>
            {template.shared && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1 text-primary">
                  <Users className="h-3 w-3" />
                  Shared
                </span>
              </>
            )}
          </div>
          
          {isOwner && !isEditing && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                }}
              >
                <Pencil className="h-3 w-3 mr-1" />
                Rename
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(template.id);
                }}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Delete
              </Button>
              <div 
                className="flex items-center gap-1.5 ml-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <Checkbox
                  id={`share-${template.id}`}
                  checked={template.shared}
                  onCheckedChange={handleSharedToggle}
                  disabled={isUpdating}
                  className="h-4 w-4"
                />
                <Label 
                  htmlFor={`share-${template.id}`} 
                  className="text-xs font-normal cursor-pointer text-muted-foreground"
                >
                  Share with team
                </Label>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
