
import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface InlineAddIssueProps {
  onAdd: (title: string, description?: string, ownerId?: string) => Promise<boolean>;
  onCancel: () => void;
  issueType: 'short_term' | 'long_term';
  teamId: string;
  members: Array<{
    user_id: string;
    profiles?: {
      full_name: string;
      email: string;
    };
  }>;
}

export const InlineAddIssue: React.FC<InlineAddIssueProps> = ({
  onAdd,
  onCancel,
  issueType,
  teamId,
  members,
}) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Pre-select current user when user data becomes available
  useEffect(() => {
    if (user?.id && !ownerId) {
      setOwnerId(user.id);
    }
  }, [user?.id, ownerId]);

  const handleSubmit = async () => {
    if (!title.trim() || loading) return;

    setLoading(true);
    try {
      const success = await onAdd(title.trim(), description.trim() || undefined, ownerId || undefined);
      if (success) {
        setTitle('');
        setDescription('');
        setOwnerId('');
        setIsExpanded(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      setIsExpanded(false);
      setTitle('');
      setDescription('');
      setOwnerId('');
    }
  };

  const handleFocus = () => {
    setIsExpanded(true);
  };

  const handleCancel = () => {
    setIsExpanded(false);
    setTitle('');
    setDescription('');
    setOwnerId('');
  };

  // Collapsed state - just a simple input line
  if (!isExpanded) {
    return (
      <div 
        className="border border-dashed border-border rounded-[6px] p-2 bg-background hover:border-muted-foreground/50 transition-colors duration-150 cursor-text"
        onClick={handleFocus}
      >
        <div className="flex items-center text-muted-foreground">
          <Plus className="h-4 w-4 mr-3" />
          <span className="text-[13px]">Add {issueType === 'short_term' ? 'short-term' : 'long-term'} issue...</span>
        </div>
      </div>
    );
  }

  // Expanded state - full form
  return (
    <div className="border border-border rounded-[6px] p-3 bg-background space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-[13px] text-foreground">
          Add {issueType === 'short_term' ? 'Short-term' : 'Long-term'} Issue
        </h3>
        <Button variant="ghost" size="sm" onClick={handleCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-3">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Issue title..."
          autoFocus
          className="h-8 text-[13px] border-border"
        />

        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Optional description..."
          rows={3}
          className="text-[13px] border-border resize-none"
        />

        {members.length > 0 && (
          <Select value={ownerId} onValueChange={setOwnerId}>
            <SelectTrigger className="border-border">
              <SelectValue placeholder="Assign to" />
            </SelectTrigger>
            <SelectContent>
              {members.map((member) => (
                <SelectItem key={member.user_id} value={member.user_id}>
                  {member.profiles?.full_name || member.profiles?.email || 'Unknown User'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="flex items-center gap-2 pt-2">
          <Button onClick={handleSubmit} disabled={!title.trim() || loading} size="sm">
            {loading ? 'Adding...' : 'Add Issue'}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};
