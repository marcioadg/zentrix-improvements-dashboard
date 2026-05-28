import React from 'react';
import { Button } from '@/components/ui/button';
import { Bold, Italic, Underline } from 'lucide-react';
import { BlockContent } from '@/types/sops';

interface BlockToolbarProps {
  isVisible: boolean;
  position: { top: number; left: number };
  content: BlockContent;
  onFormat: (format: 'bold' | 'italic' | 'underline') => void;
}

export const BlockToolbar: React.FC<BlockToolbarProps> = ({
  isVisible,
  position,
  content,
  onFormat,
}) => {
  if (!isVisible) return null;

  const formatting = content.formatting || {};

  return (
    <div
      role="toolbar"
      aria-label="Text formatting"
      className="fixed z-50 flex items-center gap-1 bg-card border border-border rounded-lg shadow-lg p-1"
      style={{ top: position.top, left: position.left }}
    >
      <Button
        variant={formatting.bold ? 'default' : 'ghost'}
        size="sm"
        className="h-8 w-8 p-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
        onClick={() => onFormat('bold')}
        aria-label="Toggle bold"
        aria-pressed={!!formatting.bold}
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        variant={formatting.italic ? 'default' : 'ghost'}
        size="sm"
        className="h-8 w-8 p-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
        onClick={() => onFormat('italic')}
        aria-label="Toggle italic"
        aria-pressed={!!formatting.italic}
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        variant={formatting.underline ? 'default' : 'ghost'}
        size="sm"
        className="h-8 w-8 p-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
        onClick={() => onFormat('underline')}
        aria-label="Toggle underline"
        aria-pressed={!!formatting.underline}
      >
        <Underline className="h-4 w-4" />
      </Button>
    </div>
  );
};
