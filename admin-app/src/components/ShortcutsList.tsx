import React from 'react';
import { KeyboardShortcut, isMac } from '@/data/keyboardShortcuts';

interface ShortcutsListProps {
  shortcuts: KeyboardShortcut[];
  showCategories?: boolean;
  className?: string;
}

export const ShortcutsList: React.FC<ShortcutsListProps> = ({ 
  shortcuts, 
  showCategories = true, 
  className = '' 
}) => {
  const isApplePlatform = isMac();

  // Group shortcuts by category if needed
  const groupedShortcuts = showCategories 
    ? shortcuts.reduce((acc, shortcut) => {
        if (!acc[shortcut.category]) {
          acc[shortcut.category] = [];
        }
        acc[shortcut.category].push(shortcut);
        return acc;
      }, {} as Record<string, KeyboardShortcut[]>)
    : { '': shortcuts };

  return (
    <div className={`space-y-6 ${className}`}>
      {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
        <div key={category || 'default'}>
          {showCategories && category && (
            <h3 className="text-sm font-medium text-muted-foreground mb-3 px-1">
              {category}
            </h3>
          )}
          <div className="space-y-1">
            {categoryShortcuts.map((shortcut) => (
              <div
                key={shortcut.id}
                className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground">
                    {shortcut.action}
                  </div>
                  {shortcut.description && (
                    <div className="text-xs text-muted-foreground mt-0.5 truncate">
                      {shortcut.description}
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0 ml-4">
                  <kbd className="inline-flex items-center gap-1 px-2 py-1 text-xs font-mono bg-muted border rounded-md text-muted-foreground">
                    {isApplePlatform ? shortcut.mac : shortcut.windows}
                  </kbd>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};