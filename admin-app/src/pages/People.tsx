
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { PeopleTab } from '@/components/people/tabs/PeopleTab';
import { AnalyzerTab } from '@/components/people/tabs/AnalyzerTab';
import { TeamsTab } from '@/components/people/tabs/TeamsTab';
import { DraggableTabs } from '@/components/people/tabs/DraggableTabs';
import { PeopleModals } from '@/components/people/modals/PeopleModals';
import { TeamsModals } from '@/components/people/modals/TeamsModals';
import { PeopleHeader } from '@/components/people/PeopleHeader';
import { PeopleLoading } from '@/components/people/PeopleLoading';
import { SimpleStrategyProvider } from '@/contexts/SimpleStrategyContext';
import { useOptimizedUserTeams } from '@/hooks/useOptimizedUserTeams';
import { useSafeUserTeams } from '@/hooks/useSafeUserTeams'; // Use safe version
import { safeStorage } from '@/utils/safeStorage';
import { useTeamManagement } from '@/hooks/useTeamManagement';
import { usePeopleManagement } from '@/hooks/usePeopleManagement';
import { useTabOrder } from '@/hooks/useTabOrder';
import { useToast } from '@/hooks/use-toast';
import { UnifiedUser } from '@/hooks/useUserManagement';
import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export const People = () => {
  const [showVersionBanner, setShowVersionBanner] = useState(false);
  const [searchParams] = useSearchParams();
  const { tabs, updateTabOrder } = useTabOrder();
  const [activeTab, setActiveTab] = useState('people');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const { loading } = useSafeUserTeams(); // Use safe teams hook
  const { allTeams: teams } = useOptimizedUserTeams();
  const { createTeam, updateTeam, deleteTeam, refetch: refetchTeams } = useTeamManagement();
  const {
    handleUpdateUserName,
    handleDeactivateUser,
    handleDeleteUser,
    refetch: refetchPeople,
    invalidateAllData
  } = usePeopleManagement();
  const { toast } = useToast();

  // Modal states
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showEditName, setShowEditName] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UnifiedUser | null>(null);
  const [userToEdit, setUserToEdit] = useState<UnifiedUser | null>(null);
  const [deleteAction, setDeleteAction] = useState<'deactivate' | 'delete' | 'reactivate'>('deactivate');
  const [isDeleting, setIsDeleting] = useState(false);

  // Team modal states
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showEditTeam, setShowEditTeam] = useState(false);
  const [showDeleteTeam, setShowDeleteTeam] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [deletingTeam, setDeletingTeam] = useState(null);

  // Version check
  useEffect(() => {
    const checkVersion = async () => {
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('system_version')
          .eq('setting_key', 'app_version')
          .single();

        if (error) return;

        if (data?.system_version && data.system_version !== "1.2") {
          setShowVersionBanner(true);
        }
      } catch {
        // Silently handle version check failures
      }
    };
    checkVersion();
  }, []);

  // Handle URL tab parameter and hash fragment
  useEffect(() => {
    // Check for tab parameter in search params
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      // Map the URL parameter to the correct tab value
      if (tabParam === 'team') {
        setActiveTab('teams');
      } else if (tabParam === 'people') {
        setActiveTab('people');
      } else if (tabParam === 'analyzer') {
        setActiveTab('analyzer');
      }
    }
    
    // Also check for hash fragment
    const hash = window.location.hash.substring(1); // Remove the '#'
    if (hash) {
      if (hash === 'teams') {
        setActiveTab('teams');
      } else if (hash === 'people') {
        setActiveTab('people');
      } else if (hash === 'analyzer') {
        setActiveTab('analyzer');
      }
    }
  }, [searchParams]);

  // Auto-select team for strategy context (same logic as Strategy page)
  React.useEffect(() => {
    if (teams.length > 0 && !selectedTeamId) {
      // Try to get last selected team from localStorage
      const lastSelectedTeam = safeStorage.getItem('strategy-selected-team');
      
      if (lastSelectedTeam && teams.find(t => t.id === lastSelectedTeam)) {
        setSelectedTeamId(lastSelectedTeam);
      } else {
        setSelectedTeamId(teams[0].id);
      }
    }
  }, [teams, selectedTeamId]);

  if (loading) {
    return <PeopleLoading />;
  }

  // ENHANCED: Immediate comprehensive data refresh for two-way sync
  const handleComprehensiveDataRefresh = () => {
    logger.debug('People: Triggering immediate comprehensive data refresh for two-way sync');
    
    if (invalidateAllData) {
      logger.log('🔄 People: Using immediate invalidateAllData refresh');
      invalidateAllData();
    } else {
      logger.log('🔄 People: Fallback to individual refetch calls');
      refetchPeople();
      refetchTeams();
    }
  };

  const handleUserClick = (user: UnifiedUser) => {
    setSelectedUser(user);
    setShowUserProfile(true);
  };

  const handleEditName = (user: UnifiedUser) => {
    setUserToEdit(user);
    setShowEditName(true);
  };

  const handleDeactivateUserAction = (user: UnifiedUser) => {
    logger.log('🔍 People: handleDeactivateUserAction called with user:', user);
    logger.log('🔍 People: User data structure:', {
      user_id: user.user_id,
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      status: user.status,
      permission_level: user.permission_level
    });
    
    // Check if user is currently inactive to determine if this is reactivation
    const isInactive = user?.status === 'inactive' || user?.role === 'inactive' || user?.permission_level === 'inactive';
    
    if (isInactive) {
      logger.debug('People: Reactivating user', { name: user.full_name, id: user.user_id });
      setDeleteAction('reactivate');
    } else {
      logger.debug('People: Deactivating user', { name: user.full_name, id: user.user_id });
      setDeleteAction('deactivate');
    }
    
    setUserToEdit(user);
    setShowDeleteConfirm(true);
  };

  const handleDeleteUserAction = (user: UnifiedUser) => {
    logger.debug('People: Deleting user', { name: user.full_name, id: user.user_id });
    setUserToEdit(user);
    setDeleteAction('delete');
    setShowDeleteConfirm(true);
  };

  const handleAddMember = () => {
    setShowAddMember(true);
  };

  const handleCreateTeam = () => {
    setShowCreateTeam(true);
  };


  const handleUpdateTeam = async (teamId: string, updates: { name?: string; is_leadership?: boolean }) => {
    try {
      await updateTeam(teamId, updates);
      logger.debug('People: Team updated, triggering refresh');
      handleComprehensiveDataRefresh();
    } catch (error) {
      logger.error('Error updating team', error);
    }
  };

  const handleEditTeam = (team: any) => {
    setEditingTeam(team);
    setShowEditTeam(true);
  };

  const handleDeleteTeam = (team: any) => {
    setDeletingTeam(team);
    setShowDeleteTeam(true);
  };

  const handleSaveName = async (newName: string): Promise<boolean> => {
    if (!userToEdit) return false;
    // Use user_id for active users, id (company_members.id) for declined/pending users
    const userId = userToEdit.user_id || userToEdit.id;
    const success = await handleUpdateUserName(userId, newName);
    if (success) {
      logger.debug('People: Name updated, triggering immediate refresh');
      handleComprehensiveDataRefresh();
    }
    return success;
  };

  const resetDeleteModalState = () => {
    setShowDeleteConfirm(false);
    setUserToEdit(null);
    setDeleteAction('deactivate');
    setIsDeleting(false);
  };

  // ENHANCED: Immediate deletion handling with better error management
  const handleConfirmAction = async () => {
    if (!userToEdit) {
      logger.error('People: No user to edit when confirming action');
      return;
    }
    
    logger.debug(`People: Starting ${deleteAction} for user`, { name: userToEdit.full_name, id: userToEdit.user_id });
    setIsDeleting(true);
    
    try {
      if (deleteAction === 'deactivate') {
        // Use user_id for active users, id (company_members.id) for declined/pending users
        const userId = userToEdit.user_id || userToEdit.id;
        await handleDeactivateUser(userId);
        logger.info('People: User deactivated successfully');
        
        toast({
          title: "User Deactivated",
          description: `${userToEdit.full_name} has been deactivated successfully.`,
        });
      } else if (deleteAction === 'reactivate') {
        // Use user_id for active users, id (company_members.id) for declined/pending users
        const userId = userToEdit.user_id || userToEdit.id;
        await handleDeactivateUser(userId); // Same function handles both deactivate and reactivate
        logger.info('People: User reactivated successfully');
        
        toast({
          title: "User Reactivated",
          description: `${userToEdit.full_name} has been reactivated successfully.`,
        });
      } else {
        // Use user_id for active users, id (company_members.id) for declined/pending users
        const userId = userToEdit.user_id || userToEdit.id;
        await handleDeleteUser(userId);
        logger.info('People: User removed from company successfully');
        
        toast({
          title: "User Removed",
          description: `${userToEdit.full_name} has been removed from the company.`,
        });
      }
      
      // Reset modal state after successful action
      resetDeleteModalState();
      
      // Note: handleDeactivateUser and handleDeleteUser now handle their own refresh
      // No need for additional refresh calls here as they include verification
      
    } catch (error) {
      logger.error(`People: Error performing ${deleteAction}`, error);
      logger.error(`❌ People: Detailed error for ${deleteAction}:`, {
        error,
        userToEdit,
        deleteAction,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      setIsDeleting(false);
      
      let errorMessage = `Failed to ${deleteAction} user. Please try again.`;
      
      if (error instanceof Error) {
        logger.log('🔍 People: Error message analysis:', error.message);
        if (error.message === 'SELF_DEACTIVATION') {
          errorMessage = "You cannot deactivate your own account.";
        } else if (error.message.includes('permission')) {
          errorMessage = `You don't have permission to ${deleteAction} this user.`;
        } else if (error.message.includes('not found')) {
          errorMessage = "User not found. They may have already been removed.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Updated callbacks to use immediate comprehensive data refresh
  const handleMemberAdded = () => {
    handleComprehensiveDataRefresh();
  };

  const handleUserUpdated = () => {
    handleComprehensiveDataRefresh();
  };


  const handleCreateTeamAction = async (name: string, memberIds?: string[], isLeadership?: boolean) => {
    try {
      await createTeam(name, undefined, memberIds, isLeadership);
      handleComprehensiveDataRefresh();
    } catch (error) {
      logger.error('Error creating team', error);
      throw error;
    }
  };

  const handleUpdateTeamAction = async (teamId: string, updates: { name?: string; is_leadership?: boolean }) => {
    try {
      await updateTeam(teamId, updates);
      handleComprehensiveDataRefresh();
    } catch (error) {
      logger.error('Error updating team', error);
      throw error;
    }
  };

  const handleDeleteTeamAction = async (teamId: string) => {
    try {
      await deleteTeam(teamId);
      handleComprehensiveDataRefresh();
    } catch (error) {
      logger.error('Error deleting team', error);
      throw error;
    }
  };

  return (
    <SimpleStrategyProvider teamId={selectedTeamId}>
      <div className="min-h-screen bg-background">
        {/* Version Banner - Small Popup */}
        {showVersionBanner && (
          <div className="fixed top-4 right-4 z-50 bg-card border border-border rounded-[6px] shadow-sm p-4 max-w-sm animate-in slide-in-from-top-2">
            <div className="flex items-start gap-3">
              <RefreshCw className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <p className="text-[13px] font-medium text-foreground">
                  New version available
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Please refresh to get the latest updates.
                </p>
                <Button 
                  onClick={() => window.location.reload()}
                  size="sm"
                  className="w-full"
                >
                  Refresh Now
                </Button>
              </div>
            </div>
          </div>
        )}
        
        <div className="w-full px-6 py-6">
          <PeopleHeader />
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-8">
            <div className="border-b border-border">
              <div className="flex space-x-6">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.value)}
                    className={`pb-2 text-[13px] font-medium border-b-2 transition-colors duration-150 ${
                      activeTab === tab.value
                        ? 'border-primary text-foreground'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <TabsContent value="people" className="m-0">
              <PeopleTab 
                onUserClick={handleUserClick}
                onEditName={handleEditName}
                onDeactivateUser={handleDeactivateUserAction}
                onDeleteUser={handleDeleteUserAction}
                onAddMember={handleAddMember}
                onCreateTeam={handleCreateTeam}
              />
                </TabsContent>

              <TabsContent value="analyzer" className="m-0">
                <AnalyzerTab />
              </TabsContent>

              <TabsContent value="teams" className="m-0">
                <TeamsTab 
                  onAddMember={handleAddMember}
                  onCreateTeam={handleCreateTeam}
                  onUpdateTeam={handleUpdateTeam}
                  onEditTeam={handleEditTeam}
                  onDeleteTeam={handleDeleteTeam}
                  onDataChange={handleComprehensiveDataRefresh}
                />
              </TabsContent>
            </div>
          </Tabs>

          <PeopleModals 
            selectedUser={selectedUser}
            showUserProfile={showUserProfile}
            showAddMember={showAddMember}
            showEditName={showEditName}
            showDeleteConfirm={showDeleteConfirm}
            userToEdit={userToEdit}
            deleteAction={deleteAction}
            onUserProfileChange={setShowUserProfile}
            onAddMemberChange={setShowAddMember}
            onEditNameChange={setShowEditName}
            onDeleteConfirmChange={resetDeleteModalState}
            onSaveName={handleSaveName}
            onConfirmAction={handleConfirmAction}
            onMemberAdded={handleMemberAdded}
            onUserUpdated={handleUserUpdated}
            isDeleting={isDeleting}
          />
          
          <TeamsModals 
            showCreateTeam={showCreateTeam}
            showEditTeam={showEditTeam}
            showDeleteTeam={showDeleteTeam}
            editingTeam={editingTeam}
            deletingTeam={deletingTeam}
            onCreateTeamChange={setShowCreateTeam}
            onEditTeamChange={setShowEditTeam}
            onDeleteTeamChange={setShowDeleteTeam}
            onCreateTeam={handleCreateTeamAction}
            onUpdateTeam={handleUpdateTeamAction}
            onDeleteTeam={handleDeleteTeamAction}
          />
        </div>
      </div>
    </SimpleStrategyProvider>
  );
};

export default People;
