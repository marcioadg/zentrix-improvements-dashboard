import React, { useState, useCallback, useRef, useEffect } from 'react';
import { LucideIcon, Search, X, CheckSquare, Target, BarChart3, MessageCircleQuestion, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { MobileHeaderMenu } from '@/components/mobile/MobileHeaderMenu';
import { UserAvatar } from '@/components/UserAvatar';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { cn } from '@/lib/utils';
import { logger } from '@/utils/logger';

interface SearchResult {
  id: string;
  title: string;
  type: 'task' | 'goal' | 'metric' | 'issue';
  description?: string;
  route: string;
}

const typeConfig = {
  task: { icon: CheckSquare, color: 'text-active-bg', bg: 'bg-active-bg/10', label: 'Task' },
  goal: { icon: Target, color: 'text-primary', bg: 'bg-primary/10', label: 'Goal' },
  metric: { icon: BarChart3, color: 'text-success', bg: 'bg-success/10', label: 'Metric' },
  issue: { icon: MessageCircleQuestion, color: 'text-warning', bg: 'bg-warning/10', label: 'Issue' },
};

interface MobilePageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  iconClassName?: string;
  children?: React.ReactNode;
  sticky?: boolean;
  showSearch?: boolean;
  showBackButton?: boolean;
}

/**
 * Premium mobile page header - Linear/Notion inspired
 * - 20px title with -0.02em tracking and font-extrabold
 * - Optional search bar with company switcher
 * - Gradient icon container
 * - Elevated shadow on sticky
 * - Safe area aware
 */
export const MobilePageHeader: React.FC<MobilePageHeaderProps> = ({
  title,
  subtitle,
  icon: Icon,
  iconClassName,
  children,
  sticky = true,
  showSearch = false,
  showBackButton = false,
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  const headerRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();

  // Measure header height for spacer when using fixed positioning
  useEffect(() => {
    if (sticky && headerRef.current) {
      const updateHeight = () => {
        if (headerRef.current) {
          setHeaderHeight(headerRef.current.offsetHeight);
        }
      };
      updateHeight();
      // Re-measure on resize
      window.addEventListener('resize', updateHeight);
      return () => window.removeEventListener('resize', updateHeight);
    }
  }, [sticky, children, showSearch]);

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

      setResults(searchResults);
    } catch (err) {
      logger.error('Search error:', err);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleResultClick = useCallback((result: SearchResult) => {
    setIsSearchOpen(false);
    setQuery('');
    setResults([]);
    navigate(result.route);
  }, [navigate]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
  }, []);

  return (
    <>
      {/* Spacer to push content below fixed header - uses measured height or fallback */}
      {sticky && (
        <div 
          style={{ height: headerHeight || 'calc(env(safe-area-inset-top) + 140px)' }} 
          aria-hidden="true" 
        />
      )}
      <header
        ref={headerRef}
        className={cn(
          "bg-background backdrop-blur-md",
          "px-4 pb-3",
          "transition-shadow duration-200",
          // Use fixed positioning for iOS reliability - sticky breaks on scroll
          sticky && "fixed top-0 left-0 right-0 z-20"
        )}
        style={{
          // Properly extend into safe area on iOS with notch/Dynamic Island
          paddingTop: 'max(env(safe-area-inset-top, 20px), 20px)',
        }}
      >
      {/* Search Bar Row - if showSearch is true.
          New layout: [search icon] [company name + shortcuts menu] [avatar]
          Search becomes an icon-only trigger on the left; the center is the
          new MobileHeaderMenu which shows the company name and opens a
          sheet with company switcher + quick links to Org Chart / Analytics
          / Meeting. UserAvatar (settings) stays on the right. */}
      {showSearch && (
        <div className="flex items-center gap-2 mb-3">
          {/* Search icon — opens existing search Sheet below */}
          <button
            onClick={() => setIsSearchOpen(true)}
            aria-label="Open search"
            className={cn(
              "w-9 h-9 rounded-[6px] flex items-center justify-center shrink-0",
              "bg-muted/60 text-foreground",
              "transition-all duration-150 active:scale-95"
            )}
          >
            <Search className="h-4 w-4" />
          </button>

          {/* Company menu — takes the wide center slot */}
          <MobileHeaderMenu />

          {/* User Avatar — settings */}
          <button
            onClick={() => navigate('/m/settings')}
            aria-label="Open settings"
            className="transition-transform duration-150 active:scale-95 shrink-0"
          >
            <UserAvatar
              fullName={profile?.full_name || ''}
              email={user?.email || ''}
              avatarUrl={profile?.avatar_url}
              size="md"
              disableHoverScale
            />
          </button>
        </div>
      )}

      {/* Title Row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {showBackButton && (
            <button
              onClick={() => navigate(-1)}
              aria-label="Go back"
              className={cn(
                "w-9 h-9 rounded-[6px] flex items-center justify-center",
                "bg-muted/60 text-foreground",
                "transition-all duration-150 active:scale-95"
              )}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div className="flex flex-col">
            <h1 className="text-xl font-extrabold tracking-[-0.02em] text-foreground">
              {title}
            </h1>
            {subtitle && (
              <span className="text-xs text-muted-foreground mt-0.5">
                {subtitle}
              </span>
            )}
          </div>
        </div>
        {Icon && !showSearch && (
          <div className={cn(
            "w-9 h-9 rounded-[6px] flex items-center justify-center",
            "bg-gradient-to-br from-primary/15 to-primary/5",
            "shadow-sm",
            "transition-transform duration-200 hover:scale-105 active:scale-95"
          )}>
            <Icon className={cn("h-5 w-5 text-primary", iconClassName)} />
          </div>
        )}
      </div>
      
      {/* Optional controls slot with stagger animation */}
      {children && (
        <div className="animate-fade-in" style={{ animationDelay: '50ms' }}>
          {children}
        </div>
      )}

      {/* Search Sheet */}
      {showSearch && (
        <Sheet open={isSearchOpen} onOpenChange={setIsSearchOpen}>
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
                  placeholder="Search tasks, goals, issues..."
                  autoFocus
                  className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
                {query && (
                  <button onClick={clearSearch} aria-label="Clear search" className="p-1">
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
                const ResultIcon = config.icon;
                
                return (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleResultClick(result)}
                    className="w-full flex items-start gap-3 p-3 rounded-[6px] bg-card border border-border/40 text-left transition-all active:scale-[0.98]"
                  >
                    <div className={cn("w-9 h-9 rounded-[6px] flex items-center justify-center shrink-0", config.bg)}>
                      <ResultIcon className={cn("h-4 w-4", config.color)} />
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
        )}
      </header>
    </>
  );
};
