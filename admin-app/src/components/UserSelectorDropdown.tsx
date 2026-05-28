import React, { useState, memo, useCallback } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { UserAvatar } from './UserAvatar';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Check, X, AlertCircle } from 'lucide-react';
import { logger } from '@/utils/logger';
interface User {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
}
interface UserSelectorDropdownProps {
  users: User[];
  selectedUserId?: string;
  onUserSelect: (userId: string | null) => void;
  loading?: boolean;
  allowClear?: boolean;
  trigger: React.ReactNode;
  headerInfo?: {
    title: string;
    description?: string;
  };
  disabledUserIds?: string[];
  disabledReasons?: Record<string, string>;
}
export const UserSelectorDropdown = memo<UserSelectorDropdownProps>(({
  users,
  selectedUserId,
  onUserSelect,
  loading = false,
  allowClear = true,
  trigger,
  headerInfo,
  disabledUserIds = [],
  disabledReasons = {}
}) => {
  const [open, setOpen] = useState(false);
  
  logger.debug('🔍 UserSelectorDropdown - render state:', {
    usersCount: users.length,
    selectedUserId,
    loading,
    allowClear,
    hasOnUserSelect: !!onUserSelect,
    hasHeaderInfo: !!headerInfo
  });

  // 🎯 MEMOIZED: Prevent recreation on every render
  const handleUserSelect = useCallback((userId: string | null) => {
    logger.debug('🔄 UserSelectorDropdown - handleUserSelect called:', {
      selectedUserId: userId,
      hasCallback: !!onUserSelect
    });
    
    if (!onUserSelect) {
      logger.error('❌ UserSelectorDropdown - No onUserSelect callback provided!');
      return;
    }
    
    logger.debug('🔄 UserSelectorDropdown - Calling onUserSelect callback...');
    onUserSelect(userId);
    setOpen(false);
  }, [onUserSelect]);

  // 🎯 MEMOIZED: Prevent recreation on every render
  const handleTriggerClick = useCallback(() => {
    logger.debug('🔍 UserSelectorDropdown - trigger clicked');
  }, []);
  return <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild onClick={handleTriggerClick}>
        {trigger}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-64">
        {headerInfo && <>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{headerInfo.title}</p>
                {headerInfo.description && <p className="text-xs leading-none text-muted-foreground">
                    {headerInfo.description}
                  </p>}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>}
        
        {allowClear && <>
            
            <DropdownMenuSeparator />
          </>}

        <DropdownMenuGroup>
          {loading ? <DropdownMenuItem disabled className="flex items-center gap-2">
              <LoadingSpinner size="sm" />
              <span>Loading users...</span>
            </DropdownMenuItem> : users.length === 0 ? <DropdownMenuItem disabled>
              No users available
            </DropdownMenuItem> : users.map(user => {
                const isDisabled = disabledUserIds.includes(user.id);
                const disabledReason = disabledReasons[user.id];
                
                const menuItem = (
                  <DropdownMenuItem 
                    key={user.id} 
                    onClick={() => !isDisabled && handleUserSelect(user.id)} 
                    className="flex items-center gap-2"
                    disabled={isDisabled}
                  >
                    <UserAvatar userId={user.id} fullName={user.full_name} email={user.email} avatarUrl={user.avatar_url} size="sm" />
                    <div className="flex flex-col flex-1">
                      <span className="text-sm">{user.full_name}</span>
                      <span className="text-xs text-muted-foreground">{user.email}</span>
                    </div>
                    {isDisabled && <AlertCircle className="h-4 w-4 text-muted-foreground" />}
                    {selectedUserId === user.id && <Check className="ml-auto h-4 w-4" />}
                  </DropdownMenuItem>
                );

                if (isDisabled && disabledReason) {
                  return (
                    <TooltipProvider key={user.id}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          {menuItem}
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">{disabledReason}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                }

                return menuItem;
              })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>;
});

UserSelectorDropdown.displayName = 'UserSelectorDropdown';