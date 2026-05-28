export interface KeyboardShortcut {
  id: string;
  action: string;
  description?: string;
  mac: string;
  windows: string;
  category: string;
}

export interface ShortcutCategory {
  name: string;
  shortcuts: KeyboardShortcut[];
}

export const keyboardShortcuts: KeyboardShortcut[] = [
  // Navigation
  {
    id: 'global-search',
    action: 'Open Global Search',
    description: 'Search across pages, settings, and actions',
    mac: '⌘ K',
    windows: 'Ctrl K',
    category: 'Navigation'
  },
  {
    id: 'keyboard-shortcuts',
    action: 'Show Keyboard Shortcuts',
    description: 'View all available keyboard shortcuts',
    mac: '⌘ /',
    windows: 'Ctrl /',
    category: 'Navigation'
  },
  {
    id: 'settings',
    action: 'Go to Settings',
    description: 'Navigate to settings page',
    mac: '⌘ ,',
    windows: 'Ctrl ,',
    category: 'Navigation'
  },

  // Actions
  {
    id: 'create-task',
    action: 'Create Task',
    description: 'Quickly create a new task',
    mac: '⌘ T',
    windows: 'Ctrl T',
    category: 'Actions'
  },
  {
    id: 'create-issue',
    action: 'Create Issue',
    description: 'Quickly create a new issue',
    mac: '⌘ I',
    windows: 'Ctrl I',
    category: 'Actions'
  },
  {
    id: 'create-goal',
    action: 'Create Goal',
    description: 'Quickly create a new goal',
    mac: '⌘ G',
    windows: 'Ctrl G',
    category: 'Actions'
  },
  {
    id: 'create-metric',
    action: 'Create Metric',
    description: 'Quickly create a new metric',
    mac: '⌘ M',
    windows: 'Ctrl M',
    category: 'Actions'
  },
  {
    id: 'create-headline',
    action: 'Create Headline',
    description: 'Quickly create a new headline',
    mac: '⌘ H',
    windows: 'Ctrl H',
    category: 'Actions'
  },

  // Interface
  {
    id: 'toggle-theme',
    action: 'Toggle Theme',
    description: 'Switch between light and dark mode',
    mac: '⌘ D',
    windows: 'Ctrl D',
    category: 'Interface'
  },
  {
    id: 'toggle-sidebar',
    action: 'Toggle Sidebar',
    description: 'Show or hide the main sidebar',
    mac: '⌘ B',
    windows: 'Ctrl B',
    category: 'Interface'
  },
  {
    id: 'focus-search',
    action: 'Focus Search',
    description: 'Focus the main search input',
    mac: '⌘ F',
    windows: 'Ctrl F',
    category: 'Interface'
  },

  // General
  {
    id: 'close-modal',
    action: 'Close Modal',
    description: 'Close any open modal or dialog',
    mac: 'Esc',
    windows: 'Esc',
    category: 'General'
  },
  {
    id: 'save',
    action: 'Save',
    description: 'Save current changes',
    mac: '⌘ S',
    windows: 'Ctrl S',
    category: 'General'
  },
  {
    id: 'refresh',
    action: 'Refresh Page',
    description: 'Refresh current page content',
    mac: '⌘ R',
    windows: 'Ctrl R',
    category: 'General'
  }
];

export const getShortcutsByCategory = (): ShortcutCategory[] => {
  const categories = [...new Set(keyboardShortcuts.map(s => s.category))];
  
  return categories.map(categoryName => ({
    name: categoryName,
    shortcuts: keyboardShortcuts.filter(s => s.category === categoryName)
  }));
};

export const searchShortcuts = (query: string): KeyboardShortcut[] => {
  if (!query.trim()) return keyboardShortcuts;
  
  const searchTerm = query.toLowerCase();
  return keyboardShortcuts.filter(shortcut =>
    shortcut.action.toLowerCase().includes(searchTerm) ||
    shortcut.description?.toLowerCase().includes(searchTerm) ||
    shortcut.mac.toLowerCase().includes(searchTerm) ||
    shortcut.windows.toLowerCase().includes(searchTerm) ||
    shortcut.category.toLowerCase().includes(searchTerm)
  );
};

export const isMac = () => {
  return typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
};