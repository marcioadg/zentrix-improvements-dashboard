import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Save, X } from 'lucide-react';

interface SaveDraftPromptModalProps {
  isOpen: boolean;
  onSave: () => void;
  onContinue: () => void;
  onCancel: () => void;
}

export const SaveDraftPromptModal = ({ 
  isOpen, 
  onSave, 
  onContinue, 
  onCancel 
}: SaveDraftPromptModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save Draft?</DialogTitle>
          <DialogDescription>
            This draft hasn't been saved yet. Would you like to save it before starting the meeting?
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-3 mt-4">
          <Button onClick={onSave} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          <Button onClick={onContinue} variant="outline" className="w-full">
            Continue Without Saving
          </Button>
          <Button onClick={onCancel} variant="ghost" className="w-full">
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
