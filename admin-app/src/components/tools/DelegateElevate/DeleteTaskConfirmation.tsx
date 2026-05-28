
import { AccessibleDialog } from '@/components/ui/AccessibleDialog';
import { Button } from '@/components/ui/button';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  taskTitle: string;
}

export default function DeleteTaskConfirmation({ open, onOpenChange, onConfirm, taskTitle }: Props) {
  return (
    <AccessibleDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete this task?"
      description={`"${taskTitle}" will be permanently removed. Can't be undone.`}
    >
      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button 
          onClick={onConfirm} 
          variant="destructive"
        >
          Delete Task
        </Button>
      </div>
    </AccessibleDialog>
  );
}
