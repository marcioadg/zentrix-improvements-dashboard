import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { ShortcutsList } from '@/components/ShortcutsList';
import { keyboardShortcuts, searchShortcuts, isMac } from '@/data/keyboardShortcuts';
import { Keyboard, Search } from 'lucide-react';

export const ShortcutsSettings: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredShortcuts, setFilteredShortcuts] = useState(keyboardShortcuts);
  const isApplePlatform = isMac();

  useEffect(() => {
    const filtered = searchShortcuts(searchQuery);
    setFilteredShortcuts(filtered);
  }, [searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Keyboard className="h-5 w-5 text-primary" />
          <h2 className="text-[16px] font-semibold text-foreground">Keyboard Shortcuts</h2>
          <div className="ml-auto text-xs text-muted-foreground px-2 py-1 bg-muted rounded-md">
            {isApplePlatform ? 'macOS' : 'Windows'}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Learn and customize keyboard shortcuts to work more efficiently. Press{' '}
          <kbd className="px-2 py-1 text-xs font-mono bg-muted border rounded-md">
            {isApplePlatform ? '⌘ /' : 'Ctrl /'}
          </kbd>{' '}
          anywhere in the app to view shortcuts.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search shortcuts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Shortcuts List */}
      <div className="rounded-lg border bg-card">
        <div className="p-1">
          {filteredShortcuts.length > 0 ? (
            <ShortcutsList 
              shortcuts={filteredShortcuts}
              showCategories={!searchQuery.trim()}
              className="max-h-[600px] overflow-y-auto"
            />
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <Search className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p>No shortcuts found for "{searchQuery}"</p>
              <p className="text-xs mt-1">Try a different search term</p>
            </div>
          )}
        </div>
      </div>

      {/* Future customization notice */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="flex items-start gap-3">
          <div className="h-2 w-2 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-foreground">Customization Coming Soon</h3>
            <p className="text-xs text-muted-foreground mt-1">
              The ability to customize keyboard shortcuts will be available in a future update. 
              Current shortcuts are optimized for productivity and follow common conventions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};