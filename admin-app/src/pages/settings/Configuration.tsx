
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useToast } from '@/hooks/use-toast';
import { Vote, Settings as SettingsIcon, Palette } from 'lucide-react';
import { ColorThemeSettings } from '@/components/settings/ColorThemeSettings';

const Configuration = () => {
  const { settings, loading, updateVoteLimit, updateMetricsSettings } = useUserSettings();
  const { toast } = useToast();
  const [voteLimit, setVoteLimit] = useState(settings?.vote_limit || 3);

  const handleVoteLimitChange = async () => {
    const success = await updateVoteLimit(voteLimit);
    if (success) {
      toast({
        title: "Vote limit updated",
        description: `Your vote limit has been set to ${voteLimit} votes per meeting.`,
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to update vote limit. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleMetricsSettingsChange = async (updates: {
    highlight_current_week?: boolean;
    show_current_week?: boolean;
    week_start_day?: 'monday' | 'sunday';
  }) => {
    const success = await updateMetricsSettings(updates);
    if (success) {
      toast({
        title: "Settings updated",
        description: "Your metrics settings have been updated.",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-muted rounded w-1/4"></div>
          <div className="h-4 bg-muted rounded w-1/3"></div>
          <div className="h-4 bg-muted rounded w-1/5"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[20px] font-semibold text-foreground tracking-tight">Configuration</h1>
        <p className="text-muted-foreground mt-2">
          Customize your application settings and preferences
        </p>
      </div>

      {/* Theme Color Picker */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Palette className="h-6 w-6 text-primary" />
            <CardTitle>Theme</CardTitle>
          </div>
          <CardDescription>
            Personalize your app's look and feel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ColorThemeSettings />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Meeting Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Vote className="h-6 w-6 text-primary" />
              <CardTitle>Meeting Settings</CardTitle>
            </div>
            <CardDescription>
              Configure voting limits and meeting preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <Label htmlFor="vote-limit">
                Vote Limit per Meeting: {voteLimit} votes
              </Label>
              <Slider
                id="vote-limit"
                min={1}
                max={25}
                step={1}
                value={[voteLimit]}
                onValueChange={(value) => setVoteLimit(value[0])}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>1 vote</span>
                <span>25 votes</span>
              </div>
              <Button onClick={handleVoteLimitChange} className="w-full">
                Update Vote Limit
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Metrics Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <SettingsIcon className="h-6 w-6 text-primary" />
              <CardTitle>Metrics Settings</CardTitle>
            </div>
            <CardDescription>
              Configure how metrics are displayed and calculated
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="highlight-current">Highlight Current Week</Label>
              <input
                id="highlight-current"
                type="checkbox"
                checked={settings?.highlight_current_week || false}
                onChange={(e) => handleMetricsSettingsChange({ 
                  highlight_current_week: e.target.checked 
                })}
                className="rounded"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="show-current">Show Current Week Only</Label>
              <input
                id="show-current"
                type="checkbox"
                checked={settings?.show_current_week || false}
                onChange={(e) => handleMetricsSettingsChange({ 
                  show_current_week: e.target.checked 
                })}
                className="rounded"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="week-start">Week Start Day</Label>
              <select
                id="week-start"
                value={settings?.week_start_day || 'monday'}
                onChange={(e) => handleMetricsSettingsChange({ 
                  week_start_day: e.target.value as 'monday' | 'sunday' 
                })}
                className="w-full p-2 border rounded-md"
              >
                <option value="monday">Monday</option>
                <option value="sunday">Sunday</option>
              </select>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Configuration;
