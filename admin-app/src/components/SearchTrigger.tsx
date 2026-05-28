import React from 'react';
import { Search } from 'lucide-react';
import { useCommandPalette } from '@/contexts/CommandPaletteContext';

export const SearchTrigger: React.FC = () => {
  const { openPalette } = useCommandPalette();

  const handleClick = () => {
    openPalette();
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-2 h-8 px-3 rounded-[5px] bg-muted text-muted-foreground transition-colors cursor-pointer w-full max-w-[450px] min-w-[280px] hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <span className="text-[13px] text-muted-foreground flex-1 text-left truncate">Search...</span>
      <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 flex-shrink-0">
        <span className="text-xs">⌘</span>K
      </kbd>
    </button>
  );
};