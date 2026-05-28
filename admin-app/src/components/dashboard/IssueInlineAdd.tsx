
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface IssueInlineAddProps {
  onAddIssue: (title: string, description?: string) => Promise<boolean>;
  onCancel: () => void;
  placeholder?: string;
}

export const IssueInlineAdd: React.FC<IssueInlineAddProps> = ({ 
  onAddIssue, 
  onCancel,
  placeholder = "Add an issue and press Enter..." 
}) => {
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const success = await onAddIssue(title.trim(), undefined);
      if (success) {
        setTitle('');
        onCancel();
        toast({
          title: "Issue added",
          description: "Team can now vote",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <Input
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      onKeyDown={handleKeyPress}
      placeholder="Add issue and press Enter"
      disabled={isSubmitting}
      className="mb-4"
      autoFocus
    />
  );
};
