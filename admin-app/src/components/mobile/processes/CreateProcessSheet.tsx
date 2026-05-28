import React, { useState } from 'react';
import { BottomSheet } from '@/components/ui/mobile-bottom-sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useProcessMutations } from '@/hooks/mobile/processes/useProcessMutations';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface CreateProcessSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateProcessSheet: React.FC<CreateProcessSheetProps> = ({
  isOpen,
  onClose,
}) => {
  const { createProcess } = useProcessMutations();
  const [name, setName] = useState('');
  const [owner, setOwner] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Process name is required');
      return;
    }

    try {
      await createProcess.mutateAsync({
        name: name.trim(),
        owner: owner.trim() || undefined,
        description: description.trim() || undefined,
      });
      toast.success('Process created');
      handleClose();
    } catch (error) {
      toast.error('Failed to create process');
    }
  };

  const handleClose = () => {
    setName('');
    setOwner('');
    setDescription('');
    onClose();
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Process"
      snapPoints={[70]}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Process Name *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Customer Onboarding"
            className="h-12"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="owner">Owner (Role/Person)</Label>
          <Input
            id="owner"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            placeholder="e.g., Sales Manager"
            className="h-12"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief overview of this process..."
            rows={3}
          />
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            variant="outline"
            onClick={handleClose}
            className="flex-1 h-12"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || createProcess.isPending}
            className="flex-1 h-12"
          >
            {createProcess.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Process'
            )}
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
};
