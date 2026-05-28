import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Settings2 } from 'lucide-react';

interface AnalyticsSettingsProps {
  hideShortMeetings: boolean;
  onHideShortMeetingsChange: (hide: boolean) => void;
  isSuperAdmin?: boolean;
  showAllCompanies?: boolean;
  onShowAllCompaniesChange?: (show: boolean) => void;
}

export const AnalyticsSettings: React.FC<AnalyticsSettingsProps> = ({
  hideShortMeetings,
  onHideShortMeetingsChange,
  isSuperAdmin = false,
  showAllCompanies = false,
  onShowAllCompaniesChange,
}) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Settings2 className="w-4 h-4" />
          Settings
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="end">
        <div className="space-y-4">
          <div className="font-medium text-sm mb-3">Display Options</div>
          
          {isSuperAdmin && onShowAllCompaniesChange && (
            <div className="flex items-center justify-between">
              <Label htmlFor="show-all-companies" className="text-sm">
                Show All Companies
              </Label>
              <Switch
                id="show-all-companies"
                checked={showAllCompanies}
                onCheckedChange={onShowAllCompaniesChange}
              />
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <Label htmlFor="hide-short-meetings" className="text-sm">
              Hide Short Meetings (&lt; 25 min)
            </Label>
            <Switch
              id="hide-short-meetings"
              checked={hideShortMeetings}
              onCheckedChange={onHideShortMeetingsChange}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
