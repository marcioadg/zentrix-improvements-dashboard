import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Settings2, Archive, EyeOff } from 'lucide-react';

interface GoalsViewSettingsProps {
  showArchived: boolean;
  onArchivedToggle: (value: boolean) => void;
  hideEmptyUsers: boolean;
  onHideEmptyUsersToggle: (value: boolean) => void;
}

export const GoalsViewSettings: React.FC<GoalsViewSettingsProps> = ({ 
  showArchived, 
  onArchivedToggle,
  hideEmptyUsers,
  onHideEmptyUsersToggle
}) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="h-9 gap-2"
        >
          <Settings2 className="h-4 w-4" />
          View
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="space-y-4">
          <div className="space-y-1">
            <h4 className="font-medium text-sm">View Settings</h4>
            <p className="text-xs text-muted-foreground">Customize how goals are displayed</p>
          </div>
          
          <div className="space-y-3 pt-2">
            {/* Hide Empty Users Toggle */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <EyeOff className="h-3.5 w-3.5" />
                  Hide team members with no goals
                </label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Only show members who have active goals
                </p>
              </div>
              <Switch
                checked={hideEmptyUsers}
                onCheckedChange={onHideEmptyUsersToggle}
                aria-label="Toggle hide empty users"
              />
            </div>

            {/* Archived Toggle */}
            <div className="flex items-start justify-between gap-3 pt-2 border-t">
              <div className="flex-1">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <Archive className="h-3.5 w-3.5" />
                  Show Archived Goals
                </label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Include archived goals in the view
                </p>
              </div>
              <Switch
                checked={showArchived}
                onCheckedChange={onArchivedToggle}
                aria-label="Toggle archived goals"
              />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
