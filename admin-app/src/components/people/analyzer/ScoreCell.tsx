
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScoreValue } from '@/types/analyzer';

interface ScoreCellProps {
  value?: ScoreValue;
  onChange?: (value: ScoreValue) => void;
  disabled?: boolean;
  isBarRow?: boolean;
  scoreType?: 'core_value' | 'gets_it' | 'wants_it' | 'capacity';
}

const coreValueScoreConfig = {
  '+': { 
    label: '+', 
    color: 'text-foreground', 
    tooltip: 'Exceeds expectations - Strong performance'
  },
  '+/-': { 
    label: '+/-', 
    color: 'text-foreground', 
    tooltip: 'Meets expectations - Adequate performance'
  },
  '-': {
    label: '-',
    color: 'text-destructive',
    tooltip: 'Below expectations - Needs improvement'
  },
};

const binaryScoreConfig = {
  '+': {
    label: 'Yes',
    color: 'text-foreground',
    tooltip: 'Yes - Has this quality'
  },
  '-': {
    label: 'No',
    color: 'text-destructive',
    tooltip: 'No - Lacks this quality'
  },
};

export const ScoreCell: React.FC<ScoreCellProps> = ({
  value,
  onChange,
  disabled = false,
  isBarRow = false,
  scoreType = 'core_value',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Determine which scoring system to use
  const isBinaryScore = scoreType === 'gets_it' || scoreType === 'wants_it' || scoreType === 'capacity';
  const scoreConfig = isBinaryScore ? binaryScoreConfig : coreValueScoreConfig;
  
  const currentConfig = value && scoreConfig[value as keyof typeof scoreConfig] ? scoreConfig[value as keyof typeof scoreConfig] : null;

  const handleSelect = (newValue: ScoreValue) => {
    onChange?.(newValue);
    setIsOpen(false);
  };

  if (disabled || !onChange) {
    return (
      <div className="h-6 flex items-center justify-center">
        {currentConfig && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <span className={`px-1.5 py-0.5 text-xs font-medium ${currentConfig.color}`}>
                  {currentConfig.label}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>{currentConfig.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    );
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-6 px-1.5 text-xs hover:bg-muted/20 ${
            currentConfig ? currentConfig.color : 'text-muted-foreground/60'
          } ${isBarRow ? 'font-semibold' : ''}`}
        >
          {currentConfig ? currentConfig.label : '?'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-28">
        {Object.entries(scoreConfig).map(([scoreValue, config]) => (
          <DropdownMenuItem
            key={scoreValue}
            onClick={() => handleSelect(scoreValue as ScoreValue)}
            className="flex items-center justify-between"
          >
            <span className={`px-1.5 py-0.5 text-xs font-medium ${config.color}`}>
              {config.label}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
