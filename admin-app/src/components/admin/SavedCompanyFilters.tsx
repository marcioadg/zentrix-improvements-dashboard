import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Save, Filter, Trash2, Check } from 'lucide-react';
import { useCompanyFilterPreferences, CompanyFilterState, SavedCompanyFilter } from '@/hooks/useCompanyFilterPreferences';
import { useToast } from '@/hooks/use-toast';

interface SavedCompanyFiltersProps {
  currentFilters: CompanyFilterState;
  onLoadFilter: (filters: CompanyFilterState) => void;
}

export const SavedCompanyFilters = ({ currentFilters, onLoadFilter }: SavedCompanyFiltersProps) => {
  const { savedFilters, saveFilter, deleteFilter } = useCompanyFilterPreferences();
  const { toast } = useToast();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [activeFilterId, setActiveFilterId] = useState<string | null>(null);

  const handleSaveFilter = () => {
    if (!filterName.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a name for this filter',
        variant: 'destructive',
      });
      return;
    }

    saveFilter(filterName, currentFilters);
    toast({
      title: 'Filter saved',
      description: `"${filterName}" has been saved successfully`,
    });
    setFilterName('');
    setShowSaveDialog(false);
  };

  const handleLoadFilter = (filter: SavedCompanyFilter) => {
    onLoadFilter(filter.filters);
    setActiveFilterId(filter.id);
    toast({
      title: 'Filter applied',
      description: `"${filter.name}" has been applied`,
    });
  };

  const handleDeleteFilter = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteFilter(id);
    if (activeFilterId === id) {
      setActiveFilterId(null);
    }
    toast({
      title: 'Filter deleted',
      description: `"${name}" has been removed`,
    });
  };

  const getFilterSummary = (filter: SavedCompanyFilter) => {
    const parts: string[] = [];
    
    if (filter.filters.searchQuery) {
      parts.push(`Search: "${filter.filters.searchQuery}"`);
    }
    if (filter.filters.showAtRisk) {
      parts.push('At Risk');
    }
    if (filter.filters.showOrphaned) {
      parts.push('Orphaned');
    }
    parts.push(`Sort: ${filter.filters.sortField} (${filter.filters.sortDirection})`);
    
    return parts.join(' • ');
  };

  return (
    <>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSaveDialog(true)}
          className="whitespace-nowrap"
        >
          <Save className="h-4 w-4 mr-2" />
          Save Filter
        </Button>

        {savedFilters.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="whitespace-nowrap">
                <Filter className="h-4 w-4 mr-2" />
                Saved Filters ({savedFilters.length})
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              {savedFilters.map((filter) => (
                <DropdownMenuItem
                  key={filter.id}
                  className="flex flex-col items-start gap-1 p-3 cursor-pointer"
                  onClick={() => handleLoadFilter(filter)}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      {activeFilterId === filter.id && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                      <span className="font-medium">{filter.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                      onClick={(e) => handleDeleteFilter(filter.id, filter.name, e)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {getFilterSummary(filter)}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Current Filter</DialogTitle>
            <DialogDescription>
              Give this filter configuration a name to save it for later use.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="filter-name">Filter Name</Label>
              <Input
                id="filter-name"
                placeholder="e.g., Active Paid Companies"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveFilter();
                  }
                }}
              />
            </div>

            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <div className="space-y-2 text-sm">
                  <div className="font-medium">Current filter settings:</div>
                  <ul className="space-y-1 text-muted-foreground">
                    {currentFilters.searchQuery && (
                      <li>• Search: "{currentFilters.searchQuery}"</li>
                    )}
                    {currentFilters.showAtRisk && <li>• Show at-risk companies</li>}
                    {currentFilters.showOrphaned && <li>• Show orphaned companies</li>}
                    <li>• Sort by: {currentFilters.sortField} ({currentFilters.sortDirection})</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveFilter}>
              <Save className="h-4 w-4 mr-2" />
              Save Filter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
