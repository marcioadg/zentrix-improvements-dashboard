import React from 'react';
import { BaseModal } from './BaseModal';
import { UnifiedUser } from '@/hooks/useUserManagement';
import { useUserProfileModal } from '@/hooks/useUserProfileModal';
import { UserProfileHeader } from './user-profile/UserProfileHeader';
import { TeamMembershipSection } from './user-profile/TeamMembershipSection';
import { PasswordUpdateSection } from './user-profile/PasswordUpdateSection';
import { AdminCompanyMembershipSection } from './user-profile/AdminCompanyMembershipSection';
import { UserAvatar } from '@/components/UserAvatar';
import { AvatarEditModal } from '@/components/modals/AvatarEditModal';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { Camera } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserManagement } from '@/hooks/useUserManagement';
import { canManageUserPassword } from '@/utils/roleHierarchy';
import { mapDBRoleToUIPermission } from '@/utils/permissionMapping';
import { useLocation } from 'react-router-dom';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { logger } from '@/utils/logger';

interface UserProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UnifiedUser | null;
  onUserUpdated?: () => void;
}

// Separate component for header content to avoid hook order issues
// Note: This component should NOT use hooks directly - it's just JSX
// TooltipProvider is now at the parent level
// IMPORTANT: This component MUST always render Tooltip to maintain hook order
const UserProfileHeaderContent: React.FC<{
  user: UnifiedUser | null;
  isOwnProfile: boolean;
  onAvatarEditClick: () => void;
  imageError: boolean;
  onImageError: (error: boolean) => void;
}> = React.memo(({ user, isOwnProfile, onAvatarEditClick, imageError, onImageError }) => {
  // Always render Tooltip to maintain hook order, even if user is null
  if (!user) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative flex-shrink-0">
            <div className="h-12 w-12 rounded-full bg-muted" />
          </div>
        </TooltipTrigger>
        <TooltipPrimitive.Portal>
          <TooltipContent side="right" className="z-[100]">
            <p className="text-xs">Loading...</p>
          </TooltipContent>
        </TooltipPrimitive.Portal>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div 
          className={`relative flex-shrink-0 ${isOwnProfile ? 'cursor-pointer group' : ''}`}
          onClick={isOwnProfile ? onAvatarEditClick : undefined}
          onKeyDown={isOwnProfile ? (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onAvatarEditClick();
            }
          } : undefined}
          tabIndex={isOwnProfile ? 0 : undefined}
          role={isOwnProfile ? "button" : undefined}
          aria-label={isOwnProfile ? "Edit profile picture" : undefined}
        >
          <UserAvatar
            userId={user.user_id}
            fullName={user.full_name}
            email={user.email}
            avatarUrl={user.avatar_url}
            size="lg"
          />
          {isOwnProfile && (
            <div className="absolute -bottom-0.5 -right-0.5 bg-background/90 text-muted-foreground rounded-full p-1 shadow-sm border border-border/50">
              <Camera className="h-2.5 w-2.5" />
            </div>
          )}
        </div>
      </TooltipTrigger>
      <TooltipPrimitive.Portal>
        <TooltipContent 
          side="right" 
          className={user.image_url && !imageError ? "p-3 z-[100] !overflow-visible" : "z-[100]"}
          style={user.image_url && !imageError ? { maxWidth: 'none', width: 'auto' } : undefined}
          collisionPadding={user.image_url && !imageError ? { right: 20, left: 20, top: 20, bottom: 20 } : undefined}
        >
          {user.image_url && !imageError ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground mb-2">Personality Profile Chart</p>
              <div className="relative w-full flex items-center justify-center">
                <img 
                  src={user.image_url} 
                  alt="Personality Profile Chart" 
                  className="rounded-lg border border-border shadow-sm w-auto h-auto object-contain bg-background"
                  style={{ maxWidth: '400px', maxHeight: '400px', width: 'auto', height: 'auto' }}
                  onError={(e) => {
                    logger.error('Image load error:', user.image_url, e);
                    onImageError(true);
                  }}
                  onLoad={() => {
                    onImageError(false);
                  }}
                />
              </div>
            </div>
          ) : (
            <p className="text-xs">
              {user.image_url && imageError 
                ? "Failed to load personality profile chart" 
                : "No personality profile chart"}
            </p>
          )}
        </TooltipContent>
      </TooltipPrimitive.Portal>
    </Tooltip>
  );
});

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  open,
  onOpenChange,
  user,
  onUserUpdated,
}) => {
  // All hooks must be called in the same order every render, even if user is null
  const { user: currentUser } = useAuth();
  const { users: allUsers, hasManagerAccess } = useUserManagement();
  const location = useLocation();
  const isAdminContext = location.pathname.includes('/company-management');
  const { currentCompany } = useMultiCompanyAccess();
  const queryClient = useQueryClient();
  const {
    selectedRole,
    setSelectedRole,
    selectedTeamIds,
    loading,
    canEdit,
    canEditRole,
    canEditTeams,
    availableTeams,
    displayUserTeams,
    handleCancel: originalHandleCancel,
    handleSave: originalHandleSave,
    handleTeamToggle,
    currentCompany: hookCurrentCompany
  } = useUserProfileModal({ user, open, onUserUpdated });
  
  // Use currentCompany from hook if available, otherwise from useMultiCompanyAccess
  const effectiveCurrentCompany = hookCurrentCompany || currentCompany;

  // State for avatar edit modal - MUST be before any conditional returns
  const [isAvatarEditOpen, setIsAvatarEditOpen] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);
  
  // State for personality profile chart (image only - color is now on org_roles)
  const [selectedImageUrl, setSelectedImageUrl] = React.useState<string | null>(
    user?.image_url || null
  );
  
  // Local loading state for image_url updates (when only profile chart changes)
  const [isSavingImage, setIsSavingImage] = React.useState(false);
  
  // Update local state when user changes
  React.useEffect(() => {
    if (user) {
      setSelectedImageUrl(user.image_url || null);
    }
  }, [user]);

  // Always create headerContent BEFORE early return to maintain hook order
  // This ensures Tooltip hooks are always called in the same order
  const headerContent = user ? (
    <UserProfileHeaderContent
      user={user}
      isOwnProfile={currentUser?.id === user.user_id}
      onAvatarEditClick={() => setIsAvatarEditOpen(true)}
      imageError={imageError}
      onImageError={setImageError}
    />
  ) : (
    <UserProfileHeaderContent
      user={null}
      isOwnProfile={false}
      onAvatarEditClick={() => {}}
      imageError={false}
      onImageError={() => {}}
    />
  );

  // Early return AFTER all hooks to maintain hook order
  if (!user) return null;

  logger.log('🔍 UserProfileModal: Rendering with state:', {
    userName: user?.full_name,
    open,
    canEdit,
    canEditRole,
    canEditTeams,
    availableTeamsCount: availableTeams.length,
    displayUserTeamsCount: displayUserTeams.length,
    selectedTeamIdsCount: selectedTeamIds.length,
    loading,
    currentCompany: currentCompany?.name
  });

  // Get effective role for current user using permission_level as primary source
  const getCurrentUserEffectiveRole = () => {
    if (!currentUser?.id) return 'member';
    
    // Find current user in the users list (which includes company permission levels)
    const currentUserData = allUsers.find(u => u.user_id === currentUser.id);
    
    if (currentUserData) {
      logger.log('🔐 UserProfileModal: Using permission_level as primary source:', {
        userId: currentUser.id,
        permissionLevel: currentUserData.permission_level,
        fallbackRole: currentUserData.role
      });
      // Use permission_level as primary source, fall back to role if needed
      return currentUserData.permission_level || currentUserData.role || 'member';
    }
    
    logger.log('🔐 UserProfileModal: Current user not found in company users, defaulting to member');
    return 'member';
  };

  const currentUserRole = getCurrentUserEffectiveRole();
  const targetUserRole = user.permission_level || user.role || 'member';
  const isOwnProfile = currentUser?.id === user.user_id;

  logger.log('🔐 UserProfileModal: Enhanced role detection:', {
    currentUserId: currentUser?.id,
    targetUserId: user.user_id,
    currentUserRole,
    targetUserRole,
    isOwnProfile,
    hasManagerAccess: hasManagerAccess,
    allUsersCount: allUsers.length,
    foundCurrentUser: allUsers.find(u => u.user_id === currentUser?.id) ? 'YES' : 'NO'
  });

  const canUpdatePassword = canManageUserPassword(
    mapDBRoleToUIPermission(currentUserRole),
    mapDBRoleToUIPermission(targetUserRole),
    currentUser?.id || '',
    user.user_id
  );

  logger.log('🔐 UserProfileModal: Final password update permissions:', {
    currentUserRole,
    targetUserRole,
    isOwnProfile,
    canUpdatePassword,
    currentUserId: currentUser?.id,
    targetUserId: user.user_id,
    mappedCurrentRole: mapDBRoleToUIPermission(currentUserRole),
    mappedTargetRole: mapDBRoleToUIPermission(targetUserRole)
  });

  // Check if there are actual changes to save for roles/teams
  const hasRoleChanges = canEditRole && selectedRole !== user.role;
  const hasTeamChanges = canEditTeams && (
    selectedTeamIds.length !== displayUserTeams.length ||
    selectedTeamIds.some(id => !displayUserTeams.some(team => team.team_id === id)) ||
    displayUserTeams.some(team => !selectedTeamIds.includes(team.team_id))
  );
  
  // Check for personality profile chart changes (image only - color is now on org_roles)
  const hasImageUrlChanges = (hasManagerAccess || isOwnProfile) && 
    selectedImageUrl !== (user.image_url || null);
  
  const hasChangesToSave = hasRoleChanges || hasTeamChanges || hasImageUrlChanges;

  // Combined loading state: from hook (for role/team changes) or local (for image changes)
  const isSaving = loading || isSavingImage;

  // Enhanced handleSave that includes personality profile changes
  const handleSave = async () => {
    if (!user || !effectiveCurrentCompany) return;
    
    try {
      // Save personality profile chart (image only - color is now on org_roles)
      if (hasImageUrlChanges) {
        setIsSavingImage(true); // Activate loading state for image save
        const { error } = await supabase
          .from('company_members')
          .update({ image_url: selectedImageUrl })
          .eq('user_id', user.user_id)
          .eq('company_id', effectiveCurrentCompany.id);
        
        if (error) {
          logger.error('Error updating personality profile chart:', error);
          setIsSavingImage(false); // Reset loading on error
          throw error;
        }
        
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['unified-users'] });
        queryClient.invalidateQueries({ queryKey: ['company-users'] });
        setIsSavingImage(false); // Reset loading after success
      }
      
      // Call original handleSave for role and team changes
      await originalHandleSave();
      
      // Trigger onUserUpdated callback if provided
      if (onUserUpdated) {
        setTimeout(() => {
          onUserUpdated();
        }, 200);
      }
    } catch (error) {
      logger.error('Error saving changes:', error);
      setIsSavingImage(false); // Ensure loading is reset on error
    }
  };

  // Enhanced handleCancel that resets personality profile chart changes
  const handleCancel = () => {
    // Reset personality profile chart state
    if (user) {
      setSelectedImageUrl(user.image_url || null);
    }
    
    // Call original handleCancel
    originalHandleCancel();
  };

  return (
    <TooltipProvider>
      <BaseModal
        open={open}
        onOpenChange={onOpenChange}
        title={user.full_name}
        description={`${user.email} • Joined ${new Date(user.created_at).toLocaleDateString()}`}
        size="lg"
        hideActions={true}
        headerContent={headerContent}
      >
      <div className="space-y-6">
            <UserProfileHeader 
              user={user}
              isEditing={canEditRole}
              selectedRole={selectedRole}
              onRoleChange={setSelectedRole}
              loading={loading}
              canEditPersonality={hasManagerAccess}
              isOwnProfile={isOwnProfile}
              selectedImageUrl={selectedImageUrl}
              onImageUrlChange={setSelectedImageUrl}
            />
        
        {/* Show admin company membership section in admin context */}
        {isAdminContext && (
          <AdminCompanyMembershipSection
            user={user}
            onMembershipUpdated={onUserUpdated}
          />
        )}
        
        {(canEditTeams || displayUserTeams.length > 0) && !isAdminContext && (
          <TeamMembershipSection
            isEditing={canEditTeams}
            selectedTeamIds={selectedTeamIds}
            availableTeams={availableTeams}
            displayUserTeams={displayUserTeams}
            onTeamToggle={handleTeamToggle}
            loading={loading}
            currentCompanyName={currentCompany?.name}
          />
        )}


            {((canEditRole || canEditTeams || hasImageUrlChanges) && !isAdminContext) && (
          <div className="flex justify-end space-x-3 pt-6 border-t border-border/50">
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="px-4 py-2 text-[13px] font-medium text-muted-foreground bg-background border border-border rounded-[5px] hover:bg-muted focus:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:opacity-50 transition-colors duration-150"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !hasChangesToSave}
              className="px-6 py-2 text-[13px] font-medium text-primary-foreground bg-primary border border-transparent rounded-[5px] hover:bg-primary/90 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:opacity-50 transition-colors duration-150 shadow-sm"
            >
              {isSaving ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </div>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        )}
      </div>
      
      {/* Avatar Edit Modal */}
      <AvatarEditModal
        open={isAvatarEditOpen}
        onOpenChange={setIsAvatarEditOpen}
      />
      </BaseModal>
    </TooltipProvider>
  );
};
