import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, GitMerge, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { useSafeUserTeams } from '@/hooks/useSafeUserTeams';
import { logger } from '@/utils/logger';

interface Issue {
  id: string;
  title: string;
  description?: string;
  owner_id: string;
  issue_type: 'short_term' | 'long_term';
}

interface MergeIssueModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceIssue: Issue;
  availableIssues: Issue[];
  onConfirmMerge: (targetIssueId: string) => Promise<void>;
  // ✅ FIX: Team ID to fetch issues directly from database
  teamId: string;
}

export const MergeIssueModal: React.FC<MergeIssueModalProps> = ({
  open,
  onOpenChange,
  sourceIssue,
  availableIssues,
  onConfirmMerge,
  teamId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingIssues, setIsLoadingIssues] = useState(false);
  // ✅ FIX: Local state that gets fresh data directly from database
  const [currentIssues, setCurrentIssues] = useState<Issue[]>(availableIssues);
  const hasFetchedRef = useRef(false); // ✅ Track if we've already fetched
  
  const { currentCompany } = useMultiCompany();
  const { teams, loading: teamsLoading } = useSafeUserTeams();

  // ✅ FIX: Fetch issues DIRECTLY from database when modal opens
  // This ensures we ALWAYS have the latest data, including newly created issues
  useEffect(() => {
    if (open && teamId && currentCompany && !teamsLoading && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      setIsLoadingIssues(true);
      
      const fetchIssuesDirectly = async () => {
        try {
          // Fetch team-specific issues AND public issues scoped to current company teams
          const companyTeamIds = teams
            .filter(t => t.company_id === currentCompany?.id)
            .map(t => t.id);

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
            logger.error('Error fetching issues in merge modal:', error);
            // Fallback to availableIssues if fetch fails
            setCurrentIssues(availableIssues);
            return;
          }

          // Filter and map to Issue format (excluding archived and resolved)
          const filtered = (data || [])
            .filter(issue => !issue.archived && issue.status === 'open')
            .map(issue => ({
              id: issue.id,
              title: issue.title,
              description: issue.description,
              owner_id: issue.owner_id,
              issue_type: issue.issue_type,
            }));

          setCurrentIssues(filtered);
        } catch (error) {
          logger.error('Exception fetching issues in merge modal:', error);
          // Fallback to availableIssues if exception occurs
          setCurrentIssues(availableIssues);
        } finally {
          setIsLoadingIssues(false);
        }
      };

      fetchIssuesDirectly();
    } else if (!open) {
      // Reset fetch flag when modal closes so it fetches next time
      hasFetchedRef.current = false;
      setCurrentIssues(availableIssues); // Reset to initial state
    } else if (open && !teamId) {
      // If no teamId, use availableIssues
      setCurrentIssues(availableIssues);
      setIsLoadingIssues(false);
    }
  }, [open, teamId, currentCompany, teams, teamsLoading, availableIssues]);

  // Filter issues - exclude the source issue
  // ✅ FIX: Use currentIssues instead of availableIssues to ensure fresh data
  const filteredIssues = useMemo(() => {
    return currentIssues
      .filter(issue => issue.id !== sourceIssue.id)
      .filter(issue => 
        issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (issue.description?.toLowerCase().includes(searchQuery.toLowerCase()))
      );
  }, [currentIssues, sourceIssue.id, searchQuery]);

  const selectedIssue = useMemo(() => {
    return filteredIssues.find(i => i.id === selectedIssueId);
  }, [filteredIssues, selectedIssueId]);

  // Preview of merged content
  const mergePreview = useMemo(() => {
    if (!selectedIssue) return null;
    return {
      title: `${sourceIssue.title} / ${selectedIssue.title}`,
      description: `${sourceIssue.description || ''} / ${selectedIssue.description || ''}`.trim(),
    };
  }, [sourceIssue, selectedIssue]);

  const handleConfirm = async () => {
    if (!selectedIssueId) return;
    
    setIsLoading(true);
    try {
      await onConfirmMerge(selectedIssueId);
      onOpenChange(false);
    } catch (error) {
      logger.error('Error merging issues:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setSelectedIssueId(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitMerge className="h-5 w-5 text-primary" />
            Merge Issues
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Source issue info */}
          <div className="p-3 bg-muted/50 rounded-lg border">
            <p className="text-xs text-muted-foreground mb-1">Source Issue</p>
            <p className="font-medium text-sm">{sourceIssue.title}</p>
            {sourceIssue.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {sourceIssue.description}
              </p>
            )}
          </div>

          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search issues to merge with..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Issues list */}
          <ScrollArea className="h-[200px] border rounded-lg">
            {isLoadingIssues ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading issues...
              </div>
            ) : filteredIssues.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                No issues found
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredIssues.map((issue) => (
                  <button
                    key={issue.id}
                    onClick={() => setSelectedIssueId(issue.id)}
                    className={cn(
                      "w-full text-left p-2 rounded-md transition-colors",
                      "hover:bg-muted/80",
                      selectedIssueId === issue.id 
                        ? "bg-primary/10 border border-primary/30" 
                        : "border border-transparent"
                    )}
                  >
                    <p className="font-medium text-sm line-clamp-1">{issue.title}</p>
                    {issue.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {issue.description}
                      </p>
                    )}
                    <span className="text-[10px] text-muted-foreground mt-1 inline-block">
                      {issue.issue_type === 'short_term' ? 'Short-term' : 'Long-term'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Merge preview */}
          {mergePreview && (
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <ArrowRight className="h-4 w-4 text-primary" />
                <p className="text-xs font-medium text-primary">Merge Preview</p>
              </div>
              <p className="font-medium text-sm">{mergePreview.title}</p>
              {mergePreview.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {mergePreview.description}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!selectedIssueId || isLoading}
          >
            {isLoading ? 'Merging...' : 'Merge Issues'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
