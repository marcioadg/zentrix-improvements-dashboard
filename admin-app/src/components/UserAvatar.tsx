import React, { memo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronDown, User } from 'lucide-react';
import { getInitials } from '@/utils/nameUtils';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { UserSelectorDropdown } from '@/components/UserSelectorDropdown';
import { logger } from '@/utils/logger';

interface UserAvatarProps {
  userId?: string;
  fullName?: string;
  email?: string;
  avatarUrl?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  isClickable?: boolean;
  disabled?: boolean;
  isDeactivated?: boolean; // New prop to show deactivated state
  disableHoverScale?: boolean; // Disable hover scale effect (for use in cards with their own hover effects)

  // New optional props to enable team-only assignee selection
  enableAssigneeSelect?: boolean; // When true, wraps avatar in a dropdown
  assigneeTeamId?: string; // Team ID to filter members
  selectedAssigneeId?: string; // Currently selected user id (for highlight)
  onAssigneeChange?: (userId: string | null) => void; // Callback when a user is chosen
  showChevron?: boolean; // Whether to show the chevron down indicator (default: true)
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12'
};

const textSizeClasses = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg'
};

const iconSizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6'
};


export const UserAvatar = memo<UserAvatarProps>(({
  userId,
  fullName,
  email,
  avatarUrl,
  className = '',
  size = 'md',
  onClick,
  isClickable = false,
  disabled = false,
  isDeactivated = false,
  disableHoverScale = false,

  // New props
  enableAssigneeSelect = false,
  assigneeTeamId,
  selectedAssigneeId,
  onAssigneeChange,
  showChevron = true
}) => {
  const sizeClass = sizeClasses[size];
  const textSizeClass = textSizeClasses[size];
  const iconSizeClass = iconSizeClasses[size];

  const [imgError, setImgError] = React.useState(false);

  // Reset imgError when avatarUrl changes (e.g., when owner changes)
  React.useEffect(() => {
    setImgError(false);
  }, [avatarUrl, userId]);

  // Only call hooks when enableAssigneeSelect is true to avoid unnecessary API calls
  const shouldFetchTeamData = enableAssigneeSelect && assigneeTeamId;
  const { members, loading } = useTeamMembers(shouldFetchTeamData ? assigneeTeamId : '');
  
  // Use provided props directly instead of fetching all profiles
  const effectiveFullName = fullName || '';
  const effectiveEmail = email || '';
  const effectiveAvatarUrl = avatarUrl || '';

  const initials = getInitials(effectiveFullName, effectiveEmail);
  const hasValidAvatarUrl = typeof effectiveAvatarUrl === 'string' && effectiveAvatarUrl.trim() !== '' && effectiveAvatarUrl !== 'null' && effectiveAvatarUrl !== 'undefined';
  
  const users = shouldFetchTeamData ? (members || []).map((m) => ({
    id: m.user_id,
    full_name: m.profiles?.full_name || m.profiles?.email || 'Member',
    email: m.profiles?.email || '',
    avatar_url: (m as any)?.profiles?.avatar_url as string | undefined,
  })) : [];

  // Use the provided isDeactivated prop instead of making individual API calls
  const finalIsDeactivated = isDeactivated;

  const getHoverClasses = () => {
    if (!isClickable && !enableAssigneeSelect) return '';
    if (disabled) return '';
    
    // When disableHoverScale is true, only show cursor-pointer (no animations)
    if (disableHoverScale) {
      return 'cursor-pointer';
    }
    
    // Full hover effects for standalone avatars
    return 'cursor-pointer hover:ring-2 hover:ring-primary/20 hover:scale-105 transition-all duration-200';
  };

  const handleClick = () => {
    if (!enableAssigneeSelect && isClickable && !disabled && onClick) {
      onClick();
    }
  };

  const avatarNode = (
    <div className="relative">
      <Avatar 
        className={`${sizeClass} ${className} ${getHoverClasses()} ${disabled ? 'opacity-50' : ''} ${finalIsDeactivated ? 'opacity-60' : ''}`}
        onClick={handleClick}
      >
        {hasValidAvatarUrl && !imgError && (
          <AvatarImage 
            src={effectiveAvatarUrl} 
            alt={effectiveFullName || effectiveEmail || 'User avatar'} 
            onError={() => setImgError(true)}
            className={finalIsDeactivated ? 'grayscale' : ''}
          />
        )}
        <AvatarFallback 
          delayMs={0} 
          className={`${textSizeClass} font-semibold ${
            finalIsDeactivated 
              ? 'bg-muted text-muted-foreground' 
              : 'bg-muted text-foreground'
          }`}
        >
          {initials === '??' ? (
            <User className={iconSizeClass} />
          ) : (
            initials
          )}
        </AvatarFallback>
      </Avatar>
    </div>
  );

  const triggerNode = (
    <div
      className={`relative inline-flex items-center ${disabled ? 'opacity-50' : ''}`}
      role={enableAssigneeSelect ? 'button' : undefined}
      aria-haspopup={enableAssigneeSelect ? 'menu' : undefined}
      tabIndex={enableAssigneeSelect ? 0 : undefined}
    >
      {avatarNode}
      {enableAssigneeSelect && !disabled && showChevron && (
        <div className="absolute -bottom-0 -right-0 h-4 w-4 rounded-full bg-background border border-border flex items-center justify-center shadow-sm z-10">
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </div>
      )}
    </div>
  );

  if (enableAssigneeSelect) {
    return (
      <UserSelectorDropdown
        users={users}
        selectedUserId={selectedAssigneeId}
        onUserSelect={(id) => {
          if (disabled) return;
          logger.debug('👤 UserAvatar assignee selected:', id);
          onAssigneeChange?.(id);
        }}
        loading={loading}
        allowClear={false}
        trigger={triggerNode}
        headerInfo={{ title: 'Assign to', description: 'Choose a member of this team' }}
      />
    );
  }

  return avatarNode;
});

UserAvatar.displayName = 'UserAvatar';
