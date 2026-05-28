
import React from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Settings, Lock, ArchiveRestore, Trash2 } from "lucide-react";

type Page = {
  id: string;
  title: string;
  archived?: boolean;
};

interface ProcessPageSettingsDropdownProps {
  page: Page;
  onSetVisibility: (p: Page) => void;
  onArchive: (args: { id: string }) => void;
  onRestore: (args: { id: string }) => void;
  onDelete: (args: { id: string }) => void;
  canDelete: boolean;
  setDeleteConfirmPage: (page: Page | null) => void;
}

export const ProcessPageSettingsDropdown: React.FC<ProcessPageSettingsDropdownProps> = ({
  page,
  onSetVisibility,
  onArchive,
  onRestore,
  onDelete,
  canDelete,
  setDeleteConfirmPage,
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          title="Settings"
          aria-label="Page settings"
          onClick={(e) => e.stopPropagation()}
        >
          <Settings className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="end">
        <DropdownMenuItem onClick={() => onSetVisibility(page)}>
          <Lock className="h-4 w-4 mr-2" />
          <span>Set Visibility</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {!page.archived ? (
          <DropdownMenuItem
            onClick={() => onArchive({ id: page.id })}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            <span>Archive</span>
          </DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuItem
              onClick={() => onRestore({ id: page.id })}
            >
              <ArchiveRestore className="h-4 w-4 mr-2" />
              <span>Restore</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                if (canDelete) {
                  setDeleteConfirmPage(page);
                }
              }}
              disabled={!canDelete}
            >
              <Trash2 className={`h-4 w-4 mr-2 ${canDelete ? "text-destructive" : "text-muted-foreground"}`} />
              <span className={canDelete ? "text-destructive" : "text-muted-foreground"}>Delete Permanently</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ProcessPageSettingsDropdown;
