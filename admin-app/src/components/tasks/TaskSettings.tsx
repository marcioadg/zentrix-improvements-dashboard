
import React from 'react';
import { Button } from '@/components/ui/button';
import { Settings, Archive, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { logger } from '@/utils/logger';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';

interface TaskSettingsProps {
  settings: {
    showArchived: boolean;
    showCompleted: boolean;
  };
  onUpdateSettings: (settings: any) => void;
}

export const TaskSettings: React.FC<TaskSettingsProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const handleShowArchivedChange = (checked: boolean) => {
    logger.log('🔄 Archive setting changed:', checked);
    onUpdateSettings({ showArchived: checked });
  };

  const handleShowCompletedChange = (checked: boolean) => {
    logger.log('🔄 Completed setting changed:', checked);
    onUpdateSettings({ showCompleted: checked });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={`gap-2 ${settings.showArchived ? 'bg-warning/5 border-yellow-200 text-yellow-800' : ''}`}
        >
          <Settings className="h-4 w-4" />
          View Settings
          {settings.showArchived && (
            <Eye className="h-3 w-3" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Display Options</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuCheckboxItem
          checked={settings.showArchived}
          onCheckedChange={handleShowArchivedChange}
        >
          <Archive className="mr-2 h-4 w-4" />
          Show Archived Tasks
          {settings.showArchived && (
            <Eye className="ml-auto h-3 w-3 text-warning" />
          )}
        </DropdownMenuCheckboxItem>
        
        <DropdownMenuCheckboxItem
          checked={settings.showCompleted}
          onCheckedChange={handleShowCompletedChange}
        >
          <CheckCircle className="mr-2 h-4 w-4" />
          Show Completed Tasks
          {settings.showCompleted && (
            <Eye className="ml-auto h-3 w-3 text-success" />
          )}
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
