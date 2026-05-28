import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ConfirmDeleteModal } from '@/components/modals/ConfirmDeleteModal';
import { SaveChangesPromptModal } from './SaveChangesPromptModal';
import { useCustomMeetingTemplates } from '@/hooks/meeting/useCustomMeetingTemplates';
import { useTemplateDelete } from '@/hooks/meeting/useTemplateDelete';
import { TemplateCard } from './TemplateCard';
import { toast } from 'sonner';
interface TemplateManagerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTemplateId: string | null;
  onTemplateSelect: (templateId: string) => void;
  onStartNewDraft: () => void;
  hasUnsavedChanges: boolean;
  currentUserId: string | null;
  onSaveChanges: () => Promise<void>;
  isNewDraft: boolean;
  onOpenSaveTemplateModal: () => void;
  onSetPendingAction: (action: 'new-draft' | string | null) => void;
}
export function TemplateManagerModal({
  open,
  onOpenChange,
  currentTemplateId,
  onTemplateSelect,
  onStartNewDraft,
  hasUnsavedChanges,
  currentUserId,
  onSaveChanges,
  isNewDraft,
  onOpenSaveTemplateModal,
  onSetPendingAction
}: TemplateManagerModalProps) {
  const {
    templates,
    isLoading
  } = useCustomMeetingTemplates();
  const {
    deleteTemplate,
    isDeletingTemplate
  } = useTemplateDelete();
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null);
  const [isSaveChangesPromptOpen, setIsSaveChangesPromptOpen] = useState(false);
  const [showOnlyMyTemplates, setShowOnlyMyTemplates] = useState(true);

  // Filter templates: always show only owned OR shared templates
  // The checkbox further filters to just owned templates
  const visibleTemplates = templates.filter(
    template => template.created_by === currentUserId || template.shared === true
  );
  const filteredTemplates = showOnlyMyTemplates && currentUserId
    ? visibleTemplates.filter(template => template.created_by === currentUserId)
    : visibleTemplates;
  const handleTemplateSelect = (templateId: string) => {
    // If selecting a different template and there are unsaved changes, show prompt
    if (hasUnsavedChanges && templateId !== currentTemplateId) {
      setPendingTemplateId(templateId);
      setIsSaveChangesPromptOpen(true);
      return;
    }

    // Otherwise proceed with selection
    onTemplateSelect(templateId);
    onOpenChange(false);
  };
  const handleStartNewDraft = () => {
    // If there are unsaved changes, show prompt
    if (hasUnsavedChanges) {
      setPendingTemplateId('new-draft');
      setIsSaveChangesPromptOpen(true);
      return;
    }

    // Otherwise proceed with new draft
    onStartNewDraft();
    onOpenChange(false);
  };
  const handleSaveChangesAndSwitch = async () => {
    setIsSaveChangesPromptOpen(false);

    // If this is a new draft, open the "Save as New Template" modal
    if (isNewDraft) {
      // Store the pending action so parent can execute it after save
      onSetPendingAction(pendingTemplateId);
      onOpenSaveTemplateModal();
      // Don't proceed with switch yet - the template needs to be saved first
      // The switch will happen after template is saved (handled by parent)
      return;
    }

    // For existing templates, save the changes directly
    await onSaveChanges();

    // After saving, proceed with the pending action
    if (pendingTemplateId === 'new-draft') {
      onStartNewDraft();
    } else if (pendingTemplateId) {
      onTemplateSelect(pendingTemplateId);
    }
    setPendingTemplateId(null);
    onOpenChange(false);
  };
  const handleContinueWithoutSavingSwitch = () => {
    setIsSaveChangesPromptOpen(false);

    // Proceed with the pending action without saving
    if (pendingTemplateId === 'new-draft') {
      onStartNewDraft();
    } else if (pendingTemplateId) {
      onTemplateSelect(pendingTemplateId);
    }
    setPendingTemplateId(null);
    onOpenChange(false);
  };
  const handleCancelSwitch = () => {
    setIsSaveChangesPromptOpen(false);
    setPendingTemplateId(null);
  };
  const handleDeleteClick = (templateId: string) => {
    // Prevent deleting currently loaded template
    if (templateId === currentTemplateId) {
      toast.error("Cannot delete the template you're currently editing");
      return;
    }
    setDeleteTemplateId(templateId);
    setIsDeleteModalOpen(true);
  };
  const handleConfirmDelete = () => {
    if (deleteTemplateId) {
      deleteTemplate(deleteTemplateId);
      setIsDeleteModalOpen(false);
      setDeleteTemplateId(null);
    }
  };
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Meeting Templates</DialogTitle>
          <DialogDescription>
            Select a template to edit, rename existing templates, or start a new draft
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-y-auto">
          <Button onClick={handleStartNewDraft} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Start New Draft
          </Button>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium">Templates</h4>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="show-only-my-templates"
                  checked={showOnlyMyTemplates}
                  onCheckedChange={(checked) => setShowOnlyMyTemplates(checked === true)}
                  disabled={!currentUserId}
                />
                <Label 
                  htmlFor="show-only-my-templates" 
                  className={`text-sm font-normal ${currentUserId ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                >
                  Only my templates
                </Label>
              </div>
            </div>
            
            {isLoading ? <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div> : filteredTemplates.length === 0 ? <div className="text-center py-8 px-4 border border-dashed rounded-lg">
                <p className="text-sm text-muted-foreground">
                  {showOnlyMyTemplates ? "You haven't created any templates yet" : "No templates yet"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Create your first template by building a meeting and saving it
                </p>
              </div> : <div className="space-y-3">
                {filteredTemplates.map(template => <TemplateCard key={template.id} template={template} isSelected={template.id === currentTemplateId} onSelect={() => handleTemplateSelect(template.id)} currentUserId={currentUserId} onDelete={handleDeleteClick} />)}
              </div>}
          </div>
        </div>
      </DialogContent>

      <ConfirmDeleteModal open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen} onConfirm={handleConfirmDelete} title="Delete Template?" description="This action cannot be undone." warningText="This template and all its sections will be permanently deleted." isLoading={isDeletingTemplate} actionText="Delete Template" />

      <SaveChangesPromptModal isOpen={isSaveChangesPromptOpen} onSave={handleSaveChangesAndSwitch} onContinue={handleContinueWithoutSavingSwitch} onCancel={handleCancelSwitch} />
    </Dialog>;
}