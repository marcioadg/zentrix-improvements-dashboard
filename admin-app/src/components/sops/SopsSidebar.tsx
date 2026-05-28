import React, { useState } from 'react';
import { useSpaces } from '@/hooks/sops/useSpaces';
import { usePages } from '@/hooks/sops/usePages';
import { useNavigate, useLocation } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Search, FileText, ChevronRight, ChevronDown, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export const SopsSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { spaces } = useSpaces();
  const { pages } = usePages();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSpaces, setExpandedSpaces] = useState<Set<string>>(new Set());

  const filteredPages = pages.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSpace = (spaceId: string) => {
    setExpandedSpaces((prev) => {
      const next = new Set(prev);
      if (next.has(spaceId)) {
        next.delete(spaceId);
      } else {
        next.add(spaceId);
      }
      return next;
    });
  };

  const getSpacePages = (spaceId: string) => {
    return filteredPages.filter((p) => p.space_id === spaceId && !p.parent_page_id);
  };

  const getRootPages = () => {
    return filteredPages.filter((p) => !p.space_id && !p.parent_page_id);
  };

  return (
    <div className="flex flex-col min-h-screen bg-card">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b p-4">
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => navigate('/sops')}
        >
          <Home className="h-4 w-4 mr-2" />
          SOPs Home
        </Button>
      </div>

      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search pages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {/* Spaces */}
          {spaces.map((space) => {
            const spacePages = getSpacePages(space.id);
            const isExpanded = expandedSpaces.has(space.id);

            return (
              <div key={space.id} className="space-y-1">
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => toggleSpace(space.id)}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 mr-1" />
                  ) : (
                    <ChevronRight className="h-4 w-4 mr-1" />
                  )}
                  <span className="mr-2">{space.icon || '📁'}</span>
                  <span className="truncate">{space.name}</span>
                </Button>

                {isExpanded && spacePages.length > 0 && (
                  <div className="ml-6 space-y-1">
                    {spacePages.map((page) => (
                      <Button
                        key={page.id}
                        variant="ghost"
                        className={cn(
                          'w-full justify-start text-sm',
                          location.pathname === `/sops/page/${page.id}` && 'bg-accent'
                        )}
                        onClick={() => navigate(`/sops/page/${page.id}`)}
                      >
                        <FileText className="h-3 w-3 mr-2" />
                        <span className="truncate">{page.title}</span>
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Root pages (not in any space) */}
          {getRootPages().length > 0 && (
            <div className="space-y-1 mt-4">
              <p className="text-xs text-muted-foreground px-3 py-2">Pages</p>
              {getRootPages().map((page) => (
                <Button
                  key={page.id}
                  variant="ghost"
                  className={cn(
                    'w-full justify-start text-sm',
                    location.pathname === `/sops/page/${page.id}` && 'bg-accent'
                  )}
                  onClick={() => navigate(`/sops/page/${page.id}`)}
                >
                  <FileText className="h-3 w-3 mr-2" />
                  <span className="truncate">{page.title}</span>
                </Button>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
