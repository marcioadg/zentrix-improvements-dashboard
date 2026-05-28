import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, X, Plus, Loader2 } from 'lucide-react';
import { useUserManagement } from '@/hooks/useUserManagement';
import { getUserDisplayName } from '@/utils/userDisplayUtils';
import { getInitials } from '@/utils/nameUtils';
import { logger } from '@/utils/logger';

interface MultiUserSelectorProps {
  value: string[]; // Array of user IDs
  onValueChange: (value: string[]) => void;
  disabled?: boolean;
}

export const MultiUserSelector: React.FC<MultiUserSelectorProps> = ({
  value,
  onValueChange,
  disabled = false
}) => {
  const { users, loading } = useUserManagement(false); // Only show active users for assignments

  logger.log('🔍 MultiUserSelector: Rendering with users:', users?.length || 0, 'loading:', loading);

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-3 border rounded-md bg-background">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Loading users...</span>
      </div>
    );
  }

  const safeUsers = Array.isArray(users) ? users : [];
  
  // Filter out pending users - only show truly active users for role assignments
  const activeUsersOnly = safeUsers.filter(user => {
    // Exclude pending users by multiple criteria for safety
    const userProfile = (user as any).profiles || user;
    return user.status !== 'pending' && 
           userProfile.full_name !== 'Pending User' && 
           user.user_id !== null;
  });
  
  // Helper function to get user ID from nested structure
  const getUserId = (user: any) => {
    return (user as any).profiles?.id || user.user_id || user.id;
  };
  
  const selectedUsers = activeUsersOnly.filter(user => 
    value.includes(getUserId(user))
  );
  
  // Filter out already selected users from the dropdown
  const availableUsers = activeUsersOnly.filter(user => 
    !value.includes(getUserId(user))
  );

  const handleAddUser = (userId: string) => {
    if (userId && !value.includes(userId)) {
      onValueChange([...value, userId]);
    }
  };

  const handleRemoveUser = (userId: string) => {
    onValueChange(value.filter(id => id !== userId));
  };

  const handleVacant = () => {
    onValueChange([]);
  };

  return (
    <div className="space-y-3">
      {/* Display selected users */}
      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedUsers.map((user) => {
            const userId = getUserId(user);
            const userProfile = (user as any).profiles || user;
            const displayName = getUserDisplayName(userProfile);
            
            return (
              <Badge 
                key={userId} 
                variant="secondary" 
                className="flex items-center gap-2 px-2 py-1"
              >
                <Avatar className="w-5 h-5">
                  <AvatarImage src={userProfile.avatar_url} />
                  <AvatarFallback className="text-xs">
                    {getInitials(userProfile.full_name, userProfile.email)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm">{displayName}</span>
                {!disabled && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                    aria-label="Remove user"
                    onClick={() => handleRemoveUser(userId)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </Badge>
            );
          })}
        </div>
      )}

      {/* Show vacant option if no users selected */}
      {selectedUsers.length === 0 && (
        <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
            <Users className="w-3 h-3 text-muted-foreground" />
          </div>
          <span className="text-sm text-muted-foreground">Role is vacant</span>
        </div>
      )}

      {/* Add new user */}
      {!disabled && availableUsers.length > 0 && (
        <div>
          <Select value="" onValueChange={handleAddUser}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Add a person..." />
            </SelectTrigger>
            <SelectContent className="bg-popover border shadow-lg max-h-60 overflow-y-auto">
              {availableUsers.map((user) => {
                const userId = getUserId(user);
                const userProfile = (user as any).profiles || user;
                const displayName = getUserDisplayName(userProfile);
                
                return (
                  <SelectItem 
                    key={userId} 
                    value={userId}
                    className="bg-popover hover:bg-muted"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={userProfile.avatar_url} />
                        <AvatarFallback className="text-xs">
                          {getInitials(userProfile.full_name, userProfile.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span>{displayName}</span>
                        {userProfile.email && (
                          <span className="text-xs text-muted-foreground">{userProfile.email}</span>
                        )}
                      </div>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Actions */}
      {!disabled && (
        <div className="flex gap-2">
          {selectedUsers.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleVacant}
              className="text-muted-foreground"
            >
              <Users className="h-4 w-4 mr-2" />
              Mark as Vacant
            </Button>
          )}
        </div>
      )}

      {availableUsers.length === 0 && selectedUsers.length === 0 && (
        <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
          <Users className="w-4 h-4" />
          <span>No users available</span>
        </div>
      )}
    </div>
  );
};