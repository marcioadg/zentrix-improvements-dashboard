import React, { useMemo, useState, useEffect } from 'react';
import { IssuesSection } from '@/components/dashboard/IssuesSection';
import { useCompanyData } from '@/hooks/useCompanyData';
import { useSimplifiedIssues } from '@/hooks/useSimplifiedIssues';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { IssuesLoadingSkeleton } from '@/components/issues/IssuesPageSkeleton';
import { EmptyMetricsState } from '@/components/dashboard/EmptyMetricsState';
import { VersionBanner } from '@/components/ui/VersionBanner';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';
import { safeStorage } from '@/utils/safeStorage';

const IssuesPageContent = () => {
  const [showSolved, setShowSolved] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title-asc' | 'title-desc' | 'votes-desc' | 'votes-asc' | 'custom-order'>(() => {
    const saved = safeStorage.getItem(`issues-sort-default`);
    return (saved as any) || 'custom-order';
  });
  const { teams, loading: teamsLoading } = useCompanyData();
  const {
    issueCounts,
    selectedTeamId,
    selectedIssueType,
    loading: issuesLoading,
    selectTeam,
    setSelectedIssueType
  } = useSimplifiedIssues({ teams });

  // Persist sortBy to localStorage
  useEffect(() => {
    safeStorage.setItem(`issues-sort-default`, sortBy);
  }, [sortBy]);

  // Memoize team options to prevent re-renders
  const teamOptions = useMemo(() => {
    return teams.map((team) => {
      const teamCount = issueCounts.find(tc => tc.id === team.id);
      const totalCount = (teamCount?.shortTermCount || 0) + (teamCount?.longTermCount || 0);
      return {
        id: team.id,
        name: team.name,
        totalCount,
        label: `${team.name} (${totalCount})`
      };
    });
  }, [teams, issueCounts]);

  // Memoize current team data
  const currentTeam = useMemo(() => 
    issueCounts.find(team => team.id === selectedTeamId),
    [issueCounts, selectedTeamId]
  );

  const loading = teamsLoading || issuesLoading;

  // Show loading state while teams or issue counts are loading
  if (loading) {
    return <IssuesLoadingSkeleton />;
  }

  if (teams.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-[20px] font-semibold text-foreground tracking-tight">Issues</h1>
          </div>
          <EmptyMetricsState message="No teams available. You need to be assigned to a team to track issues." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <VersionBanner />
      
      <div className="px-6">
        {/* Sticky header section */}
        <div className="sticky top-14 z-10 bg-background -mx-6 px-6 pt-6">
          {/* Title */}
          <div className="mb-3">
            <h1 className="text-[20px] font-semibold text-foreground tracking-tight">Issues</h1>
            <p className="text-[13px] text-muted-foreground mt-0.5">Track and resolve team issues</p>
          </div>

          {/* Controls row */}
          <div className="flex items-center gap-3 mb-4">
            <Select value={selectedTeamId} onValueChange={selectTeam}>
              <SelectTrigger className="w-[200px] h-8 text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {teamOptions.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setSelectedIssueType('short_term')}
                className={`px-3 py-1 rounded-[4px] text-[13px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
                  selectedIssueType === 'short_term'
                    ? 'bg-[var(--active)] text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                Short-term
                <span className="ml-1.5 text-[11px]">({currentTeam?.shortTermCount || 0})</span>
              </button>
              <button
                onClick={() => setSelectedIssueType('long_term')}
                className={`px-3 py-1 rounded-[4px] text-[13px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
                  selectedIssueType === 'long_term'
                    ? 'bg-[var(--active)] text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                Long-term
                <span className="ml-1.5 text-[11px]">({currentTeam?.longTermCount || 0})</span>
              </button>
            </div>

            <div className="flex-1" />

            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-[130px] h-8 text-[13px] border-border text-muted-foreground">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
                <SelectItem value="votes-desc">Most Votes</SelectItem>
                <SelectItem value="votes-asc">Least Votes</SelectItem>
                <SelectItem value="title-asc">A to Z</SelectItem>
                <SelectItem value="title-desc">Z to A</SelectItem>
                <SelectItem value="custom-order">Custom Order</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSolved(!showSolved)}
              className={`flex items-center gap-2 text-[13px] text-muted-foreground hover:text-foreground ${
                showSolved ? 'text-foreground' : ''
              }`}
            >
              {showSolved ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showSolved ? 'Hide' : 'Show'} Archived
            </Button>
          </div>
        </div>

        {/* Content */}
        {selectedTeamId ? (
          <IssuesSection 
            teamId={selectedTeamId}
            issueType={selectedIssueType}
            showTeamSelector={false}
            isMeetingContext={false}
            issueCounts={issueCounts}
            showSolved={showSolved}
            onShowSolvedChange={setShowSolved}
            sortBy={sortBy}
            onSortChange={setSortBy}
          />
        ) : (
          <div className="py-24 text-center">
            <p className="text-[13px] text-muted-foreground">Loading team data...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export const Issues = () => {
  return (
    <ErrorBoundary>
      <IssuesPageContent />
    </ErrorBoundary>
  );
};

export default Issues;