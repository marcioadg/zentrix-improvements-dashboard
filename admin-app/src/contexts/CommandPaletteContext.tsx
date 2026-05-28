import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface SearchResult {
  id: string;
  title: string;
  description: string;
  category: string;
  action: () => void;
  icon?: string;
}

export interface SearchCategory {
  name: string;
  results: SearchResult[];
}

interface CommandPaletteContextType {
  isOpen: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  openPalette: () => void;
  closePalette: () => void;
}

const CommandPaletteContext = createContext<CommandPaletteContextType | undefined>(undefined);

export const CommandPaletteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const openPalette = useCallback(() => {
    setIsOpen(true);
    setSearchQuery('');
  }, []);

  const closePalette = useCallback(() => {
    setIsOpen(false);
    setSearchQuery('');
  }, []);

  // Global keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        // Prevent browser's native find functionality
        event.preventDefault();
        event.stopPropagation();
        openPalette();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [openPalette]);

  return (
    <CommandPaletteContext.Provider value={{
      isOpen,
      searchQuery,
      setSearchQuery,
      openPalette,
      closePalette,
    }}>
      {children}
    </CommandPaletteContext.Provider>
  );
};

export const useCommandPalette = () => {
  const context = useContext(CommandPaletteContext);
  if (context === undefined) {
    throw new Error('useCommandPalette must be used within a CommandPaletteProvider');
  }
  return context;
};