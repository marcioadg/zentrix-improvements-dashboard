import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown, Filter, Trash2, Plus, Search, Pencil, X } from 'lucide-react';
import { useSavedCompanyFilters, SavedFilter } from '@/hooks/useSavedCompanyFilters';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface FilterSplitButtonProps {
  currentFilters: SavedFilter['filter_data'];
  onLoadFilter: (filter: SavedFilter['filter_data']) => void;
  onClearFilter?: () => void;
  companies: Array<{ id: string; name: string }>;
}

export const FilterSplitButton: React.FC<FilterSplitButtonProps> = ({
  currentFilters,
  onLoadFilter,
  onClearFilter,
  companies,
}) => {
  const { savedFilters, saveFilter, deleteFilter, updateFilter, isSaving } = useSavedCompanyFilters();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFilter, setEditingFilter] = useState<SavedFilter | null>(null);
  const [activeFilterId, setActiveFilterId] = useState<string | null>(null);

  // Form state for the dialog
  const [formFilterName, setFormFilterName] = useState('');
  const [formSearchQuery, setFormSearchQuery] = useState('');
  const [formShowAtRisk, setFormShowAtRisk] = useState(false);
  const [formExcludedIds, setFormExcludedIds] = useState<string[]>([]);
  const [companySearch, setCompanySearch] = useState('');

  // Find active filter
  const activeFilter = savedFilters.find(f => f.id === activeFilterId);

  // Filtered companies for the dialog
  const filteredCompanies = companies.filter(c =>
    c.name.toLowerCase().includes(companySearch.toLowerCase())
  );

  // Select a filter and apply it
  const handleSelectFilter = (filter: SavedFilter) => {
    setActiveFilterId(filter.id);
    onLoadFilter(filter.filter_data);
    setDropdownOpen(false);
  };

  // Open dialog for editing an existing filter
  const handleEditFilter = (e: React.MouseEvent, filter: SavedFilter) => {
    e.stopPropagation();
    setEditingFilter(filter);
    setFormFilterName(filter.name);
    setFormSearchQuery(filter.filter_data.searchQuery || '');
    setFormShowAtRisk(filter.filter_data.showAtRisk || false);
    setFormExcludedIds(filter.filter_data.excludedCompanyIds || []);
    setCompanySearch('');
    setDialogOpen(true);
    setDropdownOpen(false);
  };

  // Open dialog for creating a new filter
  const handleNewFilter = () => {
    setEditingFilter(null);
    setFormFilterName('');
    setFormSearchQuery('');
    setFormShowAtRisk(false);
    setFormExcludedIds([]);
    setCompanySearch('');
    setDialogOpen(true);
    setDropdownOpen(false);
  };

  // Save or update the filter
  const handleSaveFilter = () => {
    if (!formFilterName.trim()) return;

    const filterData: SavedFilter['filter_data'] = {
      searchQuery: formSearchQuery,
      showAtRisk: formShowAtRisk,
      excludedCompanyIds: formExcludedIds,
      subscriptionTier: currentFilters.subscriptionTier,
    };

    if (editingFilter) {
      // Update existing filter
      updateFilter(
        { id: editingFilter.id, name: formFilterName.trim(), filterData },
        {
          onSuccess: () => {
            setDialogOpen(false);
            setActiveFilterId(editingFilter.id);
            onLoadFilter(filterData);
          },
        }
      );
    } else {
      // Create new filter
      saveFilter(
        { name: formFilterName.trim(), filterData },
        {
          onSuccess: (data) => {
            setDialogOpen(false);
            // The newly created filter will be at the top of the list
            onLoadFilter(filterData);
          },
        }
      );
    }
  };

  const handleDeleteFilter = (e: React.MouseEvent, filterId: string) => {
    e.stopPropagation();
    deleteFilter(filterId);
    if (activeFilterId === filterId) {
      setActiveFilterId(null);
      onClearFilter?.();
    }
  };

  const toggleCompanyExclusion = (companyId: string) => {
    setFormExcludedIds(prev =>
      prev.includes(companyId)
        ? prev.filter(id => id !== companyId)
        : [...prev, companyId]
    );
  };

  const handleClearAllExclusions = () => {
    setFormExcludedIds([]);
  };

  // Check if there are active filters applied
  const hasActiveFilters =
    currentFilters.searchQuery ||
    (currentFilters.excludedCompanyIds && currentFilters.excludedCompanyIds.length > 0) ||
    currentFilters.showAtRisk ||
    (currentFilters.subscriptionTier && currentFilters.subscriptionTier !== 'all');

  return (
    <>
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant={activeFilter || hasActiveFilters ? "default" : "outline"}
            size="sm"
            className={cn(
              "gap-2 pr-2",
              (activeFilter || hasActiveFilters) && "bg-primary text-primary-foreground"
            )}
          >
            <Filter className="h-3.5 w-3.5" />
            <span className="max-w-[150px] truncate">
              {activeFilter ? activeFilter.name : 'Filters'}
            </span>
            {hasActiveFilters && !activeFilter && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs bg-primary-foreground/20">
                {(currentFilters.excludedCompanyIds?.length || 0) + (currentFilters.showAtRisk ? 1 : 0) + (currentFilters.searchQuery ? 1 : 0) + (currentFilters.subscriptionTier && currentFilters.subscriptionTier !== 'all' ? 1 : 0)}
              </Badge>
            )}
            <ChevronDown className={cn(
              "h-4 w-4 transition-transform ml-1",
              dropdownOpen && "rotate-180"
            )} />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent 
          align="start" 
          className="w-[220px] bg-popover border shadow-md"
        >
          {/* No Filter option */}
          <DropdownMenuItem
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => {
              setActiveFilterId(null);
              onClearFilter?.();
              setDropdownOpen(false);
            }}
          >
            <X className={cn(
              "h-3.5 w-3.5 flex-shrink-0",
              !activeFilterId ? "text-primary" : "text-muted-foreground"
            )} />
            <span className={cn(!activeFilterId && "font-medium")}>No Filter</span>
          </DropdownMenuItem>
          
          {savedFilters.length > 0 && <DropdownMenuSeparator />}
          
          {savedFilters.map((filter) => (
            <DropdownMenuItem
              key={filter.id}
              className="flex items-center justify-between cursor-pointer group"
              onClick={() => handleSelectFilter(filter)}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Filter className={cn(
                  "h-3.5 w-3.5 flex-shrink-0",
                  activeFilterId === filter.id ? "text-primary" : "text-muted-foreground"
                )} />
                <span className={cn(
                  "truncate",
                  activeFilterId === filter.id && "font-medium"
                )}>{filter.name}</span>
              </div>
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Edit filter"
                  className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-muted"
                  onClick={(e) => handleEditFilter(e, filter)}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Delete filter"
                  className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-destructive hover:text-destructive-foreground"
                  onClick={(e) => handleDeleteFilter(e, filter.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </DropdownMenuItem>
          ))}
          
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={handleNewFilter}
          >
            <Plus className="h-3.5 w-3.5 mr-2" />
            New Filter
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit/Create Filter Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingFilter ? 'Edit Filter' : 'New Filter'}</DialogTitle>
            <DialogDescription>
              {editingFilter 
                ? 'Update your filter settings and apply changes.'
                : 'Create a new filter to quickly filter companies.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Filter Name */}
            <div className="space-y-2">
              <Label htmlFor="filter-name">Filter Name</Label>
              <Input
                id="filter-name"
                placeholder="e.g., At Risk Companies, Active Trials"
                value={formFilterName}
                onChange={(e) => setFormFilterName(e.target.value)}
              />
            </div>

            {/* Search Query */}
            <div className="space-y-2">
              <Label htmlFor="search-query">Search Query</Label>
              <Input
                id="search-query"
                placeholder="Search by company name..."
                value={formSearchQuery}
                onChange={(e) => setFormSearchQuery(e.target.value)}
              />
            </div>

            {/* At Risk Toggle */}
            <div className="flex items-center justify-between">
              <Label htmlFor="at-risk-toggle" className="flex flex-col gap-1">
                <span>Show At Risk Only</span>
                <span className="text-xs text-muted-foreground font-normal">
                  Companies with no login in 7+ days
                </span>
              </Label>
              <Switch
                id="at-risk-toggle"
                checked={formShowAtRisk}
                onCheckedChange={setFormShowAtRisk}
              />
            </div>

            {/* Company Exclusions */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Exclude Companies</Label>
                {formExcludedIds.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto py-1 px-2 text-xs"
                    onClick={handleClearAllExclusions}
                  >
                    Clear all
                  </Button>
                )}
              </div>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search companies..."
                  value={companySearch}
                  onChange={(e) => setCompanySearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <ScrollArea className="h-[200px] border rounded-md">
                <div className="p-2 space-y-1">
                  {filteredCompanies.map((company) => (
                    <div
                      key={company.id}
                      className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                      onClick={() => toggleCompanyExclusion(company.id)}
                    >
                      <Checkbox
                        checked={formExcludedIds.includes(company.id)}
                        className="pointer-events-none"
                      />
                      <span className="text-sm truncate">{company.name}</span>
                    </div>
                  ))}
                  {filteredCompanies.length === 0 && (
                    <div className="text-sm text-muted-foreground text-center py-4">
                      No companies found
                    </div>
                  )}
                </div>
              </ScrollArea>
              
              {formExcludedIds.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {formExcludedIds.length} company{formExcludedIds.length !== 1 ? 'ies' : ''} excluded
                </p>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveFilter}
              disabled={!formFilterName.trim() || isSaving}
            >
              {isSaving ? 'Saving...' : editingFilter ? 'Update & Apply' : 'Create & Apply'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
