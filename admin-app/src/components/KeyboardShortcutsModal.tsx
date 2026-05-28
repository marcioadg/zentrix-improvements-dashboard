import React, { useState, useEffect } from 'react';
import {
  CommandDialog,
  CommandEmpty,
  CommandInput,
  CommandList,
} from '@/components/ui/command';
import { useKeyboardShortcuts } from '@/contexts/KeyboardShortcutsContext';
import { keyboardShortcuts, searchShortcuts, isMac } from '@/data/keyboardShortcuts';
import { ShortcutsList } from './ShortcutsList';
import { Keyboard, Search } from 'lucide-react';

export const KeyboardShortcutsModal: React.FC = () => {
  const { isOpen, searchQuery, setSearchQuery, closeShortcuts } = useKeyboardShortcuts();
  const [filteredShortcuts, setFilteredShortcuts] = useState(keyboardShortcuts);
  const isApplePlatform = isMac();

  // Filter shortcuts based on search query
  useEffect(() => {
    const filtered = searchShortcuts(searchQuery);
    setFilteredShortcuts(filtered);
  }, [searchQuery]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      closeShortcuts();
    }
  };

  return (
    <CommandDialog open={isOpen} onOpenChange={closeShortcuts}>
      <div onKeyDown={handleKeyDown} className="animate-scale-in">
        <div className="flex items-center gap-2 px-3 py-2 border-b">
          <Keyboard className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Keyboard Shortcuts</span>
          <span className="text-xs text-muted-foreground ml-auto">
            {isApplePlatform ? 'macOS' : 'Windows'}
          </span>
        </div>
        
        <CommandInput
          placeholder="Search shortcuts..."
          value={searchQuery}
          onValueChange={setSearchQuery}
          className="h-12"
        />
        
        <CommandList className="max-h-[400px] p-0">
          <CommandEmpty className="py-8 text-center text-muted-foreground">
            <Search className="mx-auto h-8 w-8 mb-2 opacity-50" />
            <p>No shortcuts found for "{searchQuery}"</p>
            <p className="text-xs mt-1">Try a different search term</p>
          </CommandEmpty>
          
          <div className="p-2">
            <ShortcutsList 
              shortcuts={filteredShortcuts}
              showCategories={!searchQuery.trim()}
            />
          </div>
        </CommandList>
        
        <div className="flex items-center justify-between px-3 py-2 border-t bg-muted/30">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
                {isApplePlatform ? '⌘' : 'Ctrl'} /
              </kbd>
              Toggle shortcuts
            </span>
            <span className="flex items-center gap-1">
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
                esc
              </kbd>
              Close
            </span>
          </div>
        </div>
      </div>
    </CommandDialog>
  );
};