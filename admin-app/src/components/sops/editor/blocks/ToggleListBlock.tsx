import React from 'react';
import { Input } from '@/components/ui/input';
import { SopBlock } from '@/types/sops';
import { ChevronRight, ChevronDown } from 'lucide-react';

interface ToggleListBlockProps {
  block: SopBlock;
  onChange: (content: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onToggle: () => void;
  inputRef: React.RefObject<HTMLInputElement>;
}

export const ToggleListBlock: React.FC<ToggleListBlockProps> = ({
  block,
  onChange,
  onKeyDown,
  onToggle,
  inputRef,
}) => {
  const isCollapsed = block.content.collapsed ?? false;

  return (
    <div className="flex items-start gap-2">
      <button
        onClick={onToggle}
        className="mt-2.5 p-0.5 hover:bg-accent rounded transition-colors"
        aria-label={isCollapsed ? 'Expand' : 'Collapse'}
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      <div className="flex-1">
        <Input
          ref={inputRef}
          type="text"
          value={block.content.text || ''}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Toggle list"
          className="border-none shadow-none px-0 focus-visible:ring-0"
        />
      </div>
    </div>
  );
};
