
import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Eye, EyeOff } from 'lucide-react';
import { VotesRemainingIndicator } from '@/components/voting/VotesRemainingIndicator';

interface IssuesControlsProps {
  isMeetingContext: boolean;
  showSolved: boolean;
  onShowSolvedChange: (show: boolean) => void;
  solvedIssuesCount: number;
  sortBy:
    | 'newest'
    | 'oldest'
    | 'title-asc'
    | 'title-desc'
    | 'votes-desc'
    | 'votes-asc'
    | 'custom-order';
  onSortChange: (
    sort:
      | 'newest'
      | 'oldest'
      | 'title-asc'
      | 'title-desc'
      | 'votes-desc'
      | 'votes-asc'
      | 'custom-order'
  ) => void;
  teamId: string;
  showVotingOptions?: boolean;
  activeCount?: number;
  onOpenVotingSettings?: () => void;
  // Issue type selection
  selectedIssueType?: 'short_term' | 'long_term' | 'all';
  onIssueTypeChange?: (type: 'short_term' | 'long_term' | 'all') => void;
  showAllOption?: boolean;
  shortTermCount?: number;
  longTermCount?: number;
}

export const IssuesControls: React.FC<IssuesControlsProps> = ({
  isMeetingContext,
  showSolved,
  onShowSolvedChange,
  solvedIssuesCount,
  sortBy,
  onSortChange,
  teamId,
  showVotingOptions = false,
  onOpenVotingSettings,
  selectedIssueType,
  onIssueTypeChange,
  showAllOption = false,
  shortTermCount = 0,
  longTermCount = 0,
}) => {
  // Only render in meeting context - for Issues page, controls are rendered inline with tabs
  if (!isMeetingContext) {
    return null;
  }

  return (
    <div className="flex items-center justify-between gap-3">
      {/* Voting Indicator - First */}
      {showVotingOptions && (
        <VotesRemainingIndicator
          teamId={teamId}
          onOpenSettings={onOpenVotingSettings}
        />
      )}

      {/* Issue Type Toggle - Middle */}
      {selectedIssueType && onIssueTypeChange && (
        <ToggleGroup
          type="single"
          value={selectedIssueType}
          onValueChange={(value) => value && onIssueTypeChange(value as 'short_term' | 'long_term' | 'all')}
          className="gap-1"
        >
          {showAllOption && (
            <ToggleGroupItem value="all" size="sm" className="text-xs px-3">
              All
            </ToggleGroupItem>
          )}
          <ToggleGroupItem value="short_term" size="sm" className="text-xs px-3">
            Short ({shortTermCount})
          </ToggleGroupItem>
          <ToggleGroupItem value="long_term" size="sm" className="text-xs px-3">
            Long ({longTermCount})
          </ToggleGroupItem>
        </ToggleGroup>
      )}

      <div className="flex items-center gap-2 ml-auto">
        {/* Show/Hide Archived Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onShowSolvedChange(!showSolved)}
          className={`flex items-center gap-1.5 px-2 text-muted-foreground hover:text-foreground ${
            showSolved ? 'text-foreground' : ''
          }`}
          aria-label={showSolved ? 'Hide archived issues' : 'Show archived issues'}
          aria-pressed={showSolved}
        >
          {showSolved ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          Archived
          {solvedIssuesCount > 0 && (
            <span className="text-xs">({solvedIssuesCount})</span>
          )}
        </Button>

        {/* Sort Dropdown */}
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className="w-[120px] h-8 border-border text-muted-foreground text-sm">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="oldest">Oldest</SelectItem>
            <SelectItem value="title-asc">A to Z</SelectItem>
            <SelectItem value="title-desc">Z to A</SelectItem>
            {showVotingOptions && (
              <>
                <SelectItem value="votes-desc">Most Votes</SelectItem>
                <SelectItem value="votes-asc">Least Votes</SelectItem>
              </>
            )}
            <SelectItem value="custom-order">Custom Order</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
