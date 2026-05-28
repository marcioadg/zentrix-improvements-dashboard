
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Save, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SimpleSaveStatusIndicatorProps {
  status: 'saved' | 'saving' | 'error';
  onManualSave: () => void;
}

export const SimpleSaveStatusIndicator: React.FC<SimpleSaveStatusIndicatorProps> = ({
  status,
  onManualSave,
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'saving':
        return {
          icon: <Loader2 className="h-3 w-3 animate-spin" />,
          text: 'Saving...',
          variant: 'secondary' as const,
          description: 'Saving your changes',
        };
      case 'saved':
        return {
          icon: <Check className="h-3 w-3" />,
          text: 'Saved',
          variant: 'secondary' as const,
          description: 'All changes saved',
        };
      case 'error':
        return {
          icon: <AlertCircle className="h-3 w-3" />,
          text: 'Error',
          variant: 'destructive' as const,
          description: 'Failed to save changes',
        };
      default:
        return {
          icon: <Save className="h-3 w-3" />,
          text: 'Unknown',
          variant: 'outline' as const,
          description: 'Unknown save status',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        {config.icon}
        {config.text}
      </span>

      {status === 'error' && (
        <Button variant="ghost" size="sm" onClick={onManualSave} className="h-6 px-2 text-xs">
          Retry
        </Button>
      )}
    </div>
  );
};
