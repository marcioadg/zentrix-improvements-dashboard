
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Save, Check, AlertCircle, Loader2, Edit, Keyboard } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SaveStatusIndicatorProps {
  status: 'saved' | 'draft' | 'saving' | 'error';
  onManualSave?: () => void;
  onRetry?: () => void;
}

export const SaveStatusIndicator: React.FC<SaveStatusIndicatorProps> = ({
  status,
  onManualSave,
  onRetry,
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'draft':
        return {
          icon: <Edit className="h-3 w-3" />,
          text: 'Auto-saving in 800ms',
          variant: 'outline' as const,
          description: 'Changes detected, will auto-save shortly',
        };
      case 'saving':
        return {
          icon: <Loader2 className="h-3 w-3 animate-spin" />,
          text: 'Saving...',
          variant: 'secondary' as const,
          description: 'Saving your changes to the server',
        };
      case 'saved':
        return {
          icon: <Check className="h-3 w-3" />,
          text: 'All changes saved',
          variant: 'secondary' as const,
          description: 'All changes have been saved successfully',
        };
      case 'error':
        return {
          icon: <AlertCircle className="h-3 w-3" />,
          text: 'Save Failed',
          variant: 'destructive' as const,
          description: 'Failed to save changes. Data is stored locally.',
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
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant={config.variant} className="text-xs cursor-help">
              {config.icon}
              <span className="ml-1">{config.text}</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{config.description}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Press Ctrl+S (Cmd+S) for manual save
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {status === 'error' && onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <AlertCircle className="h-4 w-4 mr-1" />
          Retry
        </Button>
      )}
      
      {(status === 'draft' || status === 'error') && onManualSave && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={onManualSave}>
                <Save className="h-4 w-4 mr-1" />
                Save Now
                <Keyboard className="h-3 w-3 ml-1 opacity-50" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Force save immediately (Ctrl+S)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
};
