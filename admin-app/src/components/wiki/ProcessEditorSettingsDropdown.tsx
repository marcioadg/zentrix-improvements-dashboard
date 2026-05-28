
import React from "react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Settings, Lock } from "lucide-react";

interface ProcessEditorSettingsDropdownProps {
  onSetVisibility: () => void;
}

export const ProcessEditorSettingsDropdown: React.FC<ProcessEditorSettingsDropdownProps> = ({
  onSetVisibility
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Settings">
          <Settings className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="end">
        <DropdownMenuItem onClick={onSetVisibility}>
          <Lock className="h-4 w-4 mr-2" />
          <span>Set Visibility</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ProcessEditorSettingsDropdown;
