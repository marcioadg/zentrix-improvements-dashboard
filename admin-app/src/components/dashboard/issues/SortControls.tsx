
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowUpDown } from 'lucide-react';

export type SortOption = 'newest' | 'oldest' | 'title-asc' | 'title-desc' | 'votes-desc' | 'votes-asc';

interface SortControlsProps {
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  showVotingOptions?: boolean;
}

export const SortControls: React.FC<SortControlsProps> = ({
  sortBy,
  onSortChange,
  showVotingOptions = false,
}) => {
  return (
    <div className="flex items-center gap-2">
      <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
      <Select value={sortBy} onValueChange={(value) => onSortChange(value as SortOption)}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">Newest First</SelectItem>
          <SelectItem value="oldest">Oldest First</SelectItem>
          <SelectItem value="title-asc">Title (A to Z)</SelectItem>
          <SelectItem value="title-desc">Title (Z to A)</SelectItem>
          {showVotingOptions && (
            <>
              <SelectItem value="votes-desc">Votes (High to Low)</SelectItem>
              <SelectItem value="votes-asc">Votes (Low to High)</SelectItem>
            </>
          )}
        </SelectContent>
      </Select>
    </div>
  );
};
