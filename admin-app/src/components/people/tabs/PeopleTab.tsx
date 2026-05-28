import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Users, UserPlus } from 'lucide-react';
import { UserRow } from '../UserRow';
import { useUserManagement, type UnifiedUser } from '@/hooks/useUserManagement';
import { useToast } from '@/hooks/use-toast';
import { type UIPermissionLevel } from '@/utils/permissionMapping';
import { logger } from '@/utils/logger';
interface PeopleTabProps {
  onUserClick: (user: UnifiedUser) => void;
  onEditName: (user: UnifiedUser) => void;
  onDeactivateUser: (user: UnifiedUser) => void;
  onDeleteUser: (user: UnifiedUser) => void;
  onAddMember: () => void;
  onCreateTeam: () => void;
}
export const PeopleTab: React.FC<PeopleTabProps> = ({
  onUserClick,
  onEditName,
  onDeactivateUser,
  onDeleteUser,
  onAddMember,
  onCreateTeam
}) => {
  const {
    users,
    loading,
    currentUserId,
    roleUpdating,
    isResending,
    resendSuccess,
    hasManagerAccess,
    updateUserPermission,
    handleResendInvitation
  } = useUserManagement();
  const {
    toast
  } = useToast();
  const [showInactive, setShowInactive] = useState(false);
  logger.log('🔍 PeopleTab: Rendering with enhanced unified system:', {
    usersCount: users.length,
    loading,
    hasManagerAccess,
    currentUserId,
    roleUpdating
  });
  if (loading) {
    return <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading people...</p>
        </div>
      </div>;
  }

  // ENHANCED: Role change handler with comprehensive validation and debugging
  const handleRoleChangeWithMapping = async (userId: string, newPermissionLevel: string) => {
    logger.log('🔄 PeopleTab: Enhanced role change initiated:', {
      userId,
      newPermissionLevel,
      hasManagerAccess,
      userExists: !!users.find(u => u.user_id === userId),
      currentUserId,
      timestamp: new Date().toISOString()
    });

    // Enhanced permission check
    if (!hasManagerAccess) {
      logger.warn('⚠️ PeopleTab: Access denied - user lacks manager access');
      toast({
        title: "Access Denied",
        description: "You don't have permission to change user roles",
        variant: "destructive"
      });
      return;
    }

    // Validate target user exists
    const targetUser = users.find(u => u.user_id === userId);
    if (!targetUser) {
      logger.error('❌ PeopleTab: Target user not found:', userId);
      toast({
        title: "Error",
        description: "User not found. Please refresh and try again.",
        variant: "destructive"
      });
      return;
    }

    // Validate role value
    const validRoles = ['view-only', 'member', 'manager', 'director', 'super_admin'];
    if (!validRoles.includes(newPermissionLevel)) {
      logger.error('❌ PeopleTab: Invalid role value:', newPermissionLevel);
      toast({
        title: "Invalid Role",
        description: "The selected role is not valid",
        variant: "destructive"
      });
      return;
    }

    // Prevent self-modification (except for super admin)
    if (userId === currentUserId) {
      logger.warn('⚠️ PeopleTab: Attempted self-modification');
      toast({
        title: "Not Allowed",
        description: "You cannot modify your own role",
        variant: "destructive"
      });
      return;
    }
    try {
      logger.log('🔄 PeopleTab: Calling updateUserPermission...');
      await updateUserPermission(userId, 'permission_level', newPermissionLevel as UIPermissionLevel);
      logger.log('✅ PeopleTab: Role change completed successfully');
    } catch (error) {
      logger.error('❌ PeopleTab: Role change failed:', error);
      // Error handling is done in updateUserPermission
    }
  };
  return <div className="space-y-6">
      {/* Header with Add Member button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[16px] font-semibold text-foreground">Members</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {users.length} {users.length === 1 ? 'member' : 'members'}
            {!hasManagerAccess && <span className="ml-2 text-xs">(View Only)</span>}
          </p>
        </div>
        <div className="flex gap-2">
          {hasManagerAccess && <>
          <Button data-tour="btn-invite" onClick={onAddMember}>
            <Plus className="h-4 w-4 mr-2" />
            Add Member
          </Button>
          <Button onClick={onCreateTeam}>
              <Plus className="h-4 w-4 mr-2" />
              Create Team
            </Button>
          </>}
          <Button variant="ghost" size="sm" onClick={() => setShowInactive(v => !v)} className="text-muted-foreground">
            {showInactive ? 'Hide inactive' : 'Show inactive'}
          </Button>
        </div>
      </div>

      {users.length === 0 ? <div className="text-center py-12">
          <Users className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
          <h3 className="text-sm font-medium mb-1">No team members</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Get started by adding your first team member.
          </p>
           {hasManagerAccess && <Button onClick={onAddMember}>
              <Plus className="h-4 w-4 mr-2" />
              Add Member
            </Button>}
        </div> : <div className="space-y-0">
          {[...users].filter(u => showInactive || (u.status !== 'inactive' && u.role !== 'inactive' && u.permission_level !== 'inactive')).sort((a, b) => {
            // Current user first
            if (a.user_id === currentUserId) return -1;
            if (b.user_id === currentUserId) return 1;
            
            // Priority: 1=Active, 2=Pending, 3=Inactive
            const getPriority = (user) => {
              if (user.status === 'inactive') return 3; // Inactive last
              if (user.status === 'pending' || !user.email_confirmed_at) return 2; // Pending middle
              return 1; // Active first
            };
            
            const aPriority = getPriority(a);
            const bPriority = getPriority(b);
            if (aPriority !== bPriority) return aPriority - bPriority;
            
            // Within same group, sort alphabetically by name/email
            const aName = a.full_name || a.email || '';
            const bName = b.full_name || b.email || '';
            return aName.localeCompare(bName);
          }).map(person => <UserRow key={person.user_id} person={person} currentUserId={currentUserId} roleUpdating={roleUpdating} isResending={isResending ? person.user_id : null} resendSuccess={resendSuccess} onUserClick={onUserClick} onRoleChange={handleRoleChangeWithMapping} onEditName={onEditName} onDeactivateUser={onDeactivateUser} onDeleteUser={onDeleteUser} onResendInvitation={handleResendInvitation} users={users} />)}
        </div>}
    </div>;
};