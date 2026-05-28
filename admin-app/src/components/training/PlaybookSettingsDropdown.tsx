
import React, { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Settings, Trash2, UserPlus, Copy } from "lucide-react";

interface PlaybookSettingsDropdownProps {
  onDelete: () => void;
  onCopy?: () => void;
  onSelfAssign?: () => void;
  disabled?: boolean;
}

export const PlaybookSettingsDropdown: React.FC<PlaybookSettingsDropdownProps> = ({
  onDelete,
  onCopy,
  onSelfAssign,
  disabled,
}) => {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Playbook settings" title="Settings" disabled={disabled}>
            <Settings className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="end">
          {onCopy && (
            <DropdownMenuItem onClick={() => onCopy()}>
              <Copy className="h-4 w-4 mr-2" />
              <span>Duplicate</span>
            </DropdownMenuItem>
          )}
          {onSelfAssign && (
            <DropdownMenuItem onClick={() => onSelfAssign()}>
              <UserPlus className="h-4 w-4 mr-2" />
              <span>Assign to myself</span>
            </DropdownMenuItem>
          )}
          {(onCopy || onSelfAssign) && <DropdownMenuSeparator />}
          <DropdownMenuItem onClick={() => setConfirmOpen(true)}>
            <Trash2 className="h-4 w-4 mr-2 text-destructive" />
            <span className="text-destructive">Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete playbook?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The playbook and all its content will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={onDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
