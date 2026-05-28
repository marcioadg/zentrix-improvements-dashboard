
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Eye, EyeOff } from 'lucide-react';
import { logger } from '@/utils/logger';

interface Issue {
  id: string;
  title: string;
  description: string;
  owner: string;
  is_public?: boolean;
  issue_type?: 'short_term' | 'long_term';
}

interface IssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  issue: Issue | null;
  onSubmit: (data: { 
    title: string; 
    description: string; 
    owner?: string; 
    is_public?: boolean;
  }) => Promise<void>;
}

export const IssueModal: React.FC<IssueModalProps> = ({
  isOpen,
  onClose,
  issue,
  onSubmit,
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    owner: '',
    is_public: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (issue) {
        setFormData({
          title: issue.title,
          description: issue.description,
          owner: issue.owner || '',
          is_public: issue.is_public || false,
        });
      } else {
        // Reset form data when opening for a new issue
        setFormData({
          title: '',
          description: '',
          owner: '',
          is_public: false,
        });
      }
    }
  }, [issue, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        title: formData.title,
        description: formData.description,
        owner: formData.owner || undefined,
        is_public: formData.is_public,
      });
      onClose();
    } catch (error) {
      logger.error('Error submitting issue:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    // Reset form when closing
    setFormData({
      title: '',
      description: '',
      owner: '',
      is_public: false,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {issue ? 'Edit Issue' : 'Add Issue'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Issue title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the issue or opportunity"
              className="min-h-[80px] resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="owner">Owner</Label>
            <Input
              id="owner"
              value={formData.owner}
              onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
              placeholder="Who should handle this?"
              disabled={!!issue}
            />
          </div>

          {(!issue || issue.issue_type === 'long_term') && (
            <div className="flex items-center justify-between space-x-2">
              <div className="flex items-center gap-2">
                {formData.is_public ? (
                  <Eye className="h-4 w-4 text-primary" />
                ) : (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                )}
                <Label htmlFor="is_public" className="text-sm font-medium cursor-pointer">
                  Make public to company
                </Label>
              </div>
              <Switch
                id="is_public"
                checked={formData.is_public}
                onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
                className="data-[state=checked]:bg-primary"
              />
            </div>
          )}

          {formData.is_public && (
            <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-md">
              Public issues will be visible to all teams in your company
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={!formData.title.trim() || isSubmitting}>
              {isSubmitting ? 'Saving...' : (issue ? 'Update' : 'Add')} Issue
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
