import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { SopBlock } from '@/types/sops';
import { Info, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface CalloutBlockProps {
  block: SopBlock;
  onChange: (content: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onTypeChange: (type: 'info' | 'warning' | 'success' | 'error') => void;
  inputRef: React.RefObject<HTMLTextAreaElement>;
}

const calloutStyles = {
  info: {
    bg: 'bg-primary/5 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-800',
    icon: Info,
    iconColor: 'text-primary dark:text-blue-400',
  },
  warning: {
    bg: 'bg-warning/5 dark:bg-yellow-950/30',
    border: 'border-yellow-200 dark:border-yellow-800',
    icon: AlertTriangle,
    iconColor: 'text-warning dark:text-yellow-400',
  },
  success: {
    bg: 'bg-success/5 dark:bg-green-950/30',
    border: 'border-green-200 dark:border-green-800',
    icon: CheckCircle,
    iconColor: 'text-success dark:text-green-400',
  },
  error: {
    bg: 'bg-destructive/5 dark:bg-red-950/30',
    border: 'border-red-200 dark:border-red-800',
    icon: XCircle,
    iconColor: 'text-destructive dark:text-red-400',
  },
};

export const CalloutBlock: React.FC<CalloutBlockProps> = ({
  block,
  onChange,
  onKeyDown,
  onTypeChange,
  inputRef,
}) => {
  const calloutType = block.content.calloutType || 'info';
  const style = calloutStyles[calloutType];
  const IconComponent = style.icon;

  return (
    <div className={`${style.bg} ${style.border} border rounded-lg p-4`}>
      <div className="flex items-start gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={`mt-1 ${style.iconColor} hover:opacity-80 transition-opacity`}>
              <IconComponent className="h-5 w-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => onTypeChange('info')}>
              <Info className="h-4 w-4 mr-2 text-primary" />
              Info
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onTypeChange('warning')}>
              <AlertTriangle className="h-4 w-4 mr-2 text-warning" />
              Warning
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onTypeChange('success')}>
              <CheckCircle className="h-4 w-4 mr-2 text-success" />
              Success
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onTypeChange('error')}>
              <XCircle className="h-4 w-4 mr-2 text-destructive" />
              Error
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Textarea
          ref={inputRef}
          value={block.content.text || ''}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Callout"
          className="flex-1 min-h-[60px] border-none shadow-none px-0 bg-transparent focus-visible:ring-0 resize-none"
        />
      </div>
    </div>
  );
};
