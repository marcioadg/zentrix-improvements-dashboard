
import React, { useState, useEffect } from 'react';
import { BaseModal } from './BaseModal';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface EditHeadlineModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (title: string, content: string) => void;
  headline: {
    id: string;
    title: string;
    content: string;
  } | null;
}

export const EditHeadlineModal: React.FC<EditHeadlineModalProps> = ({
  open,
  onOpenChange,
  onSave,
  headline,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  // Reset form when modal opens/closes or headline changes
  useEffect(() => {
    if (open && headline) {
      setTitle(headline.title);
      setContent(headline.content);
    } else {
      setTitle('');
      setContent('');
    }
  }, [open, headline]);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    
    setLoading(true);
    try {
      onSave(title.trim(), content.trim());
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setTitle('');
    setContent('');
    onOpenChange(false);
  };

  return (
    <BaseModal
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Headline"
      description="Update your headline title and content"
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      submitText="Save Changes"
      submitDisabled={!title.trim()}
      loading={loading}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="edit-headline-title">Title</Label>
          <Input
            id="edit-headline-title"
            placeholder="Enter headline title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-headline-content">Content</Label>
          <Textarea
            id="edit-headline-content"
            placeholder="Enter headline content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
          />
        </div>
      </div>
    </BaseModal>
  );
};
