import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useSettings } from '@/contexts/SettingsContext';

export const OrgChartColorSettings: React.FC = () => {
  const { settings, updateSettings, loading } = useSettings();

  const handleInvertColorsChange = async (checked: boolean) => {
    await updateSettings({ invert_org_chart_colors: checked });
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div>
        <h2 className="text-[16px] font-semibold">Org Chart Display</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Customize how colors are displayed in the organization chart.
        </p>
      </div>

      <Separator />

      <div className="space-y-4">
        <div className="flex items-center justify-between max-w-md">
          <div className="space-y-1">
            <Label htmlFor="invert-colors" className="text-sm font-medium">
              {settings?.invert_org_chart_colors 
                ? 'Green for Steady (DISC)'
                : 'Green for Detail Oriented (Culture Index)'
              }
            </Label>
            <p className="text-xs text-muted-foreground">
              {settings?.invert_org_chart_colors
                ? 'Currently using DISC color scheme'
                : 'Currently using Culture Index color scheme'
              }
            </p>
          </div>
          <Switch
            id="invert-colors"
            checked={settings?.invert_org_chart_colors ?? true}
            onCheckedChange={handleInvertColorsChange}
            disabled={loading}
          />
        </div>
      </div>
    </div>
  );
};