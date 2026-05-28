
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, Search, X } from 'lucide-react';

interface AnalyzerFiltersProps {
  showTheBar: boolean;
  setShowTheBar: (show: boolean) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  actionButton?: React.ReactNode;
}

export const AnalyzerFilters: React.FC<AnalyzerFiltersProps> = ({
  showTheBar,
  setShowTheBar,
  searchTerm,
  setSearchTerm,
  actionButton,
}) => {
  const handleClearSearch = () => {
    setSearchTerm('');
  };

  return (
    <div className="border-b border-border/40 pb-3 mb-6">
      <div className="flex items-center justify-between gap-4">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
          <Input
            placeholder="Search people..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-10 border-border/40 bg-transparent placeholder:text-muted-foreground/60"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearSearch}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted/40 rounded-full"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Optional Action Button (e.g., Send Reminder) */}
          {actionButton}

          {/* Show/Hide Bar Toggle */}
          <Button
            variant={showTheBar ? "default" : "ghost"}
            size="sm"
            onClick={() => setShowTheBar(!showTheBar)}
            className="flex items-center gap-2"
          >
            {showTheBar ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            <span className="text-sm">{showTheBar ? 'Hide' : 'Show'} The Bar</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
