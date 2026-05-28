import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Archive } from 'lucide-react';

interface ArchiveToggleProps {
  showArchived: boolean;
  onToggle: (value: boolean) => void;
}

export const ArchiveToggle: React.FC<ArchiveToggleProps> = ({ showArchived, onToggle }) => {
  return (
    <div className="flex items-center gap-2">
      <Archive className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm text-foreground">Archived</span>
      <Switch
        checked={showArchived}
        onCheckedChange={onToggle}
        aria-label="Toggle archived goals"
      />
    </div>
  );
};
