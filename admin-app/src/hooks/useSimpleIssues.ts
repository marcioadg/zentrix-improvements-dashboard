
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase, dataClient } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { toast as sonnerToast } from 'sonner';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { useSafeUserTeams } from '@/hooks/useSafeUserTeams';
import { useOptimisticIssueArchiving } from './useOptimisticIssueArchiving';
import { trackIssueCreated, trackIssueResolved } from '@/lib/statsigAnalytics';
import { logger } from '@/utils/logger';

// Module-level pending set — same pattern as markCellPending/clearCellPending in useMetricsRealtime.
// Tracks issues with in-flight local changes so the realtime echo can be skipped.
const pendingIssueUpdatesRef = { current: new Set<string>() };

export const markIssuePending = (issueId: string) => {
  pendingIssueUpdatesRef.current.add(issueId);
};

export const clearIssuePending = (issueId: string) => {
  pendingIssueUpdatesRef.current.delete(issueId);
};

export interface Issue {
  id: string;
  title: string;
  description?: string;
  status: string;
  created_at: string;
  updated_at: string;
  issue_type: 'short_term' | 'long_term';
  team_id: string;
  created_by: string;
  owner_id: string;
  archived?: boolean;
  vote_count?: number;
  sort_order?: number | null;
  is_public?: boolean;
}

export const useSimpleIssues = (
  teamId?: string, 
  onIssueCreated?: (issue: Issue) => void,
  onIssueStatusChanged?: (issueId: string, status: string) => void,
  onIssueArchivedChanged?: (issueId: string, archived: boolean) => void,
  options?: { silent?: boolean }
) => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(!teamId ? false : true); // Don't start loading if no teamId
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const { toast } = useToast();
  const { currentCompany } = useMultiCompany();
  const { teams, loading: teamsLoading } = useSafeUserTeams();

  // Stable refs — lets callbacks read current values without needing them in deps
  const onIssueCreatedRef = useRef(onIssueCreated);
  const onIssueStatusChangedRef = useRef(onIssueStatusChanged);
  const onIssueArchivedChangedRef = useRef(onIssueArchivedChanged);
  const currentCompanyRef = useRef(currentCompany);
  const issuesRef = useRef(issues);
  const teamsLoadingRef = useRef(teamsLoading);
  const teamsRef = useRef(teams);

  onIssueCreatedRef.current = onIssueCreated;
  onIssueStatusChangedRef.current = onIssueStatusChanged;
  onIssueArchivedChangedRef.current = onIssueArchivedChanged;
  currentCompanyRef.current = currentCompany;
  issuesRef.current = issues;
  teamsLoadingRef.current = teamsLoading;
  teamsRef.current = teams;

  // Called when user clicks "Undo" on the archive toast — fires the broadcast callback
  const handleUndoArchive = useCallback((issueId: string) => {
    if (onIssueArchivedChangedRef.current) {
      onIssueArchivedChangedRef.current(issueId, false);
    }
  }, []);

  const { archiveIssueOptimistically } = useOptimisticIssueArchiving(issues, setIssues, handleUndoArchive);

  const isDraggingRef = useRef<boolean>(false);

  const fetchIssues = async () => {
    if (!teamId) {
      setIssues([]);
      setLoading(false);
      return;
    }

    // Wait for teams and company to load before validating
    if (teamsLoading || !currentCompany) {
      logger.log("useSimpleIssues: Still loading data", { teamsLoading, hasCurrentCompany: !!currentCompany });
      return;
    }

    // Validate team access - only show error if team is definitely not accessible
    const team = teams.find((t) => t.id === teamId);
    if (!team) {
      logger.warn("useSimpleIssues: Team not found in user teams", { 
        teamId, 
        availableTeams: teams.map(t => t.id) 
      });
      setIssues([]);
      setLoading(false);
      // Only surface the error toast if we have confirmed teams loaded, the user
      // has teams, and the caller hasn't opted out (silent mode for pages that
      // only use addIssue and don't need fetch validation, e.g. Metrics page).
      if (teams.length > 0 && !options?.silent) {
        toast({
          title: "Access Denied",
          description: "You do not have access to this team.",
          variant: "destructive",
        });
      }
      return;
    }

    // Check if team belongs to current company - only fail if certain
    if (team.company_id !== currentCompany?.id) {
      logger.warn("useSimpleIssues: ⚠️ Team belongs to different company - clearing issues during company switch", { 
        currentCompanyId: currentCompany?.id, 
        teamCompanyId: team.company_id,
        teamId 
      });
      setIssues([]);
      setLoading(false);
      // Toast removed - this is expected during company switches
      return;
    }

    if (process.env.NODE_ENV === 'development') {
      logger.log("useSimpleIssues: Validation passed", { 
        teamId, 
        companyId: currentCompany?.id, 
        teamCompanyId: team.company_id 
      });
    }

    try {
      // Fetch team-specific issues AND public issues from teams in the SAME company
      // We explicitly scope public issues to current company teams to prevent
      // multi-company users from seeing public issues from other companies
      const companyTeamIds = teams
        .filter(t => t.company_id === currentCompany?.id)
        .map(t => t.id);

      // Build the filter: team's own issues OR (public AND from a company team)
      const companyTeamFilter = companyTeamIds.length > 0
        ? `team_id.eq.${teamId},and(is_public.eq.true,team_id.in.(${companyTeamIds.join(',')}))`
        : `team_id.eq.${teamId}`;

      const { data, error } = await supabase
        .from('issues')
        .select('*')
        .or(companyTeamFilter)
        .eq('archived', false)
        .eq('is_deleted', false)
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('useSimpleIssues: Error fetching issues:', error);
        throw error;
      }
      
      if (process.env.NODE_ENV === 'development') {
        logger.log('useSimpleIssues: Fetched issues:', { 
          teamSpecific: data?.filter(i => i.team_id === teamId).length,
          publicFromCompany: data?.filter(i => i.is_public && i.team_id !== teamId).length,
          total: data?.length
        });
      }
      
      setIssues(data || []);
    } catch (error) {
      logger.error('useSimpleIssues: Exception fetching issues:', error);
      toast({
        title: "Error loading issues",
        description: "Failed to load issues. Please try again.",
        variant: "destructive"
      });
      setIssues([]);
    } finally {
      setLoading(false);
    }
  };

  // Stabilize dependency - use team IDs string instead of teams array reference
  const teamIdsKey = teams.map(t => t.id).sort().join(',');
  const companyId = currentCompany?.id;

  useEffect(() => {
    fetchIssues();
  }, [teamId, companyId, teamIdsKey, teamsLoading]);

  // Set up real-time subscription with unique channel name for simple issues
  useEffect(() => {
    if (!teamId || !currentCompany || teamsLoading) return;

    const channelName = `simple_issues_${teamId}_${currentCompany?.id}`;
    
    const channelBox: { current: ReturnType<typeof supabase.channel> | null } = { current: null };
    let debounceTimeout: NodeJS.Timeout;
    let isMounted = true;
    
    const debouncedUpdateIssues = (updateFn: (prev: Issue[]) => Issue[], issueId?: string, skipIfPending = false) => {
      clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(() => {
        if (!isMounted) return;
        if (skipIfPending && issueId && pendingIssueUpdatesRef.current.has(issueId)) {
          logger.log('⏭️ useSimpleIssues: Skipping realtime echo for pending issue', { issueId });
          return;
        }
        setIssues(updateFn);
      }, 500);
    };
    
    const setupSubscription = async () => {
      const { data: allCompanyTeams } = await supabase
        .from('teams')
        .select('id')
        .eq('company_id', currentCompany?.id);
      
      const allTeamIds = allCompanyTeams?.map(t => t.id) || teams.filter(t => t.company_id === currentCompany?.id).map(t => t.id);
      
      if (!isMounted || allTeamIds.length === 0) return;
      
      const ch = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'issues',
            filter: `team_id=in.(${allTeamIds.join(',')})`
          },
          (payload) => {
            if (!isMounted) return;
            setRealtimeConnected(true);
            
            const { eventType, new: newRecord, old: oldRecord } = payload;
            
            // Only process changes for team-specific issues OR public issues
            const isRelevant = (record: any) => {
              return record?.team_id === teamId || (record?.is_public === true);
            };
            
            if (eventType === 'INSERT' && newRecord && isRelevant(newRecord)) {
              debouncedUpdateIssues(prev => {
                const exists = prev.find(issue => issue.id === newRecord.id);
                if (exists) return prev;
                return [...prev, newRecord as Issue];
              });
            } else if (eventType === 'UPDATE' && newRecord) {
              if (isRelevant(newRecord)) {
                // CRITICAL: Skip postgres_changes during drag operations to prevent interference
                // This ensures drag-and-drop works reliably across all browsers
                if (isDraggingRef.current) {
                  logger.log('🚫 [REALTIME] Skipping postgres_changes update during drag operation');
                  return;
                }
                
                // CRITICAL: Check if this is a sort_order change
                // sort_order changes must always be processed for real-time sync to work
                const isSortOrderChange = oldRecord?.sort_order !== newRecord?.sort_order;
                
                // Always process sort_order changes immediately (no skip)
                // Other changes can be debounced and may skip recent optimistic updates
                if (isSortOrderChange) {
                  logger.log('📡 [REALTIME] Detected sort_order change, updating immediately:', {
                    issueId: newRecord.id,
                    oldSortOrder: oldRecord?.sort_order,
                    newSortOrder: newRecord?.sort_order
                  });
                  
                  // Update immediately without debounce for sort_order changes
                  setIssues(prev => {
                    const exists = prev.find(issue => issue.id === newRecord.id);
                    if (exists) {
                      return prev.map(issue => 
                        issue.id === newRecord.id ? newRecord as Issue : issue
                      );
                    } else {
                      return [...prev, newRecord as Issue];
                    }
                  });
                } else {
                  // For other updates, use debounced update with optimistic skip
                  debouncedUpdateIssues(prev => {
                    const exists = prev.find(issue => issue.id === newRecord.id);
                    if (exists) {
                      return prev.map(issue => 
                        issue.id === newRecord.id ? newRecord as Issue : issue
                      );
                    } else {
                      return [...prev, newRecord as Issue];
                    }
                  }, newRecord.id, true); // Skip if recent optimistic update
                }
              } else if (oldRecord && (oldRecord.team_id === teamId || oldRecord.is_public === true)) {
                // Remove the issue if it's no longer relevant
                debouncedUpdateIssues(prev => prev.filter(issue => issue.id !== newRecord.id));
              }
            } else if (eventType === 'DELETE' && oldRecord && isRelevant(oldRecord)) {
              debouncedUpdateIssues(prev => prev.filter(issue => issue.id !== oldRecord.id));
            }
          }
        )
        .subscribe((status) => {
          if (!isMounted) return;
          setRealtimeConnected(status === 'SUBSCRIBED');
          
          if (status === 'CHANNEL_ERROR') {
            setRealtimeConnected(false);
          }
        });

      // If cleanup already ran while we were awaiting, remove immediately
      if (!isMounted) {
        supabase.removeChannel(ch);
        return;
      }
      channelBox.current = ch;
    };
    
    setupSubscription();

    return () => {
      isMounted = false;
      clearTimeout(debounceTimeout);
      if (channelBox.current) {
        supabase.removeChannel(channelBox.current);
      }
      setRealtimeConnected(false);
    };
  }, [teamId, companyId, teamIdsKey, teamsLoading]);

  const addIssue = useCallback(async (
    title: string, 
    description?: string, 
    issueType: 'short_term' | 'long_term' = 'short_term',
    ownerId?: string,
    isPublic?: boolean
  ): Promise<boolean> => {
    if (!teamId) {
      logger.error('useSimpleIssues: No team ID for adding issue');
      toast({
        title: "Error",
        description: "No team selected for adding issue.",
        variant: "destructive"
      });
      return false;
    }

    if (teamsLoadingRef.current) {
      logger.log('useSimpleIssues: Teams still loading for add operation');
      return false;
    }
    
    const team = teamsRef.current.find((t) => t.id === teamId);
    if (!currentCompanyRef.current || !team || team.company_id !== currentCompanyRef.current.id) {
      logger.warn("useSimpleIssues: Attempted ADD to team outside company!", { currentCompany: currentCompanyRef.current, teamId });
      toast({
        title: "Access Denied",
        description: "Invalid team or company.",
        variant: "destructive",
      });
      return false;
    }

    logger.log('useSimpleIssues: Adding issue:', { title, description, issueType, ownerId });

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        logger.error('useSimpleIssues: Authentication error:', userError);
        toast({
          title: "Authentication required",
          description: "Please sign in to add issues.",
          variant: "destructive"
        });
        return false;
      }

      logger.log('useSimpleIssues: Authenticated user:', user.id);

      let finalOwnerId = ownerId || user.id;
      if (ownerId) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(ownerId)) {
          logger.warn('useSimpleIssues: Invalid UUID format for ownerId, using current user:', ownerId);
          finalOwnerId = user.id;
        }
      }

      const normalizedTitle = title.trim();
      const normalizedDescription = description?.trim() || '';

      // Check for exact duplicates
      logger.log('useSimpleIssues: Checking for duplicate issues...');
      const { data: existingIssues, error: fetchError } = await supabase
        .from('issues')
        .select('id, title, description, archived')
        .eq('team_id', teamId)
        .eq('issue_type', issueType)
        .eq('status', 'open')
        .neq('archived', true);

      if (fetchError) {
        logger.error('useSimpleIssues: Error checking for duplicates:', fetchError);
      } else if (existingIssues) {
        const duplicates = existingIssues.filter(issue => {
          const existingTitle = issue.title.trim();
          const existingDescription = (issue.description || '').trim();
          return existingTitle === normalizedTitle && existingDescription === normalizedDescription;
        });

        if (duplicates.length > 0) {
          logger.log('useSimpleIssues: Found', duplicates.length, 'duplicate issue(s), preventing creation...');
          
          toast({
            title: "Duplicate issue",
            description: `An issue with the same title and description already exists: "${normalizedTitle}"`,
            variant: "destructive"
          });
          
          // Return false since no new issue was created due to duplicate
          return false;
        }
      }

      // Create the new issue with optimistic update
      const newIssueData = {
        title: normalizedTitle,
        description: normalizedDescription || null,
        team_id: teamId,
        created_by: user.id,
        owner_id: finalOwnerId,
        issue_type: issueType,
        status: 'open',
        archived: false,
        is_public: issueType === 'long_term' ? (isPublic || false) : false
      };

      // Optimistic update
      const tempIssue: Issue = {
        id: `temp-${Date.now()}`,
        ...newIssueData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setIssues(prev => [...prev, tempIssue]);

      const { data, error } = await supabase
        .from('issues')
        .insert(newIssueData)
        .select()
        .single();

      if (error) {
        // Remove optimistic update on error
        setIssues(prev => prev.filter(issue => issue.id !== tempIssue.id));
        logger.error('useSimpleIssues: Error adding issue:', error);
        throw error;
      }

      // Replace temp issue with real one
      const createdIssue = data as Issue;
      setIssues(prev => prev.map(issue => 
        issue.id === tempIssue.id ? createdIssue : issue
      ));

      logger.log('useSimpleIssues: Issue added successfully');
      
      if (onIssueCreatedRef.current) {
        onIssueCreatedRef.current(createdIssue);
      }
      
      import('@/lib/analytics').then(({ trackIssueCreated: legacyTrackIssueCreated }) => {
        legacyTrackIssueCreated(issueType);
      });
      
      if (currentCompanyRef.current?.id) {
        trackIssueCreated({
          user_id: user.id,
          company_id: currentCompanyRef.current.id,
          issue_id: createdIssue.id,
          issue_title: createdIssue.title,
        });
      }
      
      sonnerToast.success('Issue created', {
        description: 'Your issue has been added successfully.',
      });
      
      return true;
    } catch (error) {
      logger.error('useSimpleIssues: Exception adding issue:', error);
      toast({
        title: "Error adding issue",
        description: "Failed to add the issue. Please try again.",
        variant: "destructive"
      });
      return false;
    }
  // teamId and companyId are primitives read directly; teamsLoading gates logic internally
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId, companyId]);

  const updateIssue = useCallback(async (id: string, updates: Partial<Issue>): Promise<void> => {
    try {
      // Only update local state for temporary issues — never attempt a DB write
      if (id.startsWith('temp-')) {
        setIssues(prev => prev.map(issue => 
          issue.id === id ? { ...issue, ...updates } : issue
        ));
        return;
      }

      // Mark pending so the realtime echo is skipped (ref-based, always current in closure)
      pendingIssueUpdatesRef.current.add(id);

      // Optimistic update
      setIssues(prev => prev.map(issue => 
        issue.id === id ? { ...issue, ...updates } : issue
      ));

      const { error } = await supabase
        .from('issues')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        pendingIssueUpdatesRef.current.delete(id);
        await fetchIssues();
        logger.error('useSimpleIssues: Error updating issue:', error);
        throw error;
      }
      
      // Track issue resolution in analytics if status changed to resolved
      if (updates.status === 'resolved') {
        import('@/lib/analytics').then(({ trackIssueResolved: legacyTrackIssueResolved }) => {
          legacyTrackIssueResolved();
        });
        
        try {
          const issue = issuesRef.current.find(i => i.id === id);
          const { data: { user } } = await supabase.auth.getUser();
          
          if (issue && user && currentCompanyRef.current?.id) {
            const daysToResolve = Math.round(
              (Date.now() - new Date(issue.created_at).getTime()) / (1000 * 60 * 60 * 24)
            );
            
            trackIssueResolved({
              user_id: user.id,
              company_id: currentCompanyRef.current.id,
              issue_id: id,
              days_to_resolve: daysToResolve,
            });
          }
        } catch (e) {
          // Non-blocking
        }
      }
      
      if (onIssueStatusChangedRef.current && updates.status) {
        onIssueStatusChangedRef.current(id, updates.status);
      }
      
      if (onIssueArchivedChangedRef.current && updates.archived === false) {
        onIssueArchivedChangedRef.current(id, false);
      }
      
      // Clear pending after enough time for the realtime echo to arrive and be skipped
      setTimeout(() => {
        pendingIssueUpdatesRef.current.delete(id);
      }, 1500);
    } catch (error) {
      logger.error('useSimpleIssues: Exception updating issue:', error);
      toast({
        title: "Error updating issue",
        description: "Failed to update the issue. Please try again.",
        variant: "destructive"
      });
    }
  // fetchIssues and toast are stable enough; teamId/companyId are primitive
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const archiveIssue = useCallback(async (id: string): Promise<void> => {
    const success = await archiveIssueOptimistically(id);
    if (success && onIssueArchivedChangedRef.current) {
      onIssueArchivedChangedRef.current(id, true);
    }
  }, [archiveIssueOptimistically]);

  // Add issue directly to local state (for receiving broadcasts from other participants)
  const addIssueToLocalState = useCallback((issue: Issue) => {
    setIssues(prev => {
      // Check if issue already exists to prevent duplicates
      const exists = prev.find(i => i.id === issue.id);
      if (exists) {
        logger.log('📡 useSimpleIssues: Issue already exists, skipping add:', issue.id);
        return prev;
      }
      logger.log('📡 useSimpleIssues: Adding remote issue to local state:', issue.id);
      return [...prev, issue];
    });
  }, []);

  // Update issue status in local state (for receiving broadcasts from other participants)
  const updateIssueLocalState = useCallback((issueId: string, status: string) => {
    logger.log('📡 useSimpleIssues: Updating remote issue status in local state:', { issueId, status });
    setIssues(prev => prev.map(issue => 
      issue.id === issueId ? { ...issue, status, updated_at: new Date().toISOString() } : issue
    ));
  }, []);

  // Update issue archive state in local state (for receiving broadcasts from other participants)
  const updateIssueArchiveLocalState = useCallback((issueId: string, archived: boolean) => {
    logger.log('📡 useSimpleIssues: Updating remote issue archive state in local state:', { issueId, archived });
    if (archived) {
      // Update the issue's archived flag so it moves to the archived section
      setIssues(prev => prev.map(issue => 
        issue.id === issueId 
          ? { ...issue, archived: true, updated_at: new Date().toISOString() } 
          : issue
      ));
    } else {
      // For unarchive, update the archived flag to false
      setIssues(prev => prev.map(issue => 
        issue.id === issueId 
          ? { ...issue, archived: false, status: 'open', updated_at: new Date().toISOString() } 
          : issue
      ));
    }
  }, []);

  const updateIssueSortOrderLocalState = useCallback((issueId: string, sortOrder: number) => {
    // NOTE: This function is kept for backward compatibility but is no longer used
    // Remote reordering now uses refetch() for 100% reliability
    logger.log('📡 useSimpleIssues: updateIssueSortOrderLocalState called (legacy, not used for remote reorder)');
    setIssues(prev => prev.map(issue => 
      issue.id === issueId ? { ...issue, sort_order: sortOrder, updated_at: new Date().toISOString() } : issue
    ));
  }, []);

  // Merge two issues into one
  const mergeIssues = useCallback(async (sourceIssueId: string, targetIssueId: string): Promise<boolean> => {
    try {
      logger.log('useSimpleIssues: Merging issues', { sourceIssueId, targetIssueId });
      
      // Fetch both issues from database to ensure we have the latest data
      const { data: sourceIssue, error: sourceError } = await supabase
        .from('issues')
        .select('*')
        .eq('id', sourceIssueId)
        .single();
      
      const { data: targetIssue, error: targetError } = await supabase
        .from('issues')
        .select('*')
        .eq('id', targetIssueId)
        .single();
      
      if (sourceError || targetError || !sourceIssue || !targetIssue) {
        logger.error('useSimpleIssues: Could not find issues for merge', { sourceError, targetError });
        toast({
          title: "Error",
          description: "Could not find issues to merge",
          variant: "destructive"
        });
        return false;
      }
      
      // Create merged content
      const mergedTitle = `${sourceIssue.title} / ${targetIssue.title}`;
      const mergedDescription = `${sourceIssue.description || ''} / ${targetIssue.description || ''}`.trim();
      
      // Optimistic update - update source issue with merged content
      setIssues(prev => prev.map(issue => 
        issue.id === sourceIssueId 
          ? { ...issue, title: mergedTitle, description: mergedDescription }
          : issue
      ).filter(issue => issue.id !== targetIssueId));
      
      // Update source issue in database
      const { error: updateError } = await supabase
        .from('issues')
        .update({
          title: mergedTitle,
          description: mergedDescription,
          updated_at: new Date().toISOString()
        })
        .eq('id', sourceIssueId);
      
      if (updateError) {
        logger.error('useSimpleIssues: Error updating source issue:', updateError);
        await fetchIssues(); // Revert on error
        throw updateError;
      }
      
      // Migrate votes from target to source
      const { error: voteError } = await supabase
        .from('issue_votes')
        .update({ issue_id: sourceIssueId })
        .eq('issue_id', targetIssueId);
      
      if (voteError) {
        logger.warn('useSimpleIssues: Error migrating votes (may not have any):', voteError);
      }
      
      // Migrate ratings from target to source
      const { error: ratingError } = await supabase
        .from('issue_ratings')
        .update({ issue_id: sourceIssueId })
        .eq('issue_id', targetIssueId);
      
      if (ratingError) {
        logger.warn('useSimpleIssues: Error migrating ratings (may not have any):', ratingError);
      }
      
      // Archive target issue (using archived instead of is_deleted to avoid audit constraint)
      const { error: deleteError } = await supabase
        .from('issues')
        .update({ 
          archived: true,
          archived_at: new Date().toISOString(),
          status: 'resolved'
        })
        .eq('id', targetIssueId);
      
      if (deleteError) {
        logger.error('useSimpleIssues: Error soft-deleting target issue:', deleteError);
        await fetchIssues(); // Revert on error
        throw deleteError;
      }
      
      logger.log('useSimpleIssues: Issues merged successfully');
      
      toast({
        title: "Issues merged",
        description: "The issues have been combined successfully.",
      });
      
      return true;
    } catch (error) {
      logger.error('useSimpleIssues: Exception merging issues:', error);
      toast({
        title: "Error merging issues",
        description: "Failed to merge issues. Please try again.",
        variant: "destructive"
      });
      return false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stable refetch — wraps fetchIssues which reads current state via closure; re-created only when teamId changes
  const refetch = useCallback(() => {
    return fetchIssues();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId, companyId]);

  // Compute counts directly from local state - bulletproof sync with visible list
  const shortTermCount = useMemo(() => 
    issues.filter(i => i.issue_type === 'short_term' && i.status === 'open' && !i.archived).length,
  [issues]);

  const longTermCount = useMemo(() => 
    issues.filter(i => i.issue_type === 'long_term' && i.status === 'open' && !i.archived).length,
  [issues]);

  // Expose function to control drag state (prevents postgres_changes interference)
  const setIsDragging = useCallback((isDragging: boolean) => {
    isDraggingRef.current = isDragging;
    logger.log(isDragging ? '🔒 [DRAG] Drag started - blocking postgres_changes' : '🔓 [DRAG] Drag ended - allowing postgres_changes');
  }, []);

  return {
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
    setIsDragging, // Expose drag state control
    shortTermCount,
    longTermCount,
  };
};
