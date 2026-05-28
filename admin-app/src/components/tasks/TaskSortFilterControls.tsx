
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Settings, Calendar, Clock, User, Archive } from 'lucide-react';
import { TaskFilterPreferences } from '@/hooks/useTaskFilterPreferences';
import { logger } from '@/utils/logger';

interface TaskSortFilterControlsProps {
  preferences: TaskFilterPreferences;
  onUpdatePreferences: (prefs: Partial<TaskFilterPreferences>) => void;
}

export const TaskSortFilterControls: React.FC<TaskSortFilterControlsProps> = ({
  preferences,
  onUpdatePreferences,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleSortChange = (value: string) => {
    onUpdatePreferences({ sortBy: value as 'due_date' | 'created_at' });
  };

  const handleArchivedChange = (checked: boolean) => {
    logger.log('TaskSortFilterControls: Show archived changed to:', checked);
    onUpdatePreferences({ showArchived: checked });
  };

  const handleMyTasksOnlyChange = (checked: boolean) => {
    logger.log('TaskSortFilterControls: My tasks only changed to:', checked);
    onUpdatePreferences({ myTasksOnly: checked });
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="gap-2"
      >
        <Settings className="h-4 w-4" />
        Settings
      </Button>

      {isOpen && (
        <Card className="absolute top-10 right-0 z-50 w-64 shadow-lg bg-white border">
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Sort by</Label>
              <Select 
                value={preferences.sortBy} 
                onValueChange={handleSortChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border shadow-lg">
                  <SelectItem value="due_date">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      Due Date
                    </div>
                  </SelectItem>
                  <SelectItem value="created_at">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      Created Date
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between py-2">
              <Label htmlFor="my-tasks-only" className="text-sm flex items-center gap-2 cursor-pointer">
                <User className="h-4 w-4" />
                My tasks only
              </Label>
              <Switch
                id="my-tasks-only"
                checked={preferences.myTasksOnly}
                onCheckedChange={handleMyTasksOnlyChange}
                className="data-[state=checked]:bg-primary"
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <Label htmlFor="show-archived" className="text-sm flex items-center gap-2 cursor-pointer">
                <Archive className="h-4 w-4" />
                Show archived
              </Label>
              <Switch
                id="show-archived"
                checked={preferences.showArchived}
                onCheckedChange={handleArchivedChange}
                className="data-[state=checked]:bg-primary"
              />
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="w-full mt-4"
            >
              Close
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
