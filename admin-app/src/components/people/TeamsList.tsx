
import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTeamManagement } from '@/hooks/useTeamManagement';
import { useTeamMemberSelector } from '@/hooks/useTeamMemberSelector';
import { usePendingTeamMembers } from '@/hooks/usePendingTeamMembers';
import { Users, Edit, Trash2, Crown, ChevronDown, ChevronRight, User, UserPlus } from 'lucide-react';
import { AddTeamMemberModal } from './AddTeamMemberModal';
import { removeMemberFromTeam } from '@/services/teamMembershipOperations';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { useTeamMemberPermissions } from '@/hooks/useTeamMemberPermissions';
import { usePeopleManagement } from '@/hooks/usePeopleManagement';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/utils/logger';

interface TeamsListProps {
  onAddMember: () => void;
  onCreateTeam: () => void;
  onUpdateTeam: (teamId: string, updates: {
    name?: string;
    description?: string;
  }) => Promise<void>;
  onEditTeam: (team: any) => void;
  onDeleteTeam: (team: any) => void;
  onDataChange?: () => void; // Add callback for data changes
}

export const TeamsList: React.FC<TeamsListProps> = ({
  onAddMember,
  onCreateTeam,
  onUpdateTeam,
  onEditTeam,
  onDeleteTeam,
  onDataChange
}) => {
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [addMemberModalOpen, setAddMemberModalOpen] = useState(false);
  const [selectedTeamForAddMember, setSelectedTeamForAddMember] = useState<any>(null);
  const [activeMemberCounts, setActiveMemberCounts] = useState<{ [teamId: string]: number }>({});
  const [removingMemberIds, setRemovingMemberIds] = useState<Set<string>>(new Set());
  const [optimisticMemberCounts, setOptimisticMemberCounts] = useState<{ [teamId: string]: number }>({});
  const [optimisticMembers, setOptimisticMembers] = useState<{ [teamId: string]: any[] }>({});
  const { toast } = useToast();
  const { currentCompany } = useMultiCompany();
  const { user } = useAuth();
  
  const {
    teams,
    loading,
    refetch
  } = useTeamManagement();

const { users: teamMembers, loading: membersLoading, refresh: refreshTeamMembers } = useTeamMemberSelector(expandedTeamId);
  const { pendingMembers, loading: pendingLoading, refetch: refetchPendingMembers } = usePendingTeamMembers(expandedTeamId);
  const { canRemoveMembers } = useTeamMemberPermissions(expandedTeamId);
  const { hasManagerAccess } = usePeopleManagement();

  // Clean up removingMemberIds when members are confirmed gone from backend
  useEffect(() => {
    if (!teamMembers || removingMemberIds.size === 0) return;
    
    const currentMemberIds = new Set(teamMembers.map(m => m.id));
    const membersToRemove: string[] = [];
    
    // Check which removing members are now confirmed gone from backend
    removingMemberIds.forEach(memberId => {
      if (!currentMemberIds.has(memberId)) {
        membersToRemove.push(memberId);
      }
    });
    
    // Clean up confirmed removals
    if (membersToRemove.length > 0) {
      setRemovingMemberIds(prev => {
        const newSet = new Set(prev);
        membersToRemove.forEach(id => newSet.delete(id));
        return newSet;
      });
    }
  }, [teamMembers, removingMemberIds]);


  // Sort team members: current user first, then alphabetically
  // Also filter out members being optimistically removed
  // Use optimistic members if available
  const sortedTeamMembers = useMemo(() => {
    const membersToUse = expandedTeamId && optimisticMembers[expandedTeamId] 
      ? optimisticMembers[expandedTeamId]
      : teamMembers;
      
    if (!membersToUse || !user) return membersToUse;
    
    return [...membersToUse]
      .filter(member => !removingMemberIds.has(member.id))
      .sort((a, b) => {
        // Current user comes first
        if (a.id === user.id) return -1;
        if (b.id === user.id) return 1;
        
        // Then sort alphabetically by full name
        return a.full_name.localeCompare(b.full_name);
      });
  }, [teamMembers, user, removingMemberIds, expandedTeamId, optimisticMembers]);

  // Unified display type for active + pending members
  type DisplayMember = {
    id: string;
    uniqueKey: string;
    full_name: string;
    email: string;
    avatar_url?: string;
    is_active: boolean;
    isPending: boolean;
  };

  // Merge active and pending members into single sorted list
  const displayMembers = useMemo((): DisplayMember[] => {
    const activeList: DisplayMember[] = (sortedTeamMembers || []).map(m => ({
      id: m.id,
      uniqueKey: `active-${m.id}`,
      full_name: m.full_name,
      email: m.email,
      avatar_url: m.avatar_url,
      is_active: m.is_active !== false,
      isPending: false,
    }));
    
    const pendingList: DisplayMember[] = (pendingMembers || []).map(p => ({
      id: p.id,
      uniqueKey: `pending-${p.id}`,
      full_name: p.full_name || 'Invited User',
      email: p.email,
      avatar_url: undefined,
      is_active: true,
      isPending: true,
    }));
    
    // Combine: active first (already sorted), then pending alphabetically
    return [
      ...activeList,
      ...pendingList.sort((a, b) => a.full_name.localeCompare(b.full_name))
    ];
  }, [sortedTeamMembers, pendingMembers]);

  // Load active member counts for all teams - OPTIMIZED (2 queries total)
  const loadActiveMemberCounts = async () => {
    if (!currentCompany?.id || teams.length === 0) {
      setActiveMemberCounts({});
      return;
    }

    try {
      const teamIds = teams.map(t => t.id);
      
      // Query 1: Get ALL team members for ALL teams at once
      const { data: allMembers, error: membersError } = await supabase
        .from('team_members')
        .select('team_id, user_id')
        .in('team_id', teamIds);
      
      if (membersError) throw membersError;
      
      // Query 2: Get ALL active company members at once
      const { data: activeMembers, error: activeError } = await supabase
        .from('company_members')
        .select('user_id')
        .eq('company_id', currentCompany?.id)
        .eq('status', 'active');
      
      if (activeError) throw activeError;
      
      // JavaScript calculation (instant, no more database queries)
      const activeUserIds = new Set(activeMembers?.map(m => m.user_id) || []);
      const counts: { [teamId: string]: number } = {};
      
      // Initialize all team counts to 0
      teamIds.forEach(teamId => {
        counts[teamId] = 0;
      });
      
      // Count active members for each team
      allMembers?.forEach(member => {
        if (activeUserIds.has(member.user_id)) {
          counts[member.team_id] = (counts[member.team_id] || 0) + 1;
        }
      });
      
      setActiveMemberCounts(counts);
    } catch (error) {
      logger.error('Error loading active member counts:', error);
      // Set all counts to 0 on error
      const counts: { [teamId: string]: number } = {};
      teams.forEach(team => {
        counts[team.id] = 0;
      });
      setActiveMemberCounts(counts);
    }
  };

  // Load active member counts when teams change
  useEffect(() => {
    loadActiveMemberCounts();
  }, [teams, currentCompany?.id]);

  const toggleTeamExpansion = (teamId: string) => {
    setExpandedTeamId(expandedTeamId === teamId ? null : teamId);
  };

  const handleAddMember = (team: any) => {
    setSelectedTeamForAddMember(team);
    setAddMemberModalOpen(true);
  };

  const handleMemberAdded = async () => {
    logger.log('TeamsList: Member added successfully, refreshing data');
    
    // Small delay to ensure database write is complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Refresh only what changed (member list and counts)
    await Promise.all([
      refreshTeamMembers?.(),
      loadActiveMemberCounts(),
    ]);
    
    onDataChange?.();
  };

  // Wrapper for onUpdateTeam with optimistic updates
  const handleOptimisticUpdate = async (
    teamId: string, 
    updates: any, 
    memberIds?: string[]
  ) => {
    // Apply optimistic updates immediately if memberIds provided
    if (memberIds !== undefined) {
      setOptimisticMemberCounts(prev => ({ ...prev, [teamId]: memberIds.length }));
      
      // If team is expanded, update the member list optimistically
      if (expandedTeamId === teamId && teamMembers) {
        const updatedMembers = teamMembers.filter(member => 
          memberIds.includes(member.id)
        );
        setOptimisticMembers(prev => ({ ...prev, [teamId]: updatedMembers }));
      }
    }

    try {
      // Call the actual update
      await onUpdateTeam(teamId, updates);
      
      // Clear optimistic state after successful update
      setOptimisticMemberCounts(prev => {
        const newCounts = { ...prev };
        delete newCounts[teamId];
        return newCounts;
      });
      setOptimisticMembers(prev => {
        const newMembers = { ...prev };
        delete newMembers[teamId];
        return newMembers;
      });
      
      // Refresh data to get accurate backend state
      await Promise.all([
        refreshTeamMembers(),
        loadActiveMemberCounts()
      ]);
    } catch (error) {
      // On error, clear optimistic updates to show real state
      setOptimisticMemberCounts(prev => {
        const newCounts = { ...prev };
        delete newCounts[teamId];
        return newCounts;
      });
      setOptimisticMembers(prev => {
        const newMembers = { ...prev };
        delete newMembers[teamId];
        return newMembers;
      });
      logger.error('Error updating team:', error);
      throw error;
    }
  };

  const handleRemoveMember = async (member: any, teamId: string) => {
    logger.log('TeamsList: Removing member optimistically:', { userId: member.id, teamId });
    
    // Optimistic update: immediately hide the member
    setRemovingMemberIds(prev => new Set(prev).add(member.id));
    
    // Make the API call in the background
    const success = await removeMemberFromTeam({ 
      userId: member.id, 
      teamId, 
      toast 
    });
    
    if (success) {
      logger.log('TeamsList: Member removed successfully, triggering refresh');
      // Immediately refresh the specific team members data
      refreshTeamMembers?.();
      // Refresh the team list
      refetch();
      // Refresh active member counts
      loadActiveMemberCounts();
      // Trigger parent data refresh
      onDataChange?.();
      
      // Note: removingMemberIds will be automatically cleaned up by the useEffect
      // when the refetched teamMembers confirms the member is gone
    } else {
      // Rollback: show the member again if removal failed
      setRemovingMemberIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(member.id);
        return newSet;
      });
    }
  };

  // Handle removing pending members (different logic - updates invitations and company_members)
  const handleRemovePendingMember = async (member: DisplayMember, teamId: string) => {
    logger.log('TeamsList: Removing pending member from team:', { 
      invitationId: member.id, 
      email: member.email, 
      teamId 
    });
    
    try {
      // Step 1: Query invitations table first — this is the source of truth for
      // usePendingTeamMembers (member.id is the invitation id)
      const { data: invitationData, error: invFetchError } = await supabase
        .from('invitations')
        .select('id, team_ids')
        .eq('id', member.id)
        .eq('company_id', currentCompany!.id)
        .in('status', ['pending', 'sent'])
        .maybeSingle();

      if (invFetchError) {
        logger.error('Error fetching invitation:', invFetchError);
        throw new Error('Could not find pending invitation');
      }

      if (!invitationData) {
        logger.error('Invitation not found');
        throw new Error('Could not find pending invitation');
      }

      // Step 2: Filter out the team being removed
      const currentTeamIds: string[] = Array.isArray(invitationData.team_ids) 
        ? invitationData.team_ids 
        : [];
      const newTeamIds = currentTeamIds.filter(id => id !== teamId);

      logger.log('TeamsList: Updating team_ids:', { 
        currentTeamIds, 
        newTeamIds, 
        removingTeamId: teamId 
      });

      // Step 3: Update invitations.team_ids (primary source of truth)
      const { error: invUpdateError } = await supabase
        .from('invitations')
        .update({ 
          team_ids: newTeamIds.length > 0 ? newTeamIds : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', invitationData.id);

      if (invUpdateError) {
        logger.error('Error updating invitations:', invUpdateError);
        throw invUpdateError;
      }

      // Step 4: Mirror update to company_members for consistency (non-critical)
      const { error: cmError } = await supabase
        .from('company_members')
        .update({ 
          team_ids: newTeamIds.length > 0 ? newTeamIds : null,
          updated_at: new Date().toISOString()
        })
        .eq('email', member.email)
        .eq('company_id', currentCompany!.id)
        .eq('status', 'pending');

      if (cmError) {
        // Non-critical: log but do not throw — invitations is already updated
        logger.warn('Warning: Could not mirror update to company_members:', cmError);
      }
      
      toast({
        title: "Success",
        description: `${member.full_name || member.email} removed from team pre-assignment`,
      });
      
      // Refresh pending members list and counts
      refetchPendingMembers?.();
      loadActiveMemberCounts();
      onDataChange?.();
      
    } catch (error) {
      logger.error('Error removing pending member from team:', error);
      toast({
        title: "Error",
        description: "Failed to remove pending member from team",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading teams...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {teams.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-muted rounded-[6px]">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-[16px] font-semibold mb-2">No teams yet</h3>
            <p className="text-muted-foreground">
              Create your first team to organize your company using the "Create Team" button above.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {teams.map(team => (
              <div key={team.id} className="border rounded-lg overflow-hidden">
                <div
                  className="flex items-center justify-between p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => toggleTeamExpansion(team.id)}
                >
                  {/* Left section: Expand icon, team icon, name, and badges */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Expand/Collapse Icon */}
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" aria-label={expandedTeamId === team.id ? "Collapse team" : "Expand team"}>
                      {expandedTeamId === team.id ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                    
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {team.is_leadership ? (
                        <Crown className="h-4 w-4 text-warning dark:text-yellow-400" />
                      ) : (
                        <Users className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="font-medium text-foreground truncate">{team.name}</span>
                      
                      {team.is_leadership && (
                        <Badge variant="outline" className="text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700 bg-warning/5 dark:bg-yellow-900/20 text-xs">
                          <Crown className="h-3 w-3 mr-1" />
                          Leadership
                        </Badge>
                      )}
                      
                       <Badge variant="secondary" className="text-xs flex-shrink-0">
                          {expandedTeamId === team.id 
                            ? `${displayMembers.length} members` 
                            : `${optimisticMemberCounts[team.id] ?? activeMemberCounts[team.id] ?? 0} members`}
                        </Badge>
                    </div>
                  </div>

                  {/* Right section: Actions - Only show for managers and above */}
                  {hasManagerAccess && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditTeam(team);
                        }} 
                        className="h-8 w-8 p-0 hover:bg-muted"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteTeam(team);
                        }} 
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Expanded Members List */}
                {expandedTeamId === team.id && (
                  <div className="border-t bg-muted/25 p-3">
                    {membersLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        <span className="ml-2 text-sm text-muted-foreground">Loading members...</span>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium text-muted-foreground">
                            Team Members ({displayMembers.length})
                          </h4>
                          {hasManagerAccess && (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddMember(team);
                              }}
                              className="h-7 text-xs"
                            >
                              <UserPlus className="h-3 w-3 mr-1" />
                              Add Member
                            </Button>
                          )}
                        </div>
                        
                        {displayMembers.length === 0 ? (
                          <div className="text-center py-4">
                            <User className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">No members in this team</p>
                            {hasManagerAccess && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddMember(team);
                                }}
                                className="mt-2 text-xs"
                              >
                                Add first member
                              </Button>
                            )}
                          </div>
                        ) : (
                          <div className="grid gap-2">
                            {displayMembers.map(member => (
                              <div 
                                key={member.uniqueKey} 
                                className={`flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 group ${!member.is_active ? 'opacity-60' : ''} ${member.isPending ? 'bg-muted/30' : ''}`}
                              >
                                <Avatar className={`h-6 w-6 ${!member.is_active ? 'grayscale' : ''} ${member.isPending ? 'opacity-60' : ''}`}>
                                  {member.avatar_url && <AvatarImage src={member.avatar_url} alt={member.full_name} />}
                                  <AvatarFallback className={`text-xs ${member.isPending ? 'bg-muted' : ''}`}>
                                    {(member.full_name || '?').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className={`text-sm font-medium truncate ${!member.is_active ? 'line-through' : ''} ${member.isPending ? 'text-muted-foreground' : ''}`}>
                                      {member.full_name}
                                    </p>
                                    {member.isPending && (
                                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-700">
                                        Pending
                                      </Badge>
                                    )}
                                    {!member.is_active && !member.isPending && (
                                      <Badge variant="secondary" className="text-xs text-muted-foreground">
                                        Inactive
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                                </div>
                                {/* Remove button for both active and pending members */}
                                {canRemoveMembers && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (member.isPending) {
                                        handleRemovePendingMember(member, team.id);
                                      } else {
                                        handleRemoveMember({ id: member.id, full_name: member.full_name }, team.id);
                                      }
                                    }}
                                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Team Member Modal */}
      {selectedTeamForAddMember && (
        <AddTeamMemberModal
          open={addMemberModalOpen}
          onOpenChange={setAddMemberModalOpen}
          teamId={selectedTeamForAddMember.id}
          teamName={selectedTeamForAddMember.name}
          onMemberAdded={handleMemberAdded}
        />
      )}
    </>
  );
};
