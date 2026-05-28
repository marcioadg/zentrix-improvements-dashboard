import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface KeyboardShortcutsContextType {
  isOpen: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  openShortcuts: () => void;
  closeShortcuts: () => void;
}

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextType | undefined>(undefined);

export const KeyboardShortcutsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const openShortcuts = useCallback(() => {
    setIsOpen(true);
    setSearchQuery('');
  }, []);

  const closeShortcuts = useCallback(() => {
    setIsOpen(false);
    setSearchQuery('');
  }, []);

  // Global keyboard shortcut listener for Cmd+/ or Ctrl+/
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Cmd+/ (Mac) or Ctrl+/ (Windows/Linux)
      if ((event.metaKey || event.ctrlKey) && event.key === '/') {
        // Prevent browser's native find functionality
        event.preventDefault();
        event.stopPropagation();
        openShortcuts();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [openShortcuts]);

  return (
    <KeyboardShortcutsContext.Provider value={{
      isOpen,
      searchQuery,
      setSearchQuery,
      openShortcuts,
      closeShortcuts,
    }}>
      {children}
    </KeyboardShortcutsContext.Provider>
  );
};

export const useKeyboardShortcuts = () => {
  const context = useContext(KeyboardShortcutsContext);
  if (context === undefined) {
    throw new Error('useKeyboardShortcuts must be used within a KeyboardShortcutsProvider');
  }
  return context;
};