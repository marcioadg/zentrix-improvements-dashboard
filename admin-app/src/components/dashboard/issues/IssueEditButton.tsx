
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { EditIssueModal } from '@/components/modals/EditIssueModal';
import { Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface IssueEditButtonProps {
  issue: any;
  onIssueUpdated: () => void;
  disabled?: boolean;
}

export const IssueEditButton: React.FC<IssueEditButtonProps> = ({
  issue,
  onIssueUpdated,
  disabled = false
}) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const { toast } = useToast();

  const handleSaveIssue = async (updates: any) => {
    try {
      const { error } = await supabase
        .from('issues')
        .update(updates)
        .eq('id', issue.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Issue updated successfully",
      });

      onIssueUpdated();
      return true;
    } catch (error) {
      logger.error('Error updating issue:', error);
      toast({
        title: "Error",
        description: "Failed to update issue",
        variant: "destructive",
      });
      return false;
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowEditModal(true)}
        disabled={disabled}
        className="h-8 w-8 p-0"
        aria-label="Edit issue"
      >
        <Pencil className="h-4 w-4" />
      </Button>

      <EditIssueModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        issue={issue}
        onSave={handleSaveIssue}
      />
    </>
  );
};
