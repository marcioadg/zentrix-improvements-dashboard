import React from 'react';
import { Check, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface Company {
  id: string;
  name: string;
}

interface AnalyticsCompanyFilterDropdownProps {
  companies: Company[];
  excludedCompanyIds: string[];
  onFilterChange: (excludedIds: string[]) => void;
  isLoading?: boolean;
  isUpdating?: boolean;
}

export const AnalyticsCompanyFilterDropdown: React.FC<AnalyticsCompanyFilterDropdownProps> = ({
  companies,
  excludedCompanyIds,
  onFilterChange,
  isLoading,
  isUpdating,
}) => {
  const includedCount = companies.length - excludedCompanyIds.length;
  const hasExclusions = excludedCompanyIds.length > 0;

  const handleToggleCompany = (companyId: string) => {
    if (excludedCompanyIds.includes(companyId)) {
      onFilterChange(excludedCompanyIds.filter(id => id !== companyId));
    } else {
      onFilterChange([...excludedCompanyIds, companyId]);
    }
  };

  const handleSelectAll = () => {
    onFilterChange([]);
  };

  const handleDeselectAll = () => {
    onFilterChange(companies.map(c => c.id));
  };

  if (isLoading) {
    return <Skeleton className="h-9 w-24" />;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2"
          disabled={isUpdating}
        >
          <Filter className="h-4 w-4" />
          Filter
          {hasExclusions && (
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
              {includedCount}/{companies.length}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 max-h-80 overflow-y-auto">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Companies to Include</span>
          <div className="flex gap-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 px-2 text-xs"
              onClick={handleSelectAll}
            >
              All
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 px-2 text-xs"
              onClick={handleDeselectAll}
            >
              None
            </Button>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {companies.map((company) => (
          <DropdownMenuCheckboxItem
            key={company.id}
            checked={!excludedCompanyIds.includes(company.id)}
            onCheckedChange={() => handleToggleCompany(company.id)}
          >
            {company.name}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
