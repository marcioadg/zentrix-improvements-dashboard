
import { useState, useEffect } from 'react';
import { usePeopleManagement } from '@/hooks/usePeopleManagement';
import { useToast } from '@/hooks/use-toast';
import { type UnifiedUser } from '@/hooks/useUserManagement';
import { useUserProfilePermissions } from '@/hooks/useUserProfilePermissions';
import { useUserProfileModalState } from '@/hooks/useUserProfileModalState';
import { useTeamAssignment } from '@/hooks/useTeamAssignment';
import { useTeams } from '@/hooks/useTeams';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { type UIPermissionLevel } from '@/utils/permissionMapping';
import { logger } from '@/utils/logger';

interface UseUserProfileModalProps {
  user: UnifiedUser | null;
  open: boolean;
  onUserUpdated?: () => void;
}

export const useUserProfileModal = ({ user, open, onUserUpdated }: UseUserProfileModalProps) => {
  const { handleRoleChange } = usePeopleManagement();
  const { assignUserToTeams } = useTeamAssignment();
  const { teams, refetch: refetchTeams } = useTeams();
  const { currentCompany } = useMultiCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [userCurrentTeams, setUserCurrentTeams] = useState<string[]>([]);

  // Use the smaller hooks
  const permissions = useUserProfilePermissions({ user });
  const modalState = useUserProfileModalState({ user, open });

  // Load user's current teams and refresh teams data when modal opens
  useEffect(() => {
    if (user && open) {
      // Refresh teams data to get latest teams
      refetchTeams();
      loadUserTeams();
    }
  }, [user, open, currentCompany?.id]);

  const loadUserTeams = async () => {
    if (!user || !currentCompany) {
      logger.log('🔍 useUserProfileModal: Missing prerequisites for loading teams:', {
        hasUser: !!user,
        hasCurrentCompany: !!currentCompany,
        userName: user?.full_name,
        currentCompanyName: currentCompany?.name
      });
      return;
    }
    
    try {
      // Check if this is a pending user (hasn't accepted invitation yet)
      const isPendingUser = user.status === 'pending' || !user.user_id;
      
      logger.log('🔍 useUserProfileModal: Loading teams for user:', {
        userName: user.full_name,
        userId: user.user_id,
        userStatus: user.status,
        isPendingUser,
        currentCompanyId: currentCompany?.id,
        currentCompanyName: currentCompany?.name
      });
      
      if (isPendingUser) {
        // For pending users, fetch pre-assigned teams from company_members.team_ids
        const { data: memberData, error } = await supabase
          .from('company_members')
          .select('team_ids')
          .eq('email', user.email)
          .eq('company_id', currentCompany?.id)
          .eq('status', 'pending')
          .maybeSingle();
        
        if (error) {
          logger.error('🚨 useUserProfileModal: Error loading pending user teams:', error);
          return;
        }
        
        // team_ids is JSONB, parse it as array
        const preAssignedTeamIds: string[] = Array.isArray(memberData?.team_ids) 
          ? memberData.team_ids 
          : [];
        
        logger.log('🔍 useUserProfileModal: Pending user pre-assigned teams:', {
          userName: user.full_name,
          preAssignedTeamIds,
          preAssignedTeamsCount: preAssignedTeamIds.length
        });
        
        setUserCurrentTeams(preAssignedTeamIds);
        setSelectedTeamIds(preAssignedTeamIds);
      } else {
        // For active users, use existing logic (query team_members table)
        const { data: teamMemberships, error } = await supabase
          .from('team_members')
          .select(`
            team_id, 
            teams!inner(
              id, 
              name, 
              company_id,
              companies!inner(id, name)
            )
          `)
          .eq('user_id', user.user_id);

        if (error) {
          logger.error('🚨 useUserProfileModal: Error loading user teams:', error);
          return;
        }

        logger.log('🔍 useUserProfileModal: Raw team memberships:', {
          userName: user.full_name,
          totalMemberships: teamMemberships?.length || 0,
          allMemberships: teamMemberships?.map(tm => {
            const teamsArray = Array.isArray(tm.teams) ? tm.teams : [tm.teams];
            const team = teamsArray?.[0];
            
            const companiesArray = Array.isArray(team?.companies) ? team.companies : [team?.companies];
            const company = companiesArray?.[0];
            
            return {
              teamId: tm.team_id,
              teamName: team?.name,
              teamCompanyId: team?.company_id,
              teamCompanyName: company?.name
            };
          }) || []
        });

        // Filter to current company only
        const currentCompanyTeams = teamMemberships?.filter(tm => {
          const teamsArray = Array.isArray(tm.teams) ? tm.teams : [tm.teams];
          const team = teamsArray?.[0];
          
          return team?.company_id === currentCompany?.id;
        }) || [];

        const currentTeamIds = currentCompanyTeams.map(tm => tm.team_id);
        
        logger.log('🔍 useUserProfileModal: Filtered teams for current company:', {
          userName: user.full_name,
          currentCompanyName: currentCompany?.name,
          currentCompanyId: currentCompany?.id,
          filteredTeamsCount: currentCompanyTeams.length,
          currentTeamIds,
          filteredTeams: currentCompanyTeams.map(tm => {
            const teamsArray = Array.isArray(tm.teams) ? tm.teams : [tm.teams];
            const team = teamsArray?.[0];
            
            return {
              teamId: tm.team_id,
              teamName: team?.name
            };
          })
        });
        
        setUserCurrentTeams(currentTeamIds);
        setSelectedTeamIds(currentTeamIds);

        logger.log('🔍 useUserProfileModal: Team state updated:', {
          userName: user.full_name,
          userCurrentTeams: currentTeamIds,
          selectedTeamIds: currentTeamIds
        });
      }
    } catch (error) {
      logger.error('🚨 useUserProfileModal: Error in loadUserTeams:', error);
    }
  };

  const handleCancel = () => {
    modalState.handleCancel(() => {
      logger.log('🔍 useUserProfileModal: Canceling modal, resetting team selections:', {
        userName: user?.full_name,
        originalTeamIds: userCurrentTeams,
        resettingTo: userCurrentTeams
      });
      // Reset team selections to original state
      setSelectedTeamIds(userCurrentTeams);
    });
  };

  const handleSave = async () => {
    if (!user) return;

    modalState.setLoading(true);
    try {
      logger.log('🔍 useUserProfileModal: Saving changes for user:', {
        userName: user.full_name,
        userId: user.id,
        selectedRole: modalState.selectedRole,
        originalRole: user.role,
        selectedTeamIds,
        originalTeamIds: userCurrentTeams,
        currentCompanyId: currentCompany?.id,
        currentCompanyName: currentCompany?.name
      });

      let hasChanges = false;

      // Update role if changed and user can edit roles
      if (modalState.selectedRole !== user.role && permissions.canEditRole) {
        logger.log('🔍 useUserProfileModal: Updating role:', {
          userName: user.full_name,
          from: user.role,
          to: modalState.selectedRole
        });
        await handleRoleChange(user.id, 'permission_level', modalState.selectedRole as UIPermissionLevel);
        hasChanges = true;
      }

      // Update team memberships if user can edit teams and teams have changed
      if (permissions.canEditTeams) {
        const teamsChanged = 
          selectedTeamIds.length !== userCurrentTeams.length ||
          selectedTeamIds.some(id => !userCurrentTeams.includes(id)) ||
          userCurrentTeams.some(id => !selectedTeamIds.includes(id));

        logger.log('🔍 useUserProfileModal: Team change analysis:', {
          userName: user.full_name,
          teamsChanged,
          selectedCount: selectedTeamIds.length,
          originalCount: userCurrentTeams.length,
          selectedTeamIds,
          originalTeamIds: userCurrentTeams,
          addedTeams: selectedTeamIds.filter(id => !userCurrentTeams.includes(id)),
          removedTeams: userCurrentTeams.filter(id => !selectedTeamIds.includes(id))
        });

        if (teamsChanged) {
          const isPendingUser = user.status === 'pending' || !user.user_id;
          
          if (isPendingUser) {
            logger.log('🔍 useUserProfileModal: Updating pre-assigned teams for pending user:', {
              email: user.email,
              newTeamIds: selectedTeamIds,
              newTeamCount: selectedTeamIds.length
            });
            
            // Update company_members.team_ids (primary source)
            const { error: cmError } = await supabase
              .from('company_members')
              .update({ 
                team_ids: selectedTeamIds.length > 0 ? selectedTeamIds : null,
                updated_at: new Date().toISOString()
              })
              .eq('email', user.email)
              .eq('company_id', currentCompany!.id)
              .eq('status', 'pending');
            
            if (cmError) {
              logger.error('🚨 useUserProfileModal: Error updating company_members.team_ids:', cmError);
              throw cmError;
            }
            
            // Also update invitations table for consistency (non-critical)
            const { error: invError } = await supabase
              .from('invitations')
              .update({ 
                team_ids: selectedTeamIds.length > 0 ? selectedTeamIds : null,
                updated_at: new Date().toISOString()
              })
              .eq('email', user.email)
              .eq('company_id', currentCompany!.id)
              .in('status', ['pending', 'sent']);
            
            if (invError) {
              logger.warn('⚠️ useUserProfileModal: Non-critical - Could not update invitations.team_ids:', invError);
            }
            
            hasChanges = true;
            setUserCurrentTeams(selectedTeamIds);
            
            toast({
              title: "Success",
              description: `Pre-assigned teams updated for ${user.full_name || user.email}. Changes will take effect when they accept the invitation.`,
            });

            logger.log('✅ useUserProfileModal: Pre-assigned teams updated successfully:', {
              userName: user.full_name,
              email: user.email,
              newTeamCount: selectedTeamIds.length,
              newTeamIds: selectedTeamIds
            });
          } else {
            logger.log('🔍 useUserProfileModal: Teams changed, updating assignments for active user');
            
            const teamChanges = await assignUserToTeams(user.user_id, selectedTeamIds);
            if (teamChanges) {
              hasChanges = true;
              setUserCurrentTeams(selectedTeamIds);
              
              toast({
                title: "Success",
                description: `Team assignments updated successfully. User ${user.full_name} is now assigned to ${selectedTeamIds.length} team${selectedTeamIds.length !== 1 ? 's' : ''}.`,
              });

              logger.log('✅ useUserProfileModal: Team assignments updated successfully:', {
                userName: user.full_name,
                newTeamCount: selectedTeamIds.length,
                newTeamIds: selectedTeamIds
              });

              // CRITICAL: Direct team query invalidation for immediate UI sync
              logger.log('🔄 useUserProfileModal: Invalidating team queries for immediate UI sync');
              setTimeout(() => {
                queryClient.invalidateQueries({ queryKey: ['teams'] });
                queryClient.invalidateQueries({ queryKey: ['team-management'] });
                queryClient.invalidateQueries({ queryKey: ['team-members'] });
                queryClient.invalidateQueries({ queryKey: ['optimized-user-teams'] });
                queryClient.invalidateQueries({ queryKey: ['unified-users'] });
              }, 100);
            } else {
              // Team assignment failed, refresh team data to show correct state
              logger.log('🔄 useUserProfileModal: Team assignment failed, refreshing team data from database');
              await loadUserTeams();
            }
          }
        }
      }

      if (hasChanges && onUserUpdated) {
        logger.log('🔍 useUserProfileModal: Changes made, triggering onUserUpdated callback');
        // Add delay to ensure database changes are committed before callback
        setTimeout(() => {
          onUserUpdated();
        }, 200);
      }
    } catch (error) {
      logger.error('🚨 useUserProfileModal: Error updating user profile:', error);
      toast({
        title: "Error",
        description: "Failed to update user profile",
        variant: "destructive",
      });
    } finally {
      modalState.setLoading(false);
    }
  };

  const handleTeamToggle = (teamId: string) => {
    setSelectedTeamIds(prev => {
      const newSelection = prev.includes(teamId) 
        ? prev.filter(id => id !== teamId)
        : [...prev, teamId];
        
      logger.log('🔍 useUserProfileModal: Team toggled:', {
        userName: user?.full_name,
        teamId,
        wasSelected: prev.includes(teamId),
        newSelection,
        availableTeam: teams.find(t => t.id === teamId)?.name
      });
      
      return newSelection;
    });
  };

  // Create display teams from user's current memberships
  const displayUserTeams = userCurrentTeams
    .map(teamId => {
      const team = teams.find(t => t.id === teamId);
      return {
        team_id: teamId,
        teams: team ? { name: team.name } : undefined
      };
    }).filter(t => t.teams); // Only include teams that we found

  logger.log('🔍 useUserProfileModal: Current state summary:', {
    userName: user?.full_name,
    currentCompanyName: currentCompany?.name,
    availableTeamsCount: teams.length,
    userCurrentTeamsCount: userCurrentTeams.length,
    selectedTeamIdsCount: selectedTeamIds.length,
    displayUserTeamsCount: displayUserTeams.length,
    canEditTeams: permissions.canEditTeams
  });

  return {
    selectedRole: modalState.selectedRole,
    setSelectedRole: modalState.setSelectedRole,
    userTeams: displayUserTeams,
    selectedTeamIds,
    loading: modalState.loading,
    canEdit: permissions.canEdit,
    canEditRole: permissions.canEditRole,
    canEditTeams: permissions.canEditTeams,
    availableTeams: teams,
    displayUserTeams,
    handleCancel,
    handleSave,
    handleTeamToggle,
    currentCompany: modalState.currentCompany
  };
};
