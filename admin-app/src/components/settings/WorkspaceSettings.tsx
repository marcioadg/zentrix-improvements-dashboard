import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

const WorkspaceSettings = () => {
  const { toast } = useToast();
  const { language, setLanguage } = useLanguage();
  const [workspaceName, setWorkspaceName] = useState('My Workspace');
  const [timezone, setTimezone] = useState('UTC');
  const [loading, setLoading] = useState(false);

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage as 'en' | 'pt' | 'es');
    toast({
      title: 'Language updated',
      description: 'Your workspace language has been changed.',
    });
  };

  const handleSave = async () => {
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    toast({ title: 'Saved', description: 'Workspace settings updated.' });
    setLoading(false);
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h2 className="text-[16px] font-semibold tracking-tight">Workspace</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage workspace-wide settings and preferences
        </p>
      </div>

      {/* General Settings */}
      <div>
        <h3 className="text-[13px] font-semibold mb-4">General Settings</h3>
        <div className="flex items-center justify-between py-3 border-b border-border/40">
          <Label htmlFor="workspace-name" className="shrink-0">Workspace Name</Label>
          <Input
            id="workspace-name"
            value={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
            placeholder="Enter workspace name"
            className="max-w-xs"
          />
        </div>
        <div className="flex items-center justify-between py-3 border-b border-border/40">
          <Label htmlFor="language">Language</Label>
          <Select value={language} onValueChange={handleLanguageChange}>
            <SelectTrigger id="language" className="max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="es">Español</SelectItem>
              <SelectItem value="pt">Português</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between py-3">
          <Label htmlFor="timezone">Timezone</Label>
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger id="timezone" className="max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="UTC">UTC (GMT +0:00)</SelectItem>
              <SelectItem value="America/New_York">Eastern Time (GMT -5:00)</SelectItem>
              <SelectItem value="America/Chicago">Central Time (GMT -6:00)</SelectItem>
              <SelectItem value="America/Los_Angeles">Pacific Time (GMT -8:00)</SelectItem>
              <SelectItem value="Europe/London">London (GMT +0:00)</SelectItem>
              <SelectItem value="Europe/Paris">Paris (GMT +1:00)</SelectItem>
              <SelectItem value="Asia/Tokyo">Tokyo (GMT +9:00)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </div>

      <Separator className="my-6" />

      {/* Data & Privacy */}
      <div>
        <h3 className="text-[13px] font-semibold mb-4">Data & Privacy</h3>
        <div className="flex items-center justify-between py-3">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">Data Export</p>
            <p className="text-sm text-muted-foreground">
              Download all your workspace data in a portable format
            </p>
          </div>
          <Button variant="outline" size="sm">
            Export Data
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WorkspaceSettings;
