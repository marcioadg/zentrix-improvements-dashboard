import React, { useState, useCallback, useMemo } from 'react';
import { Search, X, CheckSquare, Target, BarChart3, MessageCircleQuestion, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { MobileCompanySwitcher } from '@/components/shared/MobileCompanySwitcher';
import { cn } from '@/lib/utils';
import { logger } from '@/utils/logger';

interface SearchResult {
  id: string;
  title: string;
  type: 'task' | 'goal' | 'metric' | 'issue';
  description?: string;
  route: string;
}

interface MobileSearchBarProps {
  placeholder?: string;
  onSearch?: (query: string, results: SearchResult[]) => void;
}

const typeConfig = {
  task: { icon: CheckSquare, color: 'text-active-bg', bg: 'bg-active-bg/10', label: 'Task' },
  goal: { icon: Target, color: 'text-primary', bg: 'bg-primary/10', label: 'Goal' },
  metric: { icon: BarChart3, color: 'text-success', bg: 'bg-success/10', label: 'Metric' },
  issue: { icon: MessageCircleQuestion, color: 'text-warning', bg: 'bg-warning/10', label: 'Issue' },
};

export const MobileSearchBar: React.FC<MobileSearchBarProps> = ({
  placeholder = "Search tasks, goals, metrics...",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();

  // Debounced search
  const handleSearch = useCallback(async (searchQuery: string) => {
    setQuery(searchQuery);
    
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setResults([]);
        return;
      }

      const searchLower = searchQuery.toLowerCase();
      const searchResults: SearchResult[] = [];

      // Search tasks
      const { data: tasks } = await supabase
        .from('fast_tasks')
        .select('id, title, description')
        .or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
        .eq('is_deleted', false)
        .limit(5);

      if (tasks) {
        tasks.forEach(task => {
          searchResults.push({
            id: task.id,
            title: task.title,
            type: 'task',
            description: task.description || undefined,
            route: '/m/tasks',
          });
        });
      }

      // Search goals
      const { data: goals } = await supabase
        .from('team_goals')
        .select('id, title, description')
        .or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
        .neq('archived', true)
        .limit(5);

      if (goals) {
        goals.forEach(goal => {
          searchResults.push({
            id: goal.id,
            title: goal.title,
            type: 'goal',
            description: goal.description || undefined,
            route: '/m/goals',
          });
        });
      }

      // Search issues
      const { data: issues } = await supabase
        .from('issues')
        .select('id, title, description')
        .or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
        .eq('is_deleted', false)
        .neq('archived', true)
        .limit(5);

      if (issues) {
        issues.forEach(issue => {
          searchResults.push({
            id: issue.id,
            title: issue.title,
            type: 'issue',
            description: issue.description || undefined,
            route: '/m/issues',
          });
        });
      }

      // Search metrics (RLS ensures user only sees metrics from their teams)
      const { data: metrics } = await supabase
        .from('weekly_metrics')
        .select('id, metric_name, description, team_id')
        .or(`metric_name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
        .is('deleted_at', null)
        .limit(10); // Fetch more to account for deduplication

      if (metrics) {
        // Deduplicate by metric_name + team_id to avoid showing the same metric for multiple weeks
        const uniqueMetrics = new Map<string, typeof metrics[0]>();
        metrics.forEach(metric => {
          const key = `${metric.metric_name}-${metric.team_id}`;
          if (!uniqueMetrics.has(key)) {
            uniqueMetrics.set(key, metric);
          }
        });

        // Take max 5 unique metrics
        let count = 0;
        uniqueMetrics.forEach(metric => {
          if (count < 5) {
            searchResults.push({
              id: metric.id,
              title: metric.metric_name,
              type: 'metric',
              description: metric.description || undefined,
              route: '/m/metrics',
            });
            count++;
          }
        });
      }

      setResults(searchResults);
    } catch (err) {
      logger.error('Search error:', err);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleResultClick = useCallback((result: SearchResult) => {
    setIsOpen(false);
    setQuery('');
    setResults([]);
    navigate(result.route);
  }, [navigate]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
  }, []);

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-background border-b border-border/30">
      {/* Search Input */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "flex-1 flex items-center gap-2 h-10 px-3 rounded-[6px]",
          "bg-muted/60 text-muted-foreground",
          "transition-all duration-150 active:scale-[0.98]"
        )}
      >
        <Search className="h-4 w-4" />
        <span className="text-sm">{placeholder}</span>
      </button>

      {/* Company Switcher */}
      <MobileCompanySwitcher />

      {/* Search Sheet */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="top" className="h-auto max-h-[80vh] pt-safe">
          <SheetHeader className="sr-only">
            <SheetTitle>Search</SheetTitle>
          </SheetHeader>
          
          {/* Search Input */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 flex items-center gap-2 h-12 px-4 rounded-[6px] bg-muted/60">
              <Search className="h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder={placeholder}
                autoFocus
                className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              {query && (
                <button onClick={clearSearch} className="p-1" aria-label="Clear search">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>

          {/* Results */}
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {isSearching && (
              <div className="py-8 text-center text-muted-foreground text-sm">
                Searching...
              </div>
            )}
            
            {!isSearching && query && results.length === 0 && (
              <div className="py-8 text-center text-muted-foreground text-sm">
                No results found
              </div>
            )}
            
            {!isSearching && results.map((result) => {
              const config = typeConfig[result.type];
              const Icon = config.icon;
              
              return (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleResultClick(result)}
                  className="w-full flex items-start gap-3 p-3 rounded-[6px] bg-card border border-border/40 text-left transition-all active:scale-[0.98]"
                >
                  <div className={cn("w-9 h-9 rounded-[6px] flex items-center justify-center shrink-0", config.bg)}>
                    <Icon className={cn("h-4 w-4", config.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium text-foreground line-clamp-1">
                        {result.title}
                      </span>
                      <span className={cn("text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-[4px]", config.bg, config.color)}>
                        {config.label}
                      </span>
                    </div>
                    {result.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {result.description}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};
