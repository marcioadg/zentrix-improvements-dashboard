import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { trackIssueResolved } from '@/lib/statsigAnalytics';
import { markIssuePending, clearIssuePending } from './useSimpleIssues';
import { logger } from '@/utils/logger';

export interface Issue {
  id: string;
  title: string;
  description?: string;
  status: string;
  issue_type: 'short_term' | 'long_term';
  team_id: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  archived?: boolean;
  vote_count?: number;
  created_by: string;
}

export const useOptimisticIssueArchiving = (
  issues: Issue[],
  setIssues: React.Dispatch<React.SetStateAction<Issue[]>>,
  onUndoArchive?: (issueId: string) => void
) => {
  const [archivingIssues, setArchivingIssues] = useState<Set<string>>(new Set());

  // Keep a ref so archiveIssueOptimistically doesn't need `issues` in its deps.
  // This prevents the callback from being recreated on every issue list change.
  const issuesRef = useRef(issues);
  issuesRef.current = issues;

  const onUndoArchiveRef = useRef(onUndoArchive);
  onUndoArchiveRef.current = onUndoArchive;

  const archiveIssueOptimistically = useCallback(async (issueId: string): Promise<boolean> => {
    const issueToArchive = issuesRef.current.find(i => i.id === issueId);
    if (!issueToArchive) return false;

    try {
      setArchivingIssues(prev => new Set([...prev, issueId]));

      // Mark pending so the realtime echo is skipped (same pattern as updateIssue)
      markIssuePending(issueId);

      // Optimistically remove from UI immediately
      setIssues(prev => prev.filter(i => i.id !== issueId));

      toast.success(`"${issueToArchive.title}" archived`, {
        action: {
          label: "Undo",
          onClick: () => undoArchive(issueId, issueToArchive)
        }
      });

      const { error } = await supabase
        .from('issues')
        .update({ 
          archived: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', issueId);

      if (error) throw error;

      // Track issue resolved (non-blocking)
      try {
        const { data: teamData } = await supabase
          .from('teams')
          .select('company_id')
          .eq('id', issueToArchive.team_id)
          .single();
        
        const { data: { user } } = await supabase.auth.getUser();
        
        if (teamData?.company_id && user) {
          const createdAt = new Date(issueToArchive.created_at);
          const now = new Date();
          const daysToResolve = Math.round((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
          
          trackIssueResolved({
            user_id: user.id,
            company_id: teamData.company_id,
            issue_id: issueId,
            days_to_resolve: daysToResolve,
          });
        }
      } catch (e) {
        // Non-blocking
      }

      setArchivingIssues(prev => {
        const newSet = new Set(prev);
        newSet.delete(issueId);
        return newSet;
      });

      // Clear pending after enough time for the echo to arrive and be skipped
      setTimeout(() => clearIssuePending(issueId), 1500);

      return true;

    } catch (error) {
      logger.error('Error archiving issue:', error);
      
      clearIssuePending(issueId);
      setIssues(prev => [issueToArchive, ...prev]);
      setArchivingIssues(prev => {
        const newSet = new Set(prev);
        newSet.delete(issueId);
        return newSet;
      });

      toast.error("Failed to archive issue. Please try again.");
      return false;
    }
  }, [setIssues]);

  const undoArchive = useCallback(async (issueId: string, originalIssue: Issue) => {
    try {
      // Mark pending so the echo from the DB write is skipped
      markIssuePending(issueId);

      setIssues(prev => [originalIssue, ...prev]);

      const { error } = await supabase
        .from('issues')
        .update({ 
          archived: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', issueId);

      if (error) throw error;

      toast.success(`"${originalIssue.title}" restored`);

      // Fire the broadcast callback so other meeting participants see the unarchive
      if (onUndoArchiveRef.current) {
        onUndoArchiveRef.current(issueId);
      }

      setTimeout(() => clearIssuePending(issueId), 1500);

    } catch (error) {
      logger.error('Error restoring issue:', error);
      
      clearIssuePending(issueId);
      setIssues(prev => prev.filter(i => i.id !== issueId));
      
      toast.error("Failed to restore issue");
    }
  }, [setIssues]);

  return {
    archiveIssueOptimistically,
    archivingIssues,
    undoArchive
  };
};
