
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, UserX, Trash2, Edit, Loader2, Users, Shield, Mail, CheckCircle, Clock, Link, UserCheck, Copy } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { useCooldownTracker } from '@/hooks/useCooldownTracker';
import { RoleSelector } from '@/components/shared/RoleSelector';
import { UnifiedUser } from '@/hooks/useUserManagement';
import { useProfile } from '@/hooks/useProfile';
import { getUserDisplayName, getUserDisplayInfo } from '@/utils/userDisplayUtils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

interface UserRowProps {
  person: UnifiedUser;
  currentUserId?: string;
  roleUpdating: string | null;
  isResending?: string | null;
  resendSuccess?: string | null;
  onUserClick: (user: UnifiedUser) => void;
  onRoleChange: (userId: string, newRole: string) => void;
  onEditName: (user: UnifiedUser) => void;
  onDeactivateUser: (user: UnifiedUser) => void;
  onDeleteUser: (user: UnifiedUser) => void;
  onResendInvitation?: (user: UnifiedUser) => void;
  users?: UnifiedUser[]; // Add users array to get current user's permission level
}

const getInitials = (name: string) => {
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return 'U';
  }
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

const getAccessTypeDisplay = (accessType?: string) => {
  switch (accessType) {
    case 'team_member':
      return {
        icon: Users,
        label: 'Team Member',
        color: 'bg-success/10 dark:bg-green-900/30 text-green-800 dark:text-green-300',
        description: 'Added via team membership'
      };
    case 'linked_company':
      return {
        icon: Link,
        label: 'Linked Company',
        color: 'bg-secondary dark:bg-purple-900/30 text-purple-800 dark:text-purple-300',
        description: 'Access via company partnership'
      };
    default:
      return null;
    // Don't show badge for direct access
  }
};

const getInvitationStatusDisplay = (emailConfirmedAt?: string, status?: string) => {
  if (status === 'declined') {
    return {
      icon: UserX,
      label: 'Invitation Declined',
      color: 'bg-destructive/10 dark:bg-red-900/30 text-red-800 dark:text-red-300',
      description: 'User declined the invitation'
    };
  } else if (emailConfirmedAt) {
    return {
      icon: CheckCircle,
      label: 'Profile Complete',
      color: 'bg-success/10 dark:bg-green-900/30 text-green-800 dark:text-green-300',
      description: 'User has completed their profile setup'
    };
  } else {
    return {
      icon: Clock,
      label: 'Invitation Pending',
      color: 'bg-warning/10 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
      description: 'User has not yet completed their profile setup'
    };
  }
};

export const UserRow: React.FC<UserRowProps> = React.memo(({
  person,
  currentUserId,
  roleUpdating,
  isResending,
  resendSuccess,
  onUserClick,
  onRoleChange,
  onEditName,
  onDeactivateUser,
  onDeleteUser,
  onResendInvitation,
  users
}) => {
  const { profile } = useProfile();
  const [imageError, setImageError] = React.useState(false);
  logger.log('🔍 UserRow profile data:', profile);

  // Get current user's actual permission level from company users data
  const currentUserData = users?.find(u => u.user_id === currentUserId);
  const currentUserPermissionLevel = currentUserData?.permission_level || 'member';
  
  logger.log('🔍 UserRow current user permission data:', {
    currentUserId,
    currentUserData: currentUserData ? {
      user_id: currentUserData.user_id,
      permission_level: currentUserData.permission_level,
      role: currentUserData.role
    } : null,
    finalPermissionLevel: currentUserPermissionLevel
  });

  // Enhanced user display handling with debugging
  const userDisplayInfo = React.useMemo(() => {
    logger.log('👤 UserRow processing user:', {
      user_id: person?.user_id,
      email: person?.email,
      full_name: person?.full_name,
      raw_person: person
    });
    
    if (!person) {
      logger.warn('⚠️ UserRow: person is null/undefined');
      return {
        displayName: 'Unknown User',
        hasRealName: false,
        subtitle: undefined
      };
    }
    
    const displayInfo = getUserDisplayInfo(person);
    logger.log('✅ UserRow display info:', {
      userId: person.user_id,
      displayName: displayInfo.displayName,
      hasRealName: displayInfo.hasRealName,
      subtitle: displayInfo.subtitle
    });
    
    return displayInfo;
  }, [person]);

  const accessDisplay = getAccessTypeDisplay(person?.access_type);
  const invitationStatus = getInvitationStatusDisplay(person?.email_confirmed_at, person?.status);
  const AccessIcon = accessDisplay?.icon;
  const StatusIcon = invitationStatus.icon;

  // Check if current user is super admin
  const isSuperAdmin = currentUserPermissionLevel === 'super_admin';

  // Helper function to check if user has higher or equal permission level
  const hasHigherOrEqualPermission = (userLevel: string, targetLevel: string) => {
    const hierarchy = ['view-only', 'member', 'manager', 'director', 'super_admin'];
    const userIndex = hierarchy.indexOf(userLevel);
    const targetIndex = hierarchy.indexOf(targetLevel);
    return userIndex >= targetIndex;
  };

  // Determine if role selector should be disabled
  const isRoleSelectorDisabled = () => {
    // Always disable for view-only users
    if (currentUserPermissionLevel === 'view-only') {
      return true;
    }
    
    // Always disable if user is deactivated (inactive role) or invitation is declined
    if (person?.role === 'inactive' || person?.permission_level === 'inactive' || person?.status === 'inactive' || person?.status === 'declined') {
      return true;
    }

    if (isSuperAdmin) {
      // Super admins can edit all roles except when updating
      return roleUpdating === person?.user_id;
    }

    // Get current user's permission level from company users data (not profile.role)
    const currentUserLevel = currentUserPermissionLevel;

    // Can't edit themselves, can't edit non-direct access users, and must have higher permission level
    return currentUserId === person?.user_id || 
           roleUpdating === person?.user_id || 
           person?.access_type !== 'direct' || 
           !hasHigherOrEqualPermission(currentUserLevel, person?.role || 'member');
  };

  // Determine if actions menu should be shown
  const shouldShowActionsMenu = () => {
    logger.log('🔍 UserRow shouldShowActionsMenu check:', {
      isSuperAdmin,
      currentUserId,
      personUserId: person?.user_id,
      personAccessType: person?.access_type,
      currentUserLevel: currentUserPermissionLevel,
      isNotSelf: currentUserId !== person?.user_id,
      hasDirectAccess: person?.access_type === 'direct',
      hasManagerLevel: hasHigherOrEqualPermission(currentUserPermissionLevel, 'manager')
    });

    if (isSuperAdmin) {
      // Super admins can manage all users
      logger.log('✅ Showing menu: Super admin');
      return true;
    }

    // Get current user's permission level from company users data (not profile.role)
    const currentUserLevel = currentUserPermissionLevel;

    // Can't manage themselves, can only manage direct access users, and must have manager+ level
    const canShow = currentUserId !== person?.user_id && 
           person?.access_type === 'direct' && 
           hasHigherOrEqualPermission(currentUserLevel, 'manager');
    
    logger.log(canShow ? '✅ Showing menu: Has permissions' : '❌ Hiding menu: Insufficient permissions');
    return canShow;
  };

  // Check if user has pending invitation
  const hasPendingInvitation = !person?.email_confirmed_at;

  // Track cooldown state for resend invitation  
  const cooldownState = useCooldownTracker(person?.invited_at);
  const isResendDisabled = (isResending === person.email) || (resendSuccess === person.email) || cooldownState.isInCooldown;

  // Handler to copy invitation link for pending users
  const handleCopyInviteLink = async () => {
    if (!person?.email) return;
    
    try {
      // Get the invitation token from invitations table
      const { data: invitation, error } = await supabase
        .from('invitations')
        .select('invitation_token, company_id')
        .ilike('email', person.email)
        .eq('status', 'pending')
        .maybeSingle();
      
      if (error || !invitation?.invitation_token) {
        toast.error('Could not find invitation link. Try resending the invitation.');
        return;
      }
      
      const baseUrl = window.location.origin;
      const inviteLink = `${baseUrl}/accept-invitation?token=${encodeURIComponent(invitation.invitation_token)}&email=${encodeURIComponent(person.email)}&company_id=${encodeURIComponent(invitation.company_id)}&invited=1`;
      
      await navigator.clipboard.writeText(inviteLink);
      toast.success('Link copied! Send this to the user and they will be able to join the company with this email.');
    } catch (err) {
      logger.error('Failed to copy invite link:', err);
      toast.error('Failed to copy link');
    }
  };

  // Determine button state and content
  const getResendButtonState = () => {
    if (isResending === person.email) {
      return {
        icon: <Loader2 className="h-4 w-4 mr-2 animate-spin" />,
        text: "Sending...",
        disabled: true
      };
    }
    
    if (resendSuccess === person.email) {
      return {
        icon: <CheckCircle className="h-4 w-4 mr-2 text-success dark:text-green-400" />,
        text: "Sent!",
        disabled: true
      };
    }
    
    return {
      icon: <Mail className="h-4 w-4 mr-2" />,
      text: "Resend Invite", 
      disabled: cooldownState.isInCooldown
    };
  };

  const buttonState = getResendButtonState();

  // Show loading state if person data is not available
  if (!person) {
    return (
      <div className="flex items-center justify-between p-3 border rounded-lg">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-full bg-secondary animate-pulse" />
          <div className="flex-1">
            <div className="h-4 bg-secondary rounded animate-pulse mb-2" />
            <div className="h-3 bg-secondary rounded animate-pulse w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between py-3 px-0 border-b border-border hover:bg-muted/50 transition-colors group">
      <div className="flex items-center space-x-3 flex-1 cursor-pointer min-w-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1" onClick={() => onUserClick(person)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onUserClick(person); } }} role="button" tabIndex={0}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Avatar className="h-8 w-8 flex-shrink-0">
                {person.avatar_url && <AvatarImage src={person.avatar_url} alt={userDisplayInfo.displayName} />}
                <AvatarFallback className="text-xs font-medium">
                  {getInitials(userDisplayInfo.displayName)}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            {person.image_url && !imageError ? (
              <TooltipPrimitive.Portal>
                <TooltipContent 
                  side="right" 
                  className="p-3 z-50 !overflow-visible"
                  style={{ maxWidth: 'none', width: 'auto' }}
                  collisionPadding={{ right: 20, left: 20, top: 20, bottom: 20 }}
                >
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Personality Profile Chart</p>
                    <div className="relative w-full flex items-center justify-center">
                      <img 
                        src={person.image_url} 
                        alt="Personality Profile Chart" 
                        className="rounded-lg border border-border shadow-sm w-auto h-auto object-contain bg-background"
                        style={{ maxWidth: '400px', maxHeight: '400px', width: 'auto', height: 'auto' }}
                        onError={(e) => {
                          logger.error('Image load error:', person.image_url, e);
                          setImageError(true);
                        }}
                        onLoad={() => {
                          setImageError(false);
                        }}
                      />
                    </div>
                  </div>
                </TooltipContent>
              </TooltipPrimitive.Portal>
            ) : (
              <TooltipContent side="right">
                <p className="text-xs">
                  {person.image_url && imageError 
                    ? "Failed to load personality profile chart" 
                    : "No personality profile chart"}
                </p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[13px] font-medium text-foreground truncate" title={userDisplayInfo.displayName}>
              {userDisplayInfo.displayName}
            </p>
            {currentUserId === person.user_id && (
              <Badge variant="outline" className="text-xs">You</Badge>
            )}
            {(person?.role === 'inactive' || person?.permission_level === 'inactive' || person?.status === 'inactive') && (
              <Badge variant="secondary" className="text-xs">Inactive</Badge>
            )}
            {person?.status === 'declined' && (
              <Badge variant="secondary" className="text-xs">Declined</Badge>
            )}
            {person?.status === 'pending' && (
              <Badge variant="secondary" className="text-xs">Pending</Badge>
            )}
          </div>
          {(userDisplayInfo.subtitle || person.email) && (
            <a 
              href={`mailto:${person.email}`}
              className="text-[11px] text-muted-foreground truncate mt-0.5 hover:text-primary transition-colors underline decoration-dotted block"
              title={person.email}
              onClick={(e) => e.stopPropagation()}
            >
              {userDisplayInfo.subtitle || person.email}
            </a>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="relative">
          <RoleSelector 
            selectedRole={person.permission_level || person.role} 
            onRoleChange={newRole => onRoleChange(person.user_id, newRole)} 
            disabled={isRoleSelectorDisabled()} 
          />
          {roleUpdating === person.user_id && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          )}
        </div>
        
        {shouldShowActionsMenu() && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" aria-label="More actions">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-background border border-border">
              {hasPendingInvitation && onResendInvitation && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <DropdownMenuItem 
                          onClick={() => !buttonState.disabled && onResendInvitation(person)} 
                          disabled={buttonState.disabled}
                          className={buttonState.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                        >
                          {buttonState.icon}
                          {buttonState.text}
                        </DropdownMenuItem>
                      </div>
                    </TooltipTrigger>
                    {(cooldownState.isInCooldown && !resendSuccess) && (
                      <TooltipContent>
                        <p>Please wait {cooldownState.remainingMinutes} minute{cooldownState.remainingMinutes > 1 ? 's' : ''} before resending invitation</p>
                      </TooltipContent>
                    )}
                    {resendSuccess === person.email && (
                      <TooltipContent>
                        <p>Invitation sent successfully!</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              )}
              
              {hasPendingInvitation && (
                <DropdownMenuItem onClick={handleCopyInviteLink}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Invite Link
                </DropdownMenuItem>
              )}
              
              {isSuperAdmin && currentUserId === person.user_id ? 
                null : 
                <>
                  {(person?.status === 'inactive' || person?.role === 'inactive' || person?.permission_level === 'inactive') ? (
                    <DropdownMenuItem onClick={() => onDeactivateUser(person)}>
                      <UserCheck className="h-4 w-4 mr-2" />
                      Reactivate
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => onDeactivateUser(person)}>
                      <UserX className="h-4 w-4 mr-2" />
                      Deactivate
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => onDeleteUser(person)} className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              }
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
});

UserRow.displayName = 'UserRow';
