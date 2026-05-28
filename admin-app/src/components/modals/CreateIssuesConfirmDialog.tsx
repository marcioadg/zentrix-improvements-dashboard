import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Loader2 } from "lucide-react";

interface CreateIssuesConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (archiveAfter: boolean) => void;
  offTrackGoalsCount: number;
  isProcessing?: boolean;
}

export const CreateIssuesConfirmDialog: React.FC<CreateIssuesConfirmDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  offTrackGoalsCount,
  isProcessing = false,
}) => {
  const [archiveAfterCreation, setArchiveAfterCreation] = React.useState(false);

  const handleConfirm = () => {
    if (isProcessing) return;
    onConfirm(archiveAfterCreation);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Create Issues for Off-Track Goals?
          </DialogTitle>
          <DialogDescription>
            You are about to create issues for <span className="font-semibold">{offTrackGoalsCount}</span> off-track goal{offTrackGoalsCount !== 1 ? 's' : ''}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-md">
            <AlertTriangle className="h-5 w-5 text-warning dark:text-orange-500 flex-shrink-0" />
            <div className="text-sm text-orange-800 dark:text-orange-200">
              Issues will be created to track these off-track goals.
            </div>
          </div>

          <div className="flex items-start space-x-3 p-4 bg-muted/50 rounded-lg">
            <Checkbox
              id="archive-after"
              checked={archiveAfterCreation}
              onCheckedChange={(checked) => setArchiveAfterCreation(checked === true)}
              disabled={isProcessing}
            />
            <div className="grid gap-1.5 leading-none">
              <Label
                htmlFor="archive-after"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Archive these goals after creating issues
              </Label>
              <p className="text-sm text-muted-foreground">
                Recommended: Clean up the goals list by archiving goals once issues are created to track them.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Processing...
              </>
            ) : (
              'Create Issues'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
