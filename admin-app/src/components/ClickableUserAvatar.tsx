
import React, { useState, useMemo, useCallback, memo } from 'react';
import { UserAvatar } from './UserAvatar';
import { UserSelectorDropdown } from './UserSelectorDropdown';
import { useCompanyUsers } from '@/hooks/useCompanyUsers';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { logger } from '@/utils/logger';

interface User {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
}

interface ClickableUserAvatarProps {
  userId?: string;
  fullName?: string;
  email?: string;
  avatarUrl?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  onUserChange: (userId: string | null) => Promise<boolean>;
  disabled?: boolean;
  allowClear?: boolean;
  customUsers?: User[];
  tooltipContent?: string;
  tooltipDescription?: string;
  isDeactivated?: boolean; // New prop to indicate if the user is deactivated
}

export const ClickableUserAvatar: React.FC<ClickableUserAvatarProps> = memo(({
  userId,
  fullName,
  email,
  avatarUrl,
  className,
  size = 'md',
  onUserChange,
  disabled = false,
  allowClear = true,
  customUsers,
  tooltipContent,
  tooltipDescription,
  isDeactivated = false
}) => {
  const { users: companyUsers, loading } = useCompanyUsers();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);

  // 🎯 MEMOIZED: Ensure we always have a valid array and handle loading states
  const availableUsers = useMemo(() => {
    if (customUsers) {
      return Array.isArray(customUsers) ? customUsers : [];
    }
    if (loading) {
      return [];
    }
    const users = Array.isArray(companyUsers) ? companyUsers : [];
    return users;
  }, [customUsers, companyUsers, loading]);

  // 🎯 MEMOIZED: Handle user selection with stable reference
  const handleUserSelect = useCallback(async (newUserId: string | null) => {
    if (isUpdating) {
      return;
    }
    
    if (!onUserChange) {
      logger.error('❌ ClickableUserAvatar - No onUserChange callback provided!');
      return;
    }
    
    setIsUpdating(true);
    try {
      const success = await onUserChange(newUserId);
      
      if (!success) {
        toast({
          title: "Error",
          description: "Failed to update user assignment",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Success",
          description: "User assignment updated successfully",
        });
      }
    } catch (error) {
      logger.error('❌ ClickableUserAvatar - error in onUserChange callback:', error);
      toast({
        title: "Error",
        description: "Failed to update user assignment",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  }, [isUpdating, onUserChange, toast]);

  // 🎯 MEMOIZED: Create avatar with stable reference
  const baseAvatar = useMemo(() => {
    return (
      <UserAvatar
        userId={userId}
        fullName={fullName}
        email={email}
        avatarUrl={avatarUrl}
        className={className}
        size={size}
        isClickable={!disabled}
        disabled={loading || isUpdating || disabled}
        isDeactivated={isDeactivated}
      />
    );
  }, [userId, fullName, email, avatarUrl, className, size, disabled, loading, isUpdating, isDeactivated]);

  // Helper function to wrap avatar with tooltip (ONLY for disabled states)
  const wrapWithTooltip = (element: React.ReactNode) => {
    if (!tooltipContent) {
      return element;
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {element}
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipContent}</p>
          {tooltipDescription && (
            <p className="text-xs text-muted-foreground">{tooltipDescription}</p>
          )}
        </TooltipContent>
      </Tooltip>
    );
  };

  // If disabled, show just the avatar with tooltip - NO DROPDOWN
  if (disabled) {
    return wrapWithTooltip(baseAvatar);
  }

  // Show loading state while data is being fetched
  if (loading) {
    const loadingAvatar = (
      <div className="relative">
        <UserAvatar
          userId={userId}
          fullName={fullName}
          email={email}
          avatarUrl={avatarUrl}
          className={`${className} opacity-75`}
          size={size}
          disabled={true}
          isDeactivated={isDeactivated}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <LoadingSpinner size="sm" />
        </div>
      </div>
    );

    return wrapWithTooltip(loadingAvatar);
  }

  // For interactive (clickable) state, create dropdown with PLAIN avatar (no tooltip wrapper)
  
  return (
    <UserSelectorDropdown
      users={availableUsers}
      selectedUserId={userId}
      onUserSelect={handleUserSelect}
      loading={isUpdating}
      allowClear={allowClear}
      trigger={baseAvatar}
      headerInfo={tooltipContent ? {
        title: tooltipContent,
        description: tooltipDescription
      } : undefined}
    />
  );
});

ClickableUserAvatar.displayName = 'ClickableUserAvatar';
