import React, { useState, useEffect, useRef, useCallback } from 'react';
import { IssuesList } from '@/components/dashboard/issues/IssuesList';
import { supabase, dataClient } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Clock, Plus } from 'lucide-react';
import { useVoteBroadcast } from '@/hooks/meeting/useVoteBroadcast';
import { useIssueMetricsBroadcast } from '@/hooks/meeting/useIssueMetricsBroadcast';
import { logger } from '@/utils/logger';

interface IssueCount {
  id: string;
  name: string;
  shortTermCount: number;
  longTermCount: number;
  totalCount: number;
}
interface IssuesSectionProps {
  meetingId?: string;
  teamId: string;
  issueType?: 'short_term' | 'long_term'; // undefined means show all types
  showTeamSelector?: boolean;
  isMeetingContext?: boolean;
  onIssueSolved?: (issueTitle?: string, issueDescription?: string, issueId?: string) => void;
  onCreateTaskFromIssue?: (issueData: {
    title: string;
    description: string;
    sourceIssueId?: string;
    ownerId?: string;
  }) => void;
  issueCounts?: IssueCount[];
  onTaskCreated?: () => void;
  liveSectionDuration?: number;
  onUpdateIssueReady?: (updateIssue: (issueId: string, updates: any) => Promise<void>) => void;
  // New props for Issues page controls
  showSolved?: boolean;
  onShowSolvedChange?: (show: boolean) => void;
  sortBy?:
    | 'newest'
    | 'oldest'
    | 'title-asc'
    | 'title-desc'
    | 'votes-desc'
    | 'votes-asc'
    | 'custom-order';
  onSortChange?: (
    sort:
      | 'newest'
      | 'oldest'
      | 'title-asc'
      | 'title-desc'
      | 'votes-desc'
      | 'votes-asc'
      | 'custom-order'
  ) => void;
  // Issue type selection (meeting context)
  selectedIssueType?: 'short_term' | 'long_term' | 'all';
  onIssueTypeChange?: (type: 'short_term' | 'long_term' | 'all') => void;
  showAllIssueTypeOption?: boolean;
  shortTermCount?: number;
  longTermCount?: number;
  // New prop for registering optimistic update callback
  onRegisterTaskCallback?: (callback: () => void) => void;
  // Issue creation broadcast props
  onIssueCreated?: (issue: any) => void;
  onAddIssueToLocalStateReady?: (addFn: (issue: any) => void) => void;
  // Issue status broadcast props
  onIssueStatusChanged?: (issueId: string, status: string) => void;
  onUpdateIssueLocalStateReady?: (updateFn: (issueId: string, status: string) => void) => void;
  // Issue archive broadcast props
  onIssueArchivedChanged?: (issueId: string, archived: boolean) => void;
  onUpdateIssueArchiveLocalStateReady?: (updateFn: (issueId: string, archived: boolean) => void) => void;
  // Render slot for trigger under title (used by Annual meeting for Problem Solving Process toggle)
  renderAfterStats?: React.ReactNode;
  // Render slot for expanded content below header row (used by Annual meeting for Problem Solving Process blocks)
  renderExpandedContent?: React.ReactNode;
}
export const IssuesSection: React.FC<IssuesSectionProps> = ({
  meetingId,
  teamId,
  issueType,
  showTeamSelector = true,
  isMeetingContext = false,
  onIssueSolved,
  onCreateTaskFromIssue,
  issueCounts = [],
  onTaskCreated,
  liveSectionDuration = 0,
  onUpdateIssueReady,
  // New props for Issues page controls
  showSolved: externalShowSolved,
  onShowSolvedChange: externalOnShowSolvedChange,
  sortBy: externalSortBy,
  onSortChange: externalOnSortChange,
  // Issue type selection
  selectedIssueType,
  onIssueTypeChange,
  showAllIssueTypeOption = false,
  shortTermCount = 0,
  longTermCount = 0,
  // New prop for registering optimistic update callback
  onRegisterTaskCallback,
  // Issue creation broadcast props
  onIssueCreated,
  onAddIssueToLocalStateReady,
  // Issue status broadcast props
  onIssueStatusChanged,
  onUpdateIssueLocalStateReady,
  // Issue archive broadcast props
  onIssueArchivedChanged,
  onUpdateIssueArchiveLocalStateReady,
  // Render slot for trigger under title
  renderAfterStats,
  // Render slot for expanded content
  renderExpandedContent,
}) => {
  // Track remote vote counts from broadcast
  const [remoteVoteCounts, setRemoteVoteCounts] = useState<Record<string, number>>({});
  
  // Track which issues have had tasks created during this session (for solve confirmation)
  const [issuesWithTasks, setIssuesWithTasks] = useState<Set<string>>(new Set());

  // Handle remote vote updates from broadcast
  const handleRemoteVote = useCallback((issueId: string, newVoteCount: number) => {
    setRemoteVoteCounts(prev => ({
      ...prev,
      [issueId]: newVoteCount
    }));
  }, []);

  // Clear remote vote count when user votes locally to prevent stale data from being reapplied
  const handleClearRemoteVoteCount = useCallback((issueId: string) => {
    setRemoteVoteCounts(prev => {
      const next = { ...prev };
      delete next[issueId];
      return next;
    });
  }, []);

  // Initialize vote broadcast (only in meeting context)
  const { publishVote } = useVoteBroadcast(
    isMeetingContext ? teamId : null,
    handleRemoteVote
  );

  // Handle remote issue metrics updates from broadcast
  const handleRemoteMetricsUpdate = useCallback((metrics: { issuesSolved: number; tasksCreated: number }) => {
    logger.log('📡 IssuesSection: Received remote metrics update:', metrics);
    setIssueMetrics(prev => ({
      ...prev,
      issuesSolved: metrics.issuesSolved,
      tasksCreated: metrics.tasksCreated
    }));
  }, []);

  // Initialize issue metrics broadcast (only in meeting context)
  const { publishMetricsUpdate } = useIssueMetricsBroadcast(
    isMeetingContext ? teamId : null,
    isMeetingContext ? meetingId || null : null,
    handleRemoteMetricsUpdate
  );

  // Callback to publish vote to other participants
  const handleVoteCast = useCallback((issueId: string, voteValue: number, newVoteCount: number) => {
    logger.log('📤 IssuesSection: Broadcasting vote', { issueId, voteValue, newVoteCount });
    publishVote(issueId, voteValue, newVoteCount);
  }, [publishVote]);

  const [issueMetrics, setIssueMetrics] = useState<{
    issuesSolved: number;
    averageTimePerIssue: number;
    issueSessionTime: number;
    tasksCreated: number;
  }>({
    issuesSolved: 0,
    averageTimePerIssue: 0,
    issueSessionTime: 0,
    tasksCreated: 0
  });

  // Ref to track recent optimistic updates and prevent double-counting
  const recentOptimisticUpdatesRef = useRef<Set<number>>(new Set());

  // Optimistic update for tasks created with debouncing and broadcast
  const handleOptimisticTaskUpdate = useCallback(() => {
    const now = Date.now();
    
    // Skip if we already updated within the last 100ms (debounce)
    if (recentOptimisticUpdatesRef.current.has(Math.floor(now / 100))) {
      logger.log('⏭️ Skipping duplicate optimistic update (debounced)');
      return;
    }
    
    recentOptimisticUpdatesRef.current.add(Math.floor(now / 100));
    
    // Clear old entries after 200ms
    setTimeout(() => {
      recentOptimisticUpdatesRef.current.delete(Math.floor(now / 100));
    }, 200);
    
    logger.log('🚀 Optimistically updating tasks created count');
    setIssueMetrics(prev => {
      const newTasksCount = prev.tasksCreated + 1;
      // Broadcast the new metrics to other participants
      publishMetricsUpdate(prev.issuesSolved, newTasksCount);
      return {
        ...prev,
        tasksCreated: newTasksCount
      };
    });
  }, [publishMetricsUpdate]);

  // Optimistic update for issues solved with broadcast
  const handleOptimisticIssueUpdate = useCallback(() => {
    logger.log('🚀 Optimistically updating issues solved count');
    setIssueMetrics(prev => {
      const newIssuesSolved = prev.issuesSolved + 1;
      // Broadcast the new metrics to other participants
      publishMetricsUpdate(newIssuesSolved, prev.tasksCreated);
      return {
        ...prev,
        issuesSolved: newIssuesSolved
      };
    });
  }, [publishMetricsUpdate]);

  // Register the optimistic update callback when component mounts in meeting context
  useEffect(() => {
    if (isMeetingContext && onRegisterTaskCallback) {
      logger.log('📝 IssuesSection: Registering optimistic task update callback');
      onRegisterTaskCallback(handleOptimisticTaskUpdate);
    }
  }, [isMeetingContext, onRegisterTaskCallback]);

  // Fetch issue metrics for meeting context with real-time updates
  useEffect(() => {
    const fetchIssueMetrics = async () => {
      if (!isMeetingContext || !meetingId) return;
      try {
        // First, check if this is a member meeting
        const { data: meetingData } = await supabase
          .from('meetings_state')
          .select('audience_type, team_id, company_id')
          .eq('id', meetingId)
          .single();
        
        const isMemberMeeting = meetingData?.audience_type === 'members' && meetingData?.team_id === null;
        
        logger.log('📊 IssuesSection: Fetching meeting results', {
          meetingId,
          isMemberMeeting,
          audienceType: meetingData?.audience_type,
          teamId: meetingData?.team_id,
          companyId: meetingData?.company_id
        });
        
        // Build query based on meeting type
        let query = supabase
          .from('meeting_results')
          .select('issues_resolved, tasks_created, section_durations')
          .eq('meeting_id', meetingId);
        
        // For member meetings, filter by NULL team_id and company_id
        if (isMemberMeeting) {
          query = query
            .is('team_id', null)
            .eq('company_id', meetingData?.company_id);
        }
        
        const { data: meetingResults, error: resultsError } = await query.maybeSingle();
        
        if (resultsError) {
          logger.error('Error fetching meeting results:', resultsError);
          return;
        }
        if (!meetingResults) return;
         const issuesResolved = meetingResults.issues_resolved as any[] || [];
         const tasksCreated = meetingResults.tasks_created as any[] || [];
         const sectionDurations = meetingResults.section_durations as Record<string, number> || {};

         logger.log('📊 IssuesSection: Meeting results data:', {
           issuesResolved: issuesResolved.length,
           tasksCreated: tasksCreated.length,
           sectionDurations,
           meetingResults,
           isMemberMeeting
         });

         // For Tesla meetings, section 5 is "Issues"
         const issueSessionMs = sectionDurations['5'] || 0;
         const issueSessionMinutes = Math.round(issueSessionMs / (1000 * 60));
         const averageTime = issuesResolved.length > 0 ? Math.round(issueSessionMinutes / issuesResolved.length) : 0;
        setIssueMetrics({
          issuesSolved: issuesResolved.length,
          averageTimePerIssue: averageTime,
          issueSessionTime: issueSessionMinutes,
          tasksCreated: tasksCreated.length
        });
      } catch (error) {
        logger.error('Error fetching issue metrics:', error);
      }
    };

    // Initial fetch
    fetchIssueMetrics();

    // Set up real-time subscription for meeting_results updates
    if (!isMeetingContext || !meetingId) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;
    let metricsDebounceTimer: ReturnType<typeof setTimeout> | null = null;
    
    const setupSubscription = async () => {
      const channelName = `meeting-results-${meetingId}`;
      logger.log('📡 IssuesSection: Setting up scoped subscription channel:', channelName);
      
      channel = supabase
        .channel(channelName)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'meeting_results',
          filter: `meeting_id=eq.${meetingId}`
        }, payload => {
          logger.log('📊 Real-time meeting results update (debounced):', payload);
          if (metricsDebounceTimer) clearTimeout(metricsDebounceTimer);
          metricsDebounceTimer = setTimeout(() => fetchIssueMetrics(), 2000);
        })
        .subscribe();
    };
    
    setupSubscription();

    return () => {
      if (metricsDebounceTimer) clearTimeout(metricsDebounceTimer);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [meetingId, isMeetingContext]);

  // Wrapper for onCreateTaskFromIssue that includes optimistic updates
  const handleCreateTaskFromIssue = async (issueData: {
    title: string;
    description: string;
    sourceIssueId?: string;
    ownerId?: string;
  }) => {
    // Optimistically update immediately for instant feedback
    handleOptimisticTaskUpdate();
    
    // Track that a task was created from this issue (for solve confirmation)
    if (issueData.sourceIssueId) {
      setIssuesWithTasks(prev => new Set(prev).add(issueData.sourceIssueId!));
    }

    // Call the original callback if provided
    if (onCreateTaskFromIssue) {
      try {
        await onCreateTaskFromIssue(issueData);
        logger.log('✅ Task created successfully, issue was already marked as solved');
      } catch (error) {
        logger.error('❌ Task creation failed, reverting optimistic updates');
        
        // Revert the task creation optimistic update
        setIssueMetrics(prev => ({
          ...prev,
          tasksCreated: Math.max(0, prev.tasksCreated - 1)
        }));

        // If we optimistically solved an issue, revert that too
        if (issueData.sourceIssueId && onIssueSolved) {
          logger.log('🔄 Reverting issue solved status due to task creation failure');
          
          // Revert the issue solved counter
          setIssueMetrics(prev => ({
            ...prev,
            issuesSolved: Math.max(0, prev.issuesSolved - 1)
          }));

          // Note: The issue status revert will be handled by Meeting.tsx's updateIssue
          // We just need to revert the counter here
        }
        
        throw error;
      }
    }
  };

  // Wrapper for onIssueSolved that includes optimistic updates
  const handleIssueSolved = async (issueTitle?: string, issueDescription?: string, issueId?: string) => {
    logger.log('🚀 IssuesSection: handleIssueSolved called with optimistic update', {
      issueTitle,
      issueId
    });

    // Optimistically update the UI immediately
    handleOptimisticIssueUpdate();

    // Call the original callback if provided
    if (onIssueSolved) {
      try {
        logger.log('🚀 IssuesSection: Calling original onIssueSolved...');
        await onIssueSolved(issueTitle, issueDescription, issueId);
        logger.log('✅ Issue solved successfully, optimistic update was correct');
      } catch (error) {
        logger.error('❌ Issue solving failed, reverting optimistic update');
        // Revert the optimistic update if the actual operation failed
        setIssueMetrics(prev => ({
          ...prev,
          issuesSolved: Math.max(0, prev.issuesSolved - 1)
        }));
        throw error;
      }
    } else {
      logger.log('⚠️ IssuesSection: No onIssueSolved callback provided');
    }
  };

  // For meeting context, render metrics and issues list
  if (isMeetingContext) {
    return <div className="h-full flex flex-col space-y-3">
        {/* Header and Issue Metrics in one row */}
        <div className="flex items-center justify-between gap-4 flex-shrink-0">
          {/* LEFT: Header with optional dropdown below */}
          <div className="flex flex-col items-start">
            <h2 className="text-[20px] font-semibold text-foreground whitespace-nowrap">
              Issues Discussion
            </h2>
            {/* Optional dropdown trigger centered under title */}
            {renderAfterStats && (
              <div className="w-full flex justify-center">
                {renderAfterStats}
              </div>
            )}
          </div>
          
          {/* RIGHT: Metrics */}
          <div className="grid grid-cols-3 gap-2 flex-1">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 px-4">
                <CardTitle className="text-[13px] font-medium">Issues Solved</CardTitle>
              </CardHeader>
              <CardContent className="pb-2 pt-0 px-4">
                <div className="text-xl font-bold">{issueMetrics.issuesSolved}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 px-4">
                <CardTitle className="text-[13px] font-medium">Average Time per Issue</CardTitle>
              </CardHeader>
              <CardContent className="pb-2 pt-0 px-4">
                <div className="text-xl font-bold">
                  {(() => {
                    // Calculate average using LIVE session duration / issues solved in THIS meeting
                    if (issueMetrics.issuesSolved === 0) return '-';
                    // Convert live duration from milliseconds to minutes, using floor to avoid rounding up
                    const liveDurationMinutes = Math.floor((liveSectionDuration || 0) / (1000 * 60));
                    // Don't show average if no time has passed yet
                    if (liveDurationMinutes === 0) return '-';
                    const rawAverage = liveDurationMinutes / issueMetrics.issuesSolved;
                    const roundedAverage = Math.round(rawAverage);
                    return `${roundedAverage}m`;
                  })()}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 px-4">
                <CardTitle className="text-[13px] font-medium">Tasks Created</CardTitle>
              </CardHeader>
              <CardContent className="pb-2 pt-0 px-4">
                <div className="text-xl font-bold">{issueMetrics.tasksCreated}</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Optional expanded content (e.g., Problem Solving Process blocks for Annual meeting) */}
        {renderExpandedContent}

        <div className="flex-1 min-h-0">
          <IssuesList
            teamId={teamId}
            issueType={issueType}
            showTeamSelector={showTeamSelector}
            isMeetingContext={isMeetingContext}
            onIssueSolved={handleIssueSolved}
            onCreateTaskFromIssue={handleCreateTaskFromIssue}
            onUpdateIssueReady={onUpdateIssueReady}
            showSolved={externalShowSolved}
            onShowSolvedChange={externalOnShowSolvedChange}
            sortBy={externalSortBy}
            onSortChange={externalOnSortChange}
            selectedIssueType={selectedIssueType}
            onIssueTypeChange={onIssueTypeChange}
            showAllIssueTypeOption={showAllIssueTypeOption}
            shortTermCount={shortTermCount}
            longTermCount={longTermCount}
            onVoteCast={handleVoteCast}
            remoteVoteCounts={remoteVoteCounts}
            onClearRemoteVoteCount={handleClearRemoteVoteCount}
            onIssueCreated={onIssueCreated}
            onAddIssueToLocalStateReady={onAddIssueToLocalStateReady}
            onIssueStatusChanged={onIssueStatusChanged}
            onUpdateIssueLocalStateReady={onUpdateIssueLocalStateReady}
            onIssueArchivedChanged={onIssueArchivedChanged}
            onUpdateIssueArchiveLocalStateReady={onUpdateIssueArchiveLocalStateReady}
            issuesWithTasks={issuesWithTasks}
          />
        </div>
      </div>;
  }

  // For non-meeting context (like Issues page), render the list directly
  return <IssuesList 
    teamId={teamId} 
    issueType={issueType || 'short_term'} 
    showTeamSelector={showTeamSelector} 
    isMeetingContext={isMeetingContext} 
    onIssueSolved={handleIssueSolved} 
    onCreateTaskFromIssue={handleCreateTaskFromIssue} 
    onUpdateIssueReady={onUpdateIssueReady}
    showSolved={externalShowSolved}
    onShowSolvedChange={externalOnShowSolvedChange}
    sortBy={externalSortBy}
    onSortChange={externalOnSortChange}
  />;
};