import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, X, Star } from 'lucide-react';
import { useSavedCompanyFilters, SavedFilter } from '@/hooks/useSavedCompanyFilters';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SavedFiltersBarProps {
  currentFilters: SavedFilter['filter_data'];
  onLoadFilter: (filter: SavedFilter['filter_data']) => void;
}

export const SavedFiltersBar: React.FC<SavedFiltersBarProps> = ({
  currentFilters,
  onLoadFilter,
}) => {
  const { savedFilters, saveFilter, deleteFilter, isSaving } = useSavedCompanyFilters();
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [filterName, setFilterName] = useState('');

  const handleSaveFilter = () => {
    if (!filterName.trim()) return;
    saveFilter(
      { name: filterName.trim(), filterData: currentFilters },
      {
        onSuccess: () => {
          setSaveDialogOpen(false);
          setFilterName('');
        },
      }
    );
  };

  const hasActiveFilters =
    currentFilters.searchQuery ||
    (currentFilters.excludedCompanyIds && currentFilters.excludedCompanyIds.length > 0) ||
    currentFilters.showAtRisk;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Save Current Filter Button */}
      {hasActiveFilters && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSaveDialogOpen(true)}
          className="gap-2"
        >
          <Save className="h-3 w-3" />
          Save Filter
        </Button>
      )}

      {/* Saved Filters */}
      {savedFilters.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Saved:</span>
          <ScrollArea className="max-w-2xl">
            <div className="flex items-center gap-2">
              {savedFilters.map((filter) => (
                <Badge
                  key={filter.id}
                  variant="secondary"
                  className="cursor-pointer hover:bg-accent gap-2 group pr-1"
                >
                  <span onClick={() => onLoadFilter(filter.filter_data)}>
                    <Star className="h-3 w-3 inline mr-1" />
                    {filter.name}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteFilter(filter.id);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Save Filter Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Filter</DialogTitle>
            <DialogDescription>
              Give this filter combination a name so you can quickly apply it later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="filter-name">Filter Name</Label>
              <Input
                id="filter-name"
                placeholder="e.g., At Risk Companies, Active Trials"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveFilter();
                  }
                }}
              />
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="font-semibold">Current Filters:</p>
              <ul className="list-disc list-inside space-y-1">
                {currentFilters.searchQuery && (
                  <li>Search: "{currentFilters.searchQuery}"</li>
                )}
                {currentFilters.excludedCompanyIds &&
                  currentFilters.excludedCompanyIds.length > 0 && (
                    <li>
                      Excluded: {currentFilters.excludedCompanyIds.length} companies
                    </li>
                  )}
                {currentFilters.showAtRisk && <li>Show At Risk: Yes</li>}
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSaveDialogOpen(false);
                setFilterName('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveFilter}
              disabled={!filterName.trim() || isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Filter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
