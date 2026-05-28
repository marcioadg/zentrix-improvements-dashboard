import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { useCompanyUsers } from '@/hooks/useCompanyUsers';
import { useTeamMemberSelector } from '@/hooks/useTeamMemberSelector';
import { usePendingTeamMembers } from '@/hooks/usePendingTeamMembers';
import { addMemberToTeam, removeMemberFromTeam } from '@/services/teamMembershipOperations';
import { useToast } from '@/hooks/use-toast';
import { Users, UserPlus, Search, Loader2, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { teamMembersCache } from '@/hooks/useTeamMembersCache';
import { UserAvatar } from '@/components/UserAvatar';
import { useTeamMemberPermissions } from '@/hooks/useTeamMemberPermissions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { logger } from '@/utils/logger';

interface AddTeamMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  teamName: string;
  onMemberAdded?: () => void;
}

interface DisplayUser {
  id: string;
  uniqueKey: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  isPending: boolean;
}

export const AddTeamMemberModal: React.FC<AddTeamMemberModalProps> = ({
  open,
  onOpenChange,
  teamId,
  teamName,
  onMemberAdded
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentCompany } = useMultiCompany();
  
  const { users: companyUsers, loading: companyUsersLoading, refetch: refetchCompanyUsers } = useCompanyUsers();
  const { users: currentTeamMembers, loading: teamMembersLoading, refresh: refreshTeamMembers } = useTeamMemberSelector(teamId);
  const { pendingMembers: currentPendingMembers, refetch: refetchPendingMembers } = usePendingTeamMembers(teamId);
  const { canRemoveMembers } = useTeamMemberPermissions(teamId);

  const [searchQuery, setSearchQuery] = useState('');
  const [addedMembers, setAddedMembers] = useState<Set<string>>(new Set());
  const [addedPendingEmails, setAddedPendingEmails] = useState<Set<string>>(new Set());
  const [addingMember, setAddingMember] = useState<string | null>(null);
  const [showCurrentMembers, setShowCurrentMembers] = useState(false);
  const [removingMember, setRemovingMember] = useState<string | null>(null);
  
  // Separate users by status - active users have user_id, pending don't
  const activeUsers = companyUsers.filter(user => user.user_id != null);
  const pendingUsers = companyUsers.filter(user => user.user_id == null);
  
  // Get IDs of current team members to filter them out (these are auth.users UUIDs)
  const currentMemberIds = currentTeamMembers.map(member => member.id);
  
  // Get emails of pending members already assigned to this team
  const currentPendingEmails = currentPendingMembers.map(m => m.email);
  
  // Filter out users who are already members of the team (excluding those just added in this session)
  const availableActiveUsers = activeUsers.filter(user => 
    !currentMemberIds.includes(user.user_id!) && !addedMembers.has(user.user_id!)
  );
  
  // Pending users available to add (not already pre-assigned to this team)
  const availablePendingUsers = pendingUsers.filter(user => 
    !currentPendingEmails.includes(user.email) && !addedPendingEmails.has(user.email)
  );

  // Filter by search query and combine into unified list
  const filteredActiveUsers: DisplayUser[] = availableActiveUsers
    .filter(user => {
      const query = searchQuery.toLowerCase();
      return (
        user.full_name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query)
      );
    })
    .map(user => ({
      id: user.user_id!,
      uniqueKey: `active-${user.user_id}`,
      email: user.email,
      full_name: user.full_name || 'Unknown',
      avatar_url: user.avatar_url,
      isPending: false,
    }));

  const filteredPendingUsers: DisplayUser[] = availablePendingUsers
    .filter(user => {
      const query = searchQuery.toLowerCase();
      return (
        user.full_name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query)
      );
    })
    .map(user => ({
      id: user.id,
      uniqueKey: `pending-${user.id}`,
      email: user.email,
      full_name: user.full_name || 'Invited User',
      avatar_url: user.avatar_url,
      isPending: true,
    }));

  // Combine: active first, then pending
  const allAvailableUsers = [...filteredActiveUsers, ...filteredPendingUsers];

  // Combine current members: active first, then pending
  const allCurrentMembers = [
    ...currentTeamMembers.map(m => ({
      id: m.id,
      uniqueKey: `active-${m.id}`,
      email: m.email,
      full_name: m.full_name || 'Unknown',
      avatar_url: m.avatar_url,
      isPending: false,
    })),
    ...currentPendingMembers.map(m => ({
      id: m.id,
      uniqueKey: `pending-${m.id}`,
      email: m.email,
      full_name: m.full_name || 'Invited User',
      avatar_url: undefined,
      isPending: true,
    })),
  ];
  
  // Force fresh data when modal opens
  useEffect(() => {
    if (open) {
      logger.log('AddTeamMemberModal: Modal opened, fetching fresh data');
      refetchCompanyUsers();
      refetchPendingMembers();
      teamMembersCache.invalidate(`team-member-selector-${teamId}`);
      // Reset session state
      setAddedMembers(new Set());
      setAddedPendingEmails(new Set());
      setSearchQuery('');
    }
  }, [open, teamId, refetchCompanyUsers, refetchPendingMembers]);

  const handleAddMember = async (userId: string) => {
    if (addingMember) return;
    
    setAddingMember(userId);
    
    try {
      const success = await addMemberToTeam({ userId, teamId, toast });
      
      if (success) {
        setAddedMembers(prev => new Set([...prev, userId]));
        await queryClient.invalidateQueries({ queryKey: ['company-users'] });
        await queryClient.invalidateQueries({ queryKey: ['profiles'] });
        teamMembersCache.invalidate(`team-member-selector-${teamId}`);
        onMemberAdded?.();
      }
    } catch (error) {
      logger.error('Error adding member:', error);
    } finally {
      setAddingMember(null);
    }
  };

  const handleAddPendingMember = async (user: DisplayUser) => {
    if (addingMember || !currentCompany?.id) return;
    
    setAddingMember(user.uniqueKey);
    
    try {
      logger.log('AddTeamMemberModal: Adding pending member to team:', { email: user.email, teamId });
      
      // Step 1: Get current team_ids from company_members by email
      const { data: memberData, error: fetchError } = await supabase
        .from('company_members')
        .select('id, team_ids')
        .eq('email', user.email)
        .eq('company_id', currentCompany?.id)
        .eq('status', 'pending')
        .maybeSingle();
      
      if (fetchError || !memberData) {
        throw new Error('Could not find pending member');
      }
      
      // Step 2: Add team to the existing team_ids array
      const currentTeamIds: string[] = Array.isArray(memberData.team_ids) 
        ? memberData.team_ids 
        : [];
      
      if (currentTeamIds.includes(teamId)) {
        toast({
          title: "Already Assigned",
          description: `${user.full_name} is already pre-assigned to this team`,
        });
        return;
      }
      
      const newTeamIds = [...currentTeamIds, teamId];
      
      // Step 3: Update company_members.team_ids
      const { error: cmError } = await supabase
        .from('company_members')
        .update({ 
          team_ids: newTeamIds,
          updated_at: new Date().toISOString()
        })
        .eq('email', user.email)
        .eq('company_id', currentCompany?.id)
        .eq('status', 'pending');
      
      if (cmError) throw cmError;
      
      // Step 4: Update invitations.team_ids for consistency
      await supabase
        .from('invitations')
        .update({ 
          team_ids: newTeamIds,
          updated_at: new Date().toISOString()
        })
        .eq('email', user.email)
        .eq('company_id', currentCompany?.id)
        .in('status', ['pending', 'sent']);
      
      // Track as added this session
      setAddedPendingEmails(prev => new Set([...prev, user.email]));
      
      toast({
        title: "Member Pre-Assigned",
        description: `${user.full_name} will be added to ${teamName} when they accept their invitation`,
      });
      
      refetchPendingMembers();
      onMemberAdded?.();
      
    } catch (error) {
      logger.error('Error adding pending member to team:', error);
      toast({
        title: "Error",
        description: "Failed to pre-assign member to team",
        variant: "destructive",
      });
    } finally {
      setAddingMember(null);
    }
  };

  const handleRemoveMember = async (member: DisplayUser) => {
    if (removingMember) return;
    
    setRemovingMember(member.uniqueKey);
    
    const success = await removeMemberFromTeam({ 
      userId: member.id, 
      teamId, 
      toast 
    });
    
    if (success) {
      teamMembersCache.invalidate(`team-member-selector-${teamId}`);
      refreshTeamMembers?.();
      onMemberAdded?.();
    }
    
    setRemovingMember(null);
  };

  const handleRemovePendingMember = async (member: DisplayUser) => {
    if (removingMember || !currentCompany?.id) return;
    
    setRemovingMember(member.uniqueKey);
    
    try {
      // Step 1: Get current team_ids from company_members by email
      const { data: memberData, error: fetchError } = await supabase
        .from('company_members')
        .select('id, team_ids')
        .eq('email', member.email)
        .eq('company_id', currentCompany?.id)
        .eq('status', 'pending')
        .maybeSingle();
      
      if (fetchError || !memberData) {
        throw new Error('Could not find pending member');
      }
      
      // Step 2: Filter out the team being removed
      const currentTeamIds: string[] = Array.isArray(memberData.team_ids) 
        ? memberData.team_ids 
        : [];
      const newTeamIds = currentTeamIds.filter(id => id !== teamId);
      
      // Step 3: Update company_members.team_ids
      const { error: cmError } = await supabase
        .from('company_members')
        .update({ 
          team_ids: newTeamIds.length > 0 ? newTeamIds : null,
          updated_at: new Date().toISOString()
        })
        .eq('email', member.email)
        .eq('company_id', currentCompany?.id)
        .eq('status', 'pending');
      
      if (cmError) throw cmError;
      
      // Step 4: Update invitations.team_ids for consistency
      await supabase
        .from('invitations')
        .update({ 
          team_ids: newTeamIds.length > 0 ? newTeamIds : null,
          updated_at: new Date().toISOString()
        })
        .eq('email', member.email)
        .eq('company_id', currentCompany?.id)
        .in('status', ['pending', 'sent']);
      
      toast({
        title: "Pre-Assignment Removed",
        description: `${member.full_name} will no longer be added to ${teamName} when they accept`,
      });
      
      refetchPendingMembers();
      onMemberAdded?.();
      
    } catch (error) {
      logger.error('Error removing pending member from team:', error);
      toast({
        title: "Error", 
        description: "Failed to remove team pre-assignment",
        variant: "destructive",
      });
    } finally {
      setRemovingMember(null);
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setAddedMembers(new Set());
    setAddedPendingEmails(new Set());
    onOpenChange(false);
  };

  const isLoading = companyUsersLoading || teamMembersLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <UserPlus className="h-4 w-4 text-primary" />
            </div>
            <div>
              <DialogTitle>Add Members to Team</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Click on a member to add them to <span className="font-medium">{teamName}</span>
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Available Users List */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Available to add ({allAvailableUsers.length})
            </p>
            <ScrollArea className="h-64 border rounded-lg">
              {isLoading ? (
                <div className="flex items-center justify-center h-full py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : allAvailableUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">
                    {searchQuery ? 'No members match your search' : 'All company members are already in this team'}
                  </p>
                </div>
              ) : (
                <div className="p-1">
                  {allAvailableUsers.map((user) => {
                    const isAdding = addingMember === (user.isPending ? user.uniqueKey : user.id);
                    
                    return (
                      <button
                        key={user.uniqueKey}
                        onClick={() => user.isPending ? handleAddPendingMember(user) : handleAddMember(user.id)}
                        disabled={!!addingMember}
                        className="w-full flex items-center gap-3 p-2.5 rounded-md hover:bg-accent/50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {user.isPending ? (
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs bg-muted">
                              {user.full_name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '??'}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <UserAvatar
                            userId={user.id}
                            fullName={user.full_name}
                            avatarUrl={user.avatar_url}
                            size="sm"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">
                              {user.full_name}
                            </p>
                            {user.isPending && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">
                                Pending
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {user.email}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          {isAdding ? (
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          ) : (
                            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground transition-colors">
                              <UserPlus className="h-3.5 w-3.5" />
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>


          {/* Current Team Members (Collapsible) */}
          <Collapsible open={showCurrentMembers} onOpenChange={setShowCurrentMembers}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-md hover:bg-accent/50 transition-colors">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>Current team members ({allCurrentMembers.length})</span>
              </div>
              {showCurrentMembers ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ScrollArea className="h-40 mt-2 border rounded-lg bg-muted/30">
                {allCurrentMembers.length === 0 ? (
                  <div className="flex items-center justify-center h-full py-4 text-muted-foreground text-sm">
                    No members in this team yet
                  </div>
                ) : (
                  <div className="p-1">
                    {allCurrentMembers.map((member) => {
                      const isRemoving = removingMember === member.uniqueKey;
                      const isJustAdded = member.isPending 
                        ? addedPendingEmails.has(member.email)
                        : addedMembers.has(member.id);
                      
                      return (
                        <div
                          key={member.uniqueKey}
                          className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 group"
                        >
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={member.avatar_url} alt={member.full_name} />
                            <AvatarFallback className="text-xs">
                              {member.full_name?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium truncate">
                                {member.full_name}
                              </p>
                              {member.isPending && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">
                                  Pending
                                </Badge>
                              )}
                              {isJustAdded && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-success/10 text-success dark:bg-green-900/30 dark:text-green-400">
                                  New
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {member.email}
                            </p>
                          </div>
                          {canRemoveMembers && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => member.isPending ? handleRemovePendingMember(member) : handleRemoveMember(member)}
                              disabled={!!removingMember}
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              {isRemoving ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Trash2 className="h-3 w-3" />
                              )}
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CollapsibleContent>
          </Collapsible>

          {/* Footer */}
          <div className="flex justify-end pt-2 border-t">
            <Button onClick={handleClose}>
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
