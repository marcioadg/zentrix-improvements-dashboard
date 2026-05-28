
import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface LeftColumnFieldsProps {
  title: string;
  setTitle: (title: string) => void;
  description: string;
  setDescription: (description: string) => void;
  showTitleError?: boolean;
  onInputFocus?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

export const LeftColumnFields: React.FC<LeftColumnFieldsProps> = ({
  title,
  setTitle,
  description,
  setDescription,
  showTitleError = false,
  onInputFocus,
}) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="task-title" className={showTitleError ? 'text-destructive' : ''}>
          Title *
        </Label>
        <Input
          id="task-title"
          placeholder="Enter task title"
          value={title || ''}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={onInputFocus}
          className={showTitleError ? 'border-destructive focus-visible:ring-destructive/30' : ''}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="task-description">Description</Label>
        <Textarea
          id="task-description"
          placeholder="Enter task description"
          value={description || ''}
          onChange={(e) => setDescription(e.target.value)}
          onFocus={onInputFocus}
          rows={5}
        />
      </div>
    </div>
  );
};
