
import React, { useState, useEffect, useMemo, useCallback, useRef, useContext } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Eye, EyeOff } from 'lucide-react';
import { useSimpleIssues } from '@/hooks/useSimpleIssues';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useBatchVoteCounts } from '@/hooks/voting/useBatchVoteCounts';
import { NewMeetingTimerContext } from '@/contexts/NewMeetingTimerContext';
import { IssueRow } from './IssueRow';
import { DraggableIssueRow } from './DraggableIssueRow';
import { InlineAddIssue } from './InlineAddIssue';
import { IssuesControls } from './IssuesControls';
import { EditIssueModal } from '@/components/modals/EditIssueModal';
import { VotingSettingsModal } from '@/components/modals/VotingSettingsModal';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useIssueReorderBroadcast } from '@/hooks/meeting/useIssueReorderBroadcast';
import { logger } from '@/utils/logger';

interface IssuesListProps {
  teamId: string;
  issueType?: 'short_term' | 'long_term'; // undefined means show all types
  showTeamSelector?: boolean;
  isMeetingContext?: boolean;
  onIssueSolved?: (
    issueTitle?: string,
    issueDescription?: string,
    issueId?: string,
    ownerId?: string,
    issueTeamId?: string
  ) => void;
  onCreateTaskFromIssue?: (issueData: {
    title: string;
    description: string;
    sourceIssueId?: string;
    ownerId?: string;
  }) => void;
  onUpdateIssueReady?: (updateIssue: (issueId: string, updates: any) => Promise<void>) => void;
  // Issues page controls
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
  // Issue type selection
  selectedIssueType?: 'short_term' | 'long_term' | 'all';
  onIssueTypeChange?: (type: 'short_term' | 'long_term' | 'all') => void;
  showAllIssueTypeOption?: boolean;
  shortTermCount?: number;
  longTermCount?: number;
  // Vote broadcast props
  onVoteCast?: (issueId: string, voteValue: number, newVoteCount: number) => void;
  remoteVoteCounts?: Record<string, number>;
  onClearRemoteVoteCount?: (issueId: string) => void;
  // Issue creation broadcast props
  onIssueCreated?: (issue: any) => void;
  onAddIssueToLocalStateReady?: (addFn: (issue: any) => void) => void;
  // Issue status broadcast props
  onIssueStatusChanged?: (issueId: string, status: string) => void;
  onUpdateIssueLocalStateReady?: (updateFn: (issueId: string, status: string) => void) => void;
  // Issue archive broadcast props
  onIssueArchivedChanged?: (issueId: string, archived: boolean) => void;
  onUpdateIssueArchiveLocalStateReady?: (updateFn: (issueId: string, archived: boolean) => void) => void;
  // Track which issues have tasks created (for solve confirmation)
  issuesWithTasks?: Set<string>;
}

export const IssuesList: React.FC<IssuesListProps> = ({
  teamId,
  issueType,
  showTeamSelector = true,
  isMeetingContext = false,
  onIssueSolved,
  onCreateTaskFromIssue,
  onUpdateIssueReady,
  // Issues page controls
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
  // Vote broadcast props
  onVoteCast,
  remoteVoteCounts,
  onClearRemoteVoteCount,
  // Issue creation broadcast props
  onIssueCreated,
  onAddIssueToLocalStateReady,
  // Issue status broadcast props
  onIssueStatusChanged,
  onUpdateIssueLocalStateReady,
  // Issue archive broadcast props
  onIssueArchivedChanged,
  onUpdateIssueArchiveLocalStateReady,
  // Track which issues have tasks created (for solve confirmation)
  issuesWithTasks,
}) => {
  // Use external state if provided, otherwise use internal state
  const [internalShowSolved, setInternalShowSolved] = useState(false);
  const [internalSortBy, setInternalSortBy] = useState<'newest' | 'oldest' | 'title-asc' | 'title-desc' | 'votes-desc' | 'votes-asc' | 'custom-order'>(() => {
    const saved = localStorage.getItem(`issues-sort-${teamId}`);
    return (saved as any) || 'custom-order';
  });
  
  const showSolved = externalShowSolved !== undefined ? externalShowSolved : internalShowSolved;
  const setShowSolved = externalOnShowSolvedChange || setInternalShowSolved;
  const sortBy = externalSortBy || internalSortBy;
  const setSortBy = externalOnSortChange || setInternalSortBy;
  
  // Track real-time vote counts for sorting
  const [liveVoteCounts, setLiveVoteCounts] = useState<Record<string, number>>({});
  const [editingIssue, setEditingIssue] = useState<any>(null);
  const [showVotingSettings, setShowVotingSettings] = useState(false);
  const { toast } = useToast();
  
  // Drag and drop sensors
  // Configure sensors for cross-browser compatibility
  // PointerSensor: Works on all modern browsers (Chrome, Firefox, Safari, Edge)
  // KeyboardSensor: Ensures accessibility and works on all browsers
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px of movement before starting drag (prevents accidental drags)
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates, // Ensures proper keyboard navigation
    })
  );
  
  // Local state to track sort_order for optimistic updates
  const [localSortOrders, setLocalSortOrders] = useState<Record<string, number>>({});
  
  const {
    issues,
    loading,
    addIssue,
    updateIssue,
    archiveIssue,
    mergeIssues,
    refetch,
    realtimeConnected,
    addIssueToLocalState,
    updateIssueLocalState,
    updateIssueArchiveLocalState,
    updateIssueSortOrderLocalState,
    setIsDragging, // CRITICAL: Expose drag state control to prevent postgres_changes interference
    shortTermCount: computedShortTermCount,
    longTermCount: computedLongTermCount
  } = useSimpleIssues(teamId, onIssueCreated, onIssueStatusChanged, onIssueArchivedChanged);
  
  // Get meetingId from context for batch vote fetching
  const timerContext = useContext(NewMeetingTimerContext);
  const meetingId = timerContext?.meetingId;
  
  // Batch fetch all vote counts in a single query (instead of N individual fetches)
  // This eliminates the 3-4 second delay when switching dropdown options
  const issueIds = useMemo(() => issues.map(i => i.id), [issues]);
  const { voteCounts: batchVoteCounts, userVotes: batchUserVotes, refetch: refetchBatchVoteCounts } = useBatchVoteCounts(
    issueIds,
    meetingId,
    isMeetingContext // Only fetch in meeting context
  );
  
  // Broadcast hook for real-time reordering
  // Simple and reliable: when receiving broadcast, refetch from database to get correct order
  // This ensures 100% consistency - no state conflicts, no race conditions
  const handleRemoteReorder = useCallback((updates: Array<{ issueId: string; newSortOrder: number }>) => {
    logger.log('📡 [BROADCAST] Received remote reorder, refetching from database for consistency:', updates.length, 'issues');
    
    // CRITICAL: Clear localSortOrders to ensure we use database values after refetch
    // This prevents stale localSortOrders from overriding correct database sort_order
    setLocalSortOrders({});
    
    // CRITICAL: Small delay ensures database transaction is committed before refetch
    // This guarantees correct order is fetched, works reliably across all browsers
    // 200ms is imperceptible to users but ensures database consistency
    setTimeout(() => {
      refetch();
    }, 200);
  }, [refetch]);
  
  const { publishReorder } = useIssueReorderBroadcast(teamId, handleRemoteReorder);

  // Use computed counts from local state (bulletproof) or fallback to props
  const effectiveShortTermCount = computedShortTermCount ?? shortTermCount;
  const effectiveLongTermCount = computedLongTermCount ?? longTermCount;

  // Expose addIssueToLocalState to parent for receiving broadcast issues
  useEffect(() => {
    if (onAddIssueToLocalStateReady && addIssueToLocalState) {
      onAddIssueToLocalStateReady(addIssueToLocalState);
    }
  }, [onAddIssueToLocalStateReady, addIssueToLocalState]);

  // Expose updateIssueLocalState to parent for receiving broadcast status changes
  useEffect(() => {
    if (onUpdateIssueLocalStateReady && updateIssueLocalState) {
      onUpdateIssueLocalStateReady(updateIssueLocalState);
    }
  }, [onUpdateIssueLocalStateReady, updateIssueLocalState]);

  // Expose updateIssueArchiveLocalState to parent for receiving broadcast archive changes
  useEffect(() => {
    if (onUpdateIssueArchiveLocalStateReady && updateIssueArchiveLocalState) {
      onUpdateIssueArchiveLocalStateReady(updateIssueArchiveLocalState);
    }
  }, [onUpdateIssueArchiveLocalStateReady, updateIssueArchiveLocalState]);

  // NEW: Expose updateIssue function to parent components
  useEffect(() => {
    if (onUpdateIssueReady && updateIssue) {
      onUpdateIssueReady(updateIssue);
    }
  }, [onUpdateIssueReady, updateIssue]);

  // Filter issues by type since useSimpleIssues returns all issues
  // If issueType is undefined, show all issues (for "All Issues" tab)
  const filteredIssues = useMemo(() => {
    if (!issueType) {
      return issues; // Show all types
    }
    return issues.filter(issue => issue.issue_type === issueType);
  }, [issues, issueType]);

  // CRITICAL: When switching to 'custom-order', refetch from database to get correct order
  // This ensures we always show the correct order saved in the database
  // Added cooldown to prevent excessive refetches
  const lastRefetchTimeRef = useRef<number>(0);
  const lastSortByRef = useRef<string>('');

  useEffect(() => {
    // Only refetch if:
    // 1. sortBy is 'custom-order' OR vote-based sorting
    // 2. sortBy actually changed (not just a re-render)
    // 3. At least 1 second has passed since last refetch (cooldown)
    const now = Date.now();
    const timeSinceLastRefetch = now - lastRefetchTimeRef.current;
    const sortByChanged = lastSortByRef.current !== sortBy;
    const isVoteSort = sortBy === 'votes-desc' || sortBy === 'votes-asc';
    
    if (sortBy === 'custom-order' && sortByChanged && timeSinceLastRefetch > 1000) {
      if (process.env.NODE_ENV === 'development') {
        logger.log('🔄 [CUSTOM-ORDER] Switching to custom-order, refetching from database for correct order');
      }
      lastRefetchTimeRef.current = now;
      lastSortByRef.current = sortBy;
      refetch();
    } else if (isVoteSort && sortByChanged) {
      // CRITICAL: Force refresh batch vote counts when switching to vote-based sorting
      // This ensures we have the latest vote counts for accurate sorting
      if (process.env.NODE_ENV === 'development') {
        logger.log('🗳️ [VOTE-SORT] Switching to vote sorting, refreshing batch vote counts');
      }
      lastSortByRef.current = sortBy;
      refetchBatchVoteCounts();
    } else if (sortByChanged) {
      // Update lastSortBy even if we don't refetch (for other sort options)
      lastSortByRef.current = sortBy;
    }
    // Removed refetch from dependencies to prevent infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy]);

  // Initialize sort_order for issues that don't have it when switching to custom-order
  useEffect(() => {
    if (sortBy === 'custom-order' && filteredIssues.length > 0) {
      // Check if any active issues are missing sort_order
      const activeIssuesWithoutOrder = filteredIssues.filter(issue => {
        const isArchived = issue.archived === true;
        const isResolved = issue.status === 'resolved';
        // CRITICAL: Ignore temporary issues (temp-*) - they don't exist in DB yet
        const isTemporary = issue.id.startsWith('temp-');
        return !isArchived && !isResolved && !isTemporary && (issue.sort_order === null || issue.sort_order === undefined);
      });
      
      if (activeIssuesWithoutOrder.length > 0) {
        // Initialize sort_order based on current order (newest first as default)
        const sortedByCreated = [...activeIssuesWithoutOrder].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        
        // Update sort_order for issues without it (silently, in background)
        sortedByCreated.forEach((issue, index) => {
          // Double check: don't update temporary issues (defensive programming)
          if (!issue.id.startsWith('temp-')) {
            updateIssue(issue.id, { sort_order: index }).catch(err => {
              logger.error('Error initializing sort_order:', err);
            });
          }
        });
      }
    }
  }, [sortBy, filteredIssues, updateIssue]);

  // CRITICAL: Clear localSortOrders for issues that were updated via postgres_changes
  // This ensures we use database sort_order values instead of stale localSortOrders
  useEffect(() => {
    if (sortBy === 'custom-order' && filteredIssues.length > 0) {
      // Remove issues from localSortOrders if their database sort_order differs
      // This ensures remote updates override local optimistic state
      setLocalSortOrders(prev => {
        const updated: Record<string, number> = {};
        let hasChanges = false;
        
        Object.keys(prev).forEach(issueId => {
          const issue = filteredIssues.find(i => i.id === issueId);
          if (issue) {
            // Keep localSortOrder only if it matches database or database has no value
            // If database has a different value, remove from localSortOrders to use database value
            if (issue.sort_order === null || issue.sort_order === undefined) {
              updated[issueId] = prev[issueId];
            } else if (prev[issueId] === issue.sort_order) {
              updated[issueId] = prev[issueId];
            } else {
              // Database has different value (remote update), remove from localSortOrders
              hasChanges = true;
            }
          } else {
            // Issue no longer exists, remove from localSortOrders
            hasChanges = true;
          }
        });
        
        return hasChanges ? updated : prev;
      });
    }
  }, [filteredIssues, sortBy]);

  const { members } = useTeamMembers(teamId);

  // Memoize filtered and sorted issues for performance
  const { activeIssues, archivedIssues, sortedActiveIssues, sortedArchivedIssues } = useMemo(() => {
    // Filter unique issues only once
    const uniqueIssues = filteredIssues.filter((issue, index, self) => 
      index === self.findIndex(i => i.id === issue.id)
    );

    const active = uniqueIssues.filter(issue => {
      // In meeting context, exclude both archived issues AND resolved issues
      const isArchived = issue.archived === true;
      const isResolved = issue.status === 'resolved';
      return !isArchived && !isResolved;
    });
    
    const archived = uniqueIssues.filter(issue => {
      // Include both archived issues AND resolved issues in the "archived" section
      const isArchived = issue.archived === true;
      const isResolved = issue.status === 'resolved';
      return isArchived || isResolved;
    });

    // Sort function optimized with memoization
    const sortIssues = (issuesList: any[]) => {
      return [...issuesList].sort((a, b) => {
        switch (sortBy) {
          case 'custom-order':
            // Use local sort orders (from optimistic updates or remote broadcasts), then database sort_order
            const aOrder = localSortOrders[a.id] ?? a.sort_order ?? 999999;
            const bOrder = localSortOrders[b.id] ?? b.sort_order ?? 999999;
            
            // Primary sort: by sort_order (0 comes first, then 1, 2, etc.)
            if (aOrder !== bOrder) {
              return aOrder - bOrder;
            }
            
            // Secondary sort: when sort_order is the same (including 0), sort by created_at DESC (newest first)
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          case 'newest':
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          case 'oldest':
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          case 'title-asc':
            return a.title.localeCompare(b.title);
          case 'title-desc':
            return b.title.localeCompare(a.title);
          case 'votes-desc':
            // Priority: broadcast > local edits > batch query > database value
            // batchVoteCounts provides instant sorting when switching to vote mode
            const aVotes = remoteVoteCounts?.[a.id] ?? liveVoteCounts[a.id] ?? batchVoteCounts[a.id] ?? a.vote_count ?? 0;
            const bVotes = remoteVoteCounts?.[b.id] ?? liveVoteCounts[b.id] ?? batchVoteCounts[b.id] ?? b.vote_count ?? 0;
            return bVotes - aVotes;
          case 'votes-asc':
            // Priority: broadcast > local edits > batch query > database value
            const aVotesAsc = remoteVoteCounts?.[a.id] ?? liveVoteCounts[a.id] ?? batchVoteCounts[a.id] ?? a.vote_count ?? 0;
            const bVotesAsc = remoteVoteCounts?.[b.id] ?? liveVoteCounts[b.id] ?? batchVoteCounts[b.id] ?? b.vote_count ?? 0;
            return aVotesAsc - bVotesAsc;
          default:
            return 0;
        }
      });
    };

    return {
      activeIssues: active,
      archivedIssues: archived,
      sortedActiveIssues: sortIssues(active),
      sortedArchivedIssues: sortIssues(archived)
    };
  }, [filteredIssues, sortBy, liveVoteCounts, remoteVoteCounts, localSortOrders, batchVoteCounts]);

  // Handle drag start - block postgres_changes during drag to prevent interference
  const handleDragStart = useCallback((event: DragStartEvent) => {
    if (sortBy === 'custom-order' && setIsDragging) {
      setIsDragging(true);
      logger.log('🔒 [DRAG] Drag started - blocking postgres_changes');
    }
  }, [sortBy, setIsDragging]);

  // Handle drag end - update sort_order for all affected issues
  // Must be defined after sortedActiveIssues is calculated
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    
    // Always release drag lock, even if drag is invalid
    const releaseDragLock = () => {
      if (setIsDragging) {
        setIsDragging(false);
        logger.log('🔓 [DRAG] Drag ended - allowing postgres_changes');
      }
    };
    
    if (!over || active.id === over.id || sortBy !== 'custom-order') {
      releaseDragLock();
      return;
    }
    
    const activeId = active.id as string;
    const overId = over.id as string;
    
    // Find the issues in the current sorted list
    const activeIndex = sortedActiveIssues.findIndex(issue => issue.id === activeId);
    const overIndex = sortedActiveIssues.findIndex(issue => issue.id === overId);
    
    if (activeIndex === -1 || overIndex === -1) {
      releaseDragLock();
      return;
    }
    
    // Reorder the array
    const reorderedIssues = arrayMove(sortedActiveIssues, activeIndex, overIndex);
    
    // Update sort_order for all issues in the new order
    // Use index as sort_order (0, 1, 2, ...)
    const updates = reorderedIssues.map((issue, index) => ({
      issueId: issue.id,
      sortOrder: index
    }));
    
    // Optimistically update local state
    const newSortOrders: Record<string, number> = {};
    updates.forEach(({ issueId, sortOrder }) => {
      newSortOrders[issueId] = sortOrder;
    });
    setLocalSortOrders((prev) => ({ ...prev, ...newSortOrders }));
    
    // CRITICAL: Update the actual issues state immediately for instant UI update
    // This provides immediate feedback to the user who is dragging
    updates.forEach(({ issueId, sortOrder }) => {
      updateIssueSortOrderLocalState(issueId, sortOrder);
    });
    
    // Update all issues in database in parallel
    // This will trigger postgres_changes for other users
    try {
      // CRITICAL: Update database first to ensure data is persisted
      // This guarantees postgres_changes will work as fallback if broadcast fails
      await Promise.all(
        updates.map(({ issueId, sortOrder }) => 
          updateIssue(issueId, { sort_order: sortOrder })
        )
      );
      
      // Broadcast AFTER database update for instant synchronization
      // Supabase manages channel subscription internally - no manual checks needed
      // postgres_changes provides guaranteed fallback for cross-browser reliability
      logger.log('📤 [BROADCAST] Publishing reorder updates:', updates.length, 'issues');
      publishReorder(updates.map(u => ({ issueId: u.issueId, newSortOrder: u.sortOrder })));
      
      logger.log('✅ [REORDER] Successfully reordered', updates.length, 'issues');
    } catch (error) {
      logger.error('Error reordering issues:', error);
      toast({
        title: "Error",
        description: "Failed to reorder issues",
        variant: "destructive",
      });
      // Optionally revert optimistic update on error
      refetch();
    } finally {
      // CRITICAL: Always release drag lock, even on error
      releaseDragLock();
    }
  }, [sortedActiveIssues, sortBy, updateIssue, publishReorder, toast, refetch, setIsDragging]);

  // Memoize event handlers to prevent unnecessary re-renders
  const handleSolve = useCallback(async (issueId: string, status: string) => {
    const issue = filteredIssues.find(i => i.id === issueId);

    if (isMeetingContext) {
      // In meeting: local-only optimistic update for instant UI feedback.
      // The actual DB write happens downstream in MeetingEventHandlers.handleIssueSolved
      // (reached via the onIssueSolved callback chain). This prevents a double-write where
      // both IssuesList and MeetingEventHandlers would each call updateIssue(resolved).
      updateIssueLocalState(issueId, status);
    } else {
      await updateIssue(issueId, { status: status as 'open' | 'resolved' });
    }

    if (onIssueSolved && issue) {
      onIssueSolved(issue.title, issue.description, issue.id, issue.owner_id, issue.team_id);
    }
  }, [filteredIssues, updateIssue, updateIssueLocalState, onIssueSolved, isMeetingContext]);

  const handleArchive = useCallback(async (issueId: string) => {
    await archiveIssue(issueId);
  }, [archiveIssue]);

  const handleUnarchive = useCallback((issueId: string) => {
    updateIssue(issueId, { archived: false, status: 'open' });
  }, [updateIssue]);

  const handleEditIssue = useCallback((issue: any) => {
    setEditingIssue(issue);
  }, []);

  const handleSaveIssue = useCallback(async (updates: any) => {
    if (editingIssue) {
      await updateIssue(editingIssue.id, updates);
      setEditingIssue(null);
      return true;
    }
    return false;
  }, [editingIssue, updateIssue]);

  const handleUpdateIssue = useCallback(async (issueId: string, updates: any) => {
    await updateIssue(issueId, updates);
  }, [updateIssue]);

  const handleSortChange = useCallback((newSort: typeof sortBy) => {
    setSortBy(newSort);
    if (!externalOnSortChange) {
      localStorage.setItem(`issues-sort-${teamId}`, newSort);
    }
  }, [teamId, setSortBy, externalOnSortChange]);

  const handleVoteCountChange = useCallback((issueId: string, voteCount: number) => {
    setLiveVoteCounts(prev => ({
      ...prev,
      [issueId]: voteCount
    }));
  }, []);

  const handleOpenVotingSettings = () => {
    setShowVotingSettings(true);
  };

  // Handle merge issues
  const handleMergeIssues = useCallback(async (sourceIssueId: string, targetIssueId: string) => {
    await mergeIssues(sourceIssueId, targetIssueId);
  }, [mergeIssues]);

  // Get all team issues for merge modal (excluding archived)
  const allTeamIssuesForMerge = useMemo(() => {
    return issues
      .filter(issue => !issue.archived && issue.status === 'open')
      .map(issue => ({
        id: issue.id,
        title: issue.title,
        description: issue.description,
        owner_id: issue.owner_id,
        issue_type: issue.issue_type,
      }));
  }, [issues]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-4 bg-muted rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Card className="h-full flex flex-col bg-card border border-border rounded-[6px]">
        <CardContent className="p-4 flex-1 flex flex-col overflow-hidden">
          <div className="space-y-4 flex-shrink-0">
            {/* Controls */}
            <IssuesControls
              isMeetingContext={isMeetingContext}
              showSolved={showSolved}
              onShowSolvedChange={setShowSolved}
              solvedIssuesCount={archivedIssues.length}
              sortBy={sortBy}
              onSortChange={handleSortChange}
              teamId={teamId}
              showVotingOptions={isMeetingContext}
              activeCount={activeIssues.length}
              onOpenVotingSettings={handleOpenVotingSettings}
              selectedIssueType={selectedIssueType}
              onIssueTypeChange={onIssueTypeChange}
              showAllOption={showAllIssueTypeOption}
              shortTermCount={effectiveShortTermCount}
              longTermCount={effectiveLongTermCount}
            />

            {/* Inline Add Issue */}
            <InlineAddIssue
              onAdd={(title, description, ownerId) => addIssue(title, description, issueType || 'short_term', ownerId)}
              onCancel={() => {}}
              issueType={issueType || 'short_term'}
              teamId={teamId}
              members={members}
            />
          </div>

          {/* Scrollable Issues Area */}
          <div className="flex-1 min-h-0 mt-4">
            <ScrollArea className="h-full w-full">
              <div className="pr-4">
                {/* Active Issues */}
                {sortedActiveIssues.length > 0 ? (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={sortBy === 'custom-order' ? sortedActiveIssues.map(issue => issue.id) : []}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-1">
                        {sortedActiveIssues.map((issue, index) => (
                          <div key={issue.id} className={`${index > 0 ? 'border-t border-border/50' : ''}`}>
                            <DraggableIssueRow
                              issue={issue}
                              isArchived={false}
                              isMeetingContext={isMeetingContext}
                              onSolve={handleSolve}
                              onArchive={handleArchive}
                              onUnarchive={handleUnarchive}
                              onEdit={handleEditIssue}
                              onUpdate={handleUpdateIssue}
                              teamId={teamId}
                              onCreateTaskFromIssue={onCreateTaskFromIssue}
                              members={members}
                              onVoteCountChange={handleVoteCountChange}
                              onVoteCast={onVoteCast}
                              remoteVoteCount={remoteVoteCounts?.[issue.id]}
                              onClearRemoteVoteCount={onClearRemoteVoteCount}
                              initialVoteCount={batchVoteCounts[issue.id]}
                              initialUserVotes={batchUserVotes[issue.id]}
                              showDragHandle={sortBy === 'custom-order'}
                              onMerge={handleMergeIssues}
                              allTeamIssues={allTeamIssuesForMerge}
                              hasTaskCreated={issuesWithTasks?.has(issue.id)}
                            />
                          </div>
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                ) : (
                  <div className="py-12 text-center">
                    <p className="text-[13px] text-muted-foreground">
                      {!issueType 
                        ? 'No issues yet.' 
                        : `No ${issueType === 'short_term' ? 'short-term' : 'long-term'} issues yet.`
                      }
                    </p>
                  </div>
                )}

                {/* Archived Issues */}
                {showSolved && sortedArchivedIssues.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-border">
                    <h4 className="text-[13px] font-medium text-muted-foreground mb-3">Archived Issues</h4>
                    <div className="space-y-1">
                      {sortedArchivedIssues.map((issue, index) => (
                        <div key={issue.id} className={`${index > 0 ? 'border-t border-border/50' : ''}`}>
                          <IssueRow
                            issue={issue}
                            isArchived={true}
                            isMeetingContext={isMeetingContext}
                            onSolve={handleSolve}
                            onArchive={handleArchive}
                            onUnarchive={handleUnarchive}
                            onEdit={handleEditIssue}
                            onUpdate={handleUpdateIssue}
                            teamId={teamId}
                            onCreateTaskFromIssue={onCreateTaskFromIssue}
                            members={members}
                            onVoteCountChange={handleVoteCountChange}
                            onVoteCast={onVoteCast}
                            remoteVoteCount={remoteVoteCounts?.[issue.id]}
                            onClearRemoteVoteCount={onClearRemoteVoteCount}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>

      {/* Edit Issue Modal */}
      {editingIssue && (
        <EditIssueModal
          open={!!editingIssue}
          onOpenChange={(open) => !open && setEditingIssue(null)}
          issue={editingIssue}
          onSave={handleSaveIssue}
        />
      )}

      {/* Voting Settings Modal */}
      {showVotingSettings && (
        <VotingSettingsModal
          open={showVotingSettings}
          onOpenChange={setShowVotingSettings}
        />
      )}
    </>
  );
};
