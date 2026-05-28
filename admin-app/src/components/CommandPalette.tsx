import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useCommandPalette, SearchResult, SearchCategory } from '@/contexts/CommandPaletteContext';
import { getSearchResults, setNavigateFunction } from '@/services/searchService';
import { 
  Home, 
  Users, 
  Settings, 
  Target, 
  BarChart3, 
  Calendar,
  FolderOpen,
  Search
} from 'lucide-react';

const iconMap: Record<string, React.ComponentType<any>> = {
  home: Home,
  users: Users,
  settings: Settings,
  target: Target,
  chart: BarChart3,
  calendar: Calendar,
  folder: FolderOpen,
  search: Search,
};

// Mobile-only quick actions (no pages navigation)
const getMobileQuickActions = (): SearchCategory[] => [
  {
    name: 'Quick Actions',
    results: [
      {
        id: 'create-task',
        title: 'Create Task',
        description: 'Add a new task',
        category: 'Quick Actions',
        action: () => {
          if ((window as any).openCreateTaskModal) {
            (window as any).openCreateTaskModal();
          }
        },
        icon: 'folder',
      },
      {
        id: 'set-goal',
        title: 'Set Goal',
        description: 'Add a new goal',
        category: 'Quick Actions',
        action: () => {
          if ((window as any).openCreateGoalModal) {
            (window as any).openCreateGoalModal();
          }
        },
        icon: 'target',
      },
      {
        id: 'add-metric',
        title: 'Add Metric',
        description: 'Track a new metric',
        category: 'Quick Actions',
        action: () => {
          if ((window as any).openCreateMetricModal) {
            (window as any).openCreateMetricModal();
          }
        },
        icon: 'chart',
      },
    ],
  },
];

export const CommandPalette: React.FC = () => {
  const { isOpen, searchQuery, setSearchQuery, closePalette } = useCommandPalette();
  const [filteredCategories, setFilteredCategories] = useState<SearchCategory[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  
  const isMobileRoute = location.pathname.startsWith('/m/') || location.pathname === '/m';

  // Set the navigate function for the search service
  useEffect(() => {
    setNavigateFunction(navigate);
  }, [navigate]);

  // Track command palette opened
  useEffect(() => {
    if (isOpen) {
      import('@/lib/analytics').then(({ trackCommandPaletteOpened }) => {
        trackCommandPaletteOpened();
      }).catch(() => {});
    }
  }, [isOpen]);

  // Filter results based on search query
  useEffect(() => {
    const allResults = isMobileRoute ? getMobileQuickActions() : getSearchResults();
    
    if (!searchQuery.trim()) {
      setFilteredCategories(allResults);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = allResults
      .map(category => ({
        ...category,
        results: category.results.filter(result =>
          result.title.toLowerCase().includes(query) ||
          result.description.toLowerCase().includes(query)
        )
      }))
      .filter(category => category.results.length > 0);

    setFilteredCategories(filtered);
  }, [searchQuery, isMobileRoute]);

  const handleSelect = (result: SearchResult) => {
    result.action();
    closePalette();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      closePalette();
    }
  };

  return (
    <CommandDialog open={isOpen} onOpenChange={closePalette}>
      <div onKeyDown={handleKeyDown}>
        <CommandInput
          placeholder={isMobileRoute ? "Search actions..." : "Search for pages, settings, users, and more..."}
          value={searchQuery}
          onValueChange={setSearchQuery}
          className="h-12"
        />
        <CommandList className={isMobileRoute ? "max-h-[280px]" : "max-h-[400px]"}>
          <CommandEmpty className="py-6 text-center text-muted-foreground">
            <Search className="mx-auto h-6 w-6 mb-2 opacity-50" />
            <p className="text-sm">No results found</p>
          </CommandEmpty>
          
          {filteredCategories.map((category) => (
            <CommandGroup key={category.name} heading={category.name}>
              {category.results.map((result) => {
                const IconComponent = result.icon ? iconMap[result.icon] || Search : Search;
                
                return (
                  <CommandItem
                    key={result.id}
                    value={`${result.title} ${result.description}`}
                    onSelect={() => handleSelect(result)}
                    className="flex items-center gap-3 px-3 py-3 cursor-pointer"
                  >
                    <div className="flex-shrink-0">
                      <IconComponent className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{result.title}</div>
                      {!isMobileRoute && (
                        <div className="text-xs text-muted-foreground truncate">
                          {result.description}
                        </div>
                      )}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ))}
        </CommandList>
        
        {!isMobileRoute && (
          <div className="flex items-center justify-between px-3 py-2 border-t bg-muted/30">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
                  ↑↓
                </kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
                  ↵
                </kbd>
                Select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
                  esc
                </kbd>
                Close
              </span>
            </div>
          </div>
        )}
      </div>
    </CommandDialog>
  );
};