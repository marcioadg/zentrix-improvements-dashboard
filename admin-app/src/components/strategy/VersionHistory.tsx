
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, RotateCcw, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { useProfiles } from '@/hooks/useProfiles';
import { StrategyVersionPreview } from './StrategyVersionPreview';

interface StrategicPlanVersion {
  id: string;
  strategic_plan_id: string;
  plan_data: any;
  version_number: number;
  change_summary?: string;
  created_by: string;
  created_at: string;
}

interface VersionHistoryProps {
  versions: StrategicPlanVersion[];
  onRestoreVersion: (versionId: string) => void;
  onViewInline?: (version: StrategicPlanVersion) => void;
  isLoading?: boolean;
}

export const VersionHistory: React.FC<VersionHistoryProps> = ({
  versions,
  onRestoreVersion,
  onViewInline,
  isLoading = false,
}) => {
  const { profiles } = useProfiles();
  const [previewVersion, setPreviewVersion] = useState<StrategicPlanVersion | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const getProfileName = (userId: string) => {
    const profile = profiles.find(p => p.id === userId);
    return profile?.full_name || 'Unknown User';
  };

  const handlePreviewClick = (version: StrategicPlanVersion) => {
    setPreviewVersion(version);
    setShowPreview(true);
  };

  const handleViewInlineClick = (version: StrategicPlanVersion) => {
    onViewInline?.(version);
    setDialogOpen(false);
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <History className="h-4 w-4 mr-2" />
          Version History
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Strategic Plan Versions</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="h-[400px] w-full">
          <div className="space-y-3">
            {versions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No version history available yet.</p>
                <p className="text-sm">Manual snapshots will appear here as you save them.</p>
              </div>
            ) : (
              versions.map((version, index) => (
                <div
                  key={version.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary">
                        Version {versions.length - index}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p>By {getProfileName(version.created_by)}</p>
                      <p>{format(new Date(version.created_at), 'MMM d, yyyy h:mm a')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {onViewInline ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewInlineClick(version)}
                        title="View on page"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePreviewClick(version)}
                        title="Preview this version"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRestoreVersion(version.id)}
                      disabled={isLoading}
                      title="Restore this version"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
      
      <StrategyVersionPreview
        version={previewVersion}
        open={showPreview}
        onOpenChange={setShowPreview}
      />
    </Dialog>
  );
};
