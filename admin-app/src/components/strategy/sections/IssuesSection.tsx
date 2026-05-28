import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Archive, FileText, ChevronUp, ChevronDown } from 'lucide-react';
import { useSimpleIssues } from '@/hooks/useSimpleIssues';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useProfiles } from '@/hooks/useProfiles';
import { useIssueVotes } from '@/hooks/useIssueVotes';
import { supabase } from '@/integrations/supabase/client';
import { UserAvatar } from '@/components/UserAvatar';
import { IssueVoteButtons } from '@/components/ui/IssueVoteButtons';
import { AddIssueModal } from '@/components/modals/AddIssueModal';
import { EditIssueModal } from '@/components/modals/EditIssueModal';
import { logger } from '@/utils/logger';

interface DatabaseIssue {
  id: string;
  title: string;
  description?: string;
  status: string;
  created_at: string;
  issue_type: 'short_term' | 'long_term';
  team_id: string;
  created_by: string;
  owner_id: string;
  archived?: boolean;
}

interface IssuesSectionProps {
  selectedTeamId: string | null;
}

export const IssuesSection: React.FC<IssuesSectionProps> = ({ selectedTeamId }) => {
  // Use the selected team ID instead of first team
  const teamId = selectedTeamId || '';
  
  // Only fetch data if we have a valid team ID
  const {
    issues,
    addIssue,
    updateIssue,
    archiveIssue
  } = useSimpleIssues(teamId);
  
  const {
    members
  } = useTeamMembers(teamId);
  
  const {
    profiles
  } = useProfiles();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState<DatabaseIssue | null>(null);
  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set());
  const [issuesWithVotes, setIssuesWithVotes] = useState<(DatabaseIssue & { netScore: number })[]>([]);

  // Filter for long-term issues only - memoize to prevent unnecessary re-renders
  const longTermIssues = useMemo(() => 
    issues.filter(issue => 
      issue.issue_type === 'long_term' && 
      issue.status === 'open' && 
      !issue.archived &&
      issue.id && 
      !issue.id.startsWith('temp-') // Exclude temporary IDs
    ), 
    [issues]
  );

  // Fetch vote counts for all issues and sort by votes
  const fetchIssuesWithVotes = useCallback(async () => {
    if (!teamId || longTermIssues.length === 0) {
      setIssuesWithVotes([]);
      return;
    }

    try {
      const { data: votes, error } = await supabase
        .from('issue_votes')
        .select('*')
        .in('issue_id', longTermIssues.map(issue => issue.id));

      if (error) throw error;

      const issuesWithScores = longTermIssues.map(issue => {
        const issueVotes = votes?.filter(vote => vote.issue_id === issue.id) || [];
        const upvotes = issueVotes.filter(vote => vote.vote_value === 1).length;
        const downvotes = issueVotes.filter(vote => vote.vote_value === -1).length;
        const netScore = upvotes - downvotes;
        
        return {
          ...issue,
          netScore
        };
      });

      // Sort by net score (highest first)
      issuesWithScores.sort((a, b) => b.netScore - a.netScore);
      setIssuesWithVotes(issuesWithScores);
    } catch (error) {
      logger.error('Error fetching vote counts:', error);
      // Fallback to unsorted issues
      setIssuesWithVotes(longTermIssues.map(issue => ({ ...issue, netScore: 0 })));
    }
  }, [teamId, longTermIssues]);

  // Fetch votes whenever issues change
  useEffect(() => {
    fetchIssuesWithVotes();
  }, [fetchIssuesWithVotes]);

  // Refetch votes when a vote is cast (we'll trigger this via a custom event)
  useEffect(() => {
    const handleVoteUpdate = () => {
      fetchIssuesWithVotes();
    };

    window.addEventListener('issueVoteUpdate', handleVoteUpdate);
    return () => window.removeEventListener('issueVoteUpdate', handleVoteUpdate);
  }, [fetchIssuesWithVotes]);


  const getProfileName = (userId: string) => {
    const profile = profiles.find(p => p.id === userId);
    return profile?.full_name || 'Unknown User';
  };

  const getOwnerProfile = (userId: string) => {
    const member = members.find(m => m.user_id === userId);
    const profile = profiles.find(p => p.id === userId);
    return {
      fullName: member?.profiles?.full_name || profile?.full_name,
      email: member?.profiles?.email || profile?.email,
      avatarUrl: member?.profiles?.avatar_url || profile?.avatar_url
    };
  };

  const toggleExpanded = (issueId: string) => {
    setExpandedIssues(prev => {
      const newSet = new Set(prev);
      if (newSet.has(issueId)) {
        newSet.delete(issueId);
      } else {
        newSet.add(issueId);
      }
      return newSet;
    });
  };

  const handleAdd = () => {
    setEditingIssue(null);
    setIsModalOpen(true);
  };

  const handleAddIssue = async (issueData: {
    title: string;
    description?: string;
    issueType: 'short_term' | 'long_term';
    teamId: string;
    ownerId?: string;
    isPublic?: boolean;
  }) => {
    try {
      await addIssue(issueData.title, issueData.description, issueData.issueType, issueData.ownerId, issueData.isPublic);
      return true;
    } catch (error) {
      logger.error('Error adding issue:', error);
      return false;
    }
  };

  const handleArchive = async (issueId: string) => {
    try {
      await archiveIssue(issueId);
    } catch (error) {
      logger.error('Error archiving issue:', error);
    }
  };

  const handleEditIssue = (issue: DatabaseIssue) => {
    setEditingIssue(issue);
  };

  const handleSaveIssue = async (updates: Partial<DatabaseIssue>) => {
    if (!editingIssue) return false;
    try {
      await updateIssue(editingIssue.id, updates);
      setEditingIssue(null);
      return true;
    } catch (error) {
      logger.error('Error updating issue:', error);
      return false;
    }
  };

  if (!teamId) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8 text-muted-foreground">
          <p>Please select a team to manage issues.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div></div>
        <Button onClick={handleAdd} variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground hover:text-foreground">
          <Plus className="h-4 w-4 mr-1" />
          Add Issue
        </Button>
      </div>

      <div className="space-y-1">
        {issuesWithVotes.map(issue => {
          const ownerProfile = getOwnerProfile(issue.owner_id);
          const isExpanded = expandedIssues.has(issue.id);
          const hasDescription = issue.description && issue.description.trim();

          return (
                <div key={issue.id} className="group">
                  <div 
                    className="flex items-center justify-between py-2.5 px-3 hover:bg-muted/40 -mx-3 rounded-md cursor-pointer transition-colors duration-200"
                    onClick={() => handleEditIssue(issue)}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex-1">
                        <span className="text-sm text-foreground">{issue.title}</span>
                      </div>
                      {hasDescription && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpanded(issue.id);
                          }}
                          className="h-6 w-6 p-0 hover:bg-muted"
                        >
                          <FileText className="h-4 w-4 text-muted-foreground/30" />
                        </Button>
                      )}
                      <IssueVoteButtons 
                        issueId={issue.id} 
                        teamId={teamId}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      />
                      <UserAvatar 
                        userId={issue.owner_id} 
                        fullName={ownerProfile.fullName} 
                        email={ownerProfile.email} 
                        avatarUrl={ownerProfile.avatarUrl} 
                        size="sm" 
                      />
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={e => {
                        e.stopPropagation();
                        handleArchive(issue.id);
                      }} 
                      className="opacity-0 group-hover:opacity-100 h-8 w-8 p-0 text-muted-foreground hover:text-destructive transition-all ml-2"
                      title="Archive issue"
                    >
                      <Archive className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {isExpanded && hasDescription && (
                    <div className="pb-2 pl-2 pr-2">
                      <div className="text-sm text-muted-foreground border-l-2 border-muted pl-4">
                        {issue.description}
                      </div>
                    </div>
                  )}
                </div>
          );
        })}

        {issuesWithVotes.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No issues tracked yet.</p>
            <Button onClick={handleAdd} variant="ghost" size="sm" className="mt-2 text-muted-foreground hover:text-foreground">
              Add your first issue
            </Button>
          </div>
        )}
      </div>

      <AddIssueModal 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen} 
        onAdd={handleAddIssue} 
        defaultTeamId={teamId} 
        defaultIssueType="long_term" 
      />

      <EditIssueModal 
        open={!!editingIssue} 
        onOpenChange={open => !open && setEditingIssue(null)} 
        issue={editingIssue} 
        onSave={handleSaveIssue} 
      />
    </div>
  );
};