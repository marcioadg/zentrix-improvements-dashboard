import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Save, X } from 'lucide-react';

interface SaveChangesPromptModalProps {
  isOpen: boolean;
  onSave: () => void;
  onContinue: () => void;
  onCancel: () => void;
}

export const SaveChangesPromptModal = ({ 
  isOpen, 
  onSave, 
  onContinue, 
  onCancel 
}: SaveChangesPromptModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save Changes?</DialogTitle>
          <DialogDescription>
            You have unsaved changes to this template. Would you like to save them before starting the meeting?
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-3 mt-4">
          <Button onClick={onSave} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            Save Changes
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
