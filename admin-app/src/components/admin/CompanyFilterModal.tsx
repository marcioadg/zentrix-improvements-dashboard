import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CompanyFilterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companies: Array<{ id: string; name: string }>;
  excludedCompanyIds: string[];
  onSave: (excludedIds: string[]) => void;
}

export const CompanyFilterModal = ({
  open,
  onOpenChange,
  companies,
  excludedCompanyIds,
  onSave,
}: CompanyFilterModalProps) => {
  const [localExcluded, setLocalExcluded] = useState<string[]>(excludedCompanyIds);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setLocalExcluded(excludedCompanyIds);
  }, [excludedCompanyIds, open]);

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleCompany = (companyId: string) => {
    setLocalExcluded(prev =>
      prev.includes(companyId)
        ? prev.filter(id => id !== companyId)
        : [...prev, companyId]
    );
  };

  const handleSave = () => {
    onSave(localExcluded);
    onOpenChange(false);
  };

  const handleClearAll = () => {
    setLocalExcluded([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Filter Companies</DialogTitle>
          <DialogDescription>
            Select companies to exclude from the Overview tab
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search companies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Company List */}
          <ScrollArea className="h-[300px] border rounded-md p-4">
            <div className="space-y-3">
              {filteredCompanies.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No companies found
                </p>
              ) : (
                filteredCompanies.map((company) => (
                  <div
                    key={company.id}
                    className="flex items-center space-x-3 hover:bg-accent/50 p-2 rounded-md cursor-pointer"
                    onClick={() => toggleCompany(company.id)}
                  >
                    <Checkbox
                      checked={localExcluded.includes(company.id)}
                      onCheckedChange={() => toggleCompany(company.id)}
                    />
                    <label className="flex-1 cursor-pointer text-sm font-medium">
                      {company.name}
                    </label>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Stats */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{localExcluded.length} companies excluded</span>
            {localExcluded.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="h-auto p-0 text-sm"
              >
                <X className="h-3 w-3 mr-1" />
                Clear all
              </Button>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Filters
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
