
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Loader2 } from 'lucide-react';
import { useUserManagement } from '@/hooks/useUserManagement';
import { getUserDisplayName } from '@/utils/userDisplayUtils';
import { getInitials } from '@/utils/nameUtils';
import { logger } from '@/utils/logger';

interface UnrestrictedUserSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

export const UnrestrictedUserSelector: React.FC<UnrestrictedUserSelectorProps> = ({
  value,
  onValueChange,
  disabled = false
}) => {
  const { users, loading } = useUserManagement();

  logger.log('🔍 UnrestrictedUserSelector: Rendering with users:', users?.length || 0, 'loading:', loading);

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-3 border rounded-md bg-background">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Loading users...</span>
      </div>
    );
  }

  const safeUsers = Array.isArray(users) ? users : [];
  
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select a person...">
          {value === 'vacant' ? (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                <Users className="w-3 h-3 text-muted-foreground" />
              </div>
              <span>Vacant</span>
            </div>
          ) : (
            (() => {
              const selectedUser = safeUsers.find(user => user.user_id === value || user.id === value);
              if (selectedUser) {
                const displayName = getUserDisplayName(selectedUser);
                return (
                  <div className="flex items-center gap-2">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={selectedUser.avatar_url} />
                      <AvatarFallback className="text-xs">
                        {getInitials(selectedUser.full_name, selectedUser.email)}
                      </AvatarFallback>
                    </Avatar>
                    <span>{displayName}</span>
                  </div>
                );
              }
              return "Select a person...";
            })()
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-popover border shadow-lg">
        <SelectItem value="vacant" className="bg-popover hover:bg-muted">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
              <Users className="w-3 h-3 text-muted-foreground" />
            </div>
            <span>Vacant</span>
          </div>
        </SelectItem>
        {safeUsers.map((user) => {
          const userId = user.user_id || user.id;
          const displayName = getUserDisplayName(user);
          
          return (
            <SelectItem 
              key={userId} 
              value={userId}
              className="bg-popover hover:bg-muted"
            >
              <div className="flex items-center gap-2">
                <Avatar className="w-6 h-6">
                  <AvatarImage src={user.avatar_url} />
                  <AvatarFallback className="text-xs">
                    {getInitials(user.full_name, user.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span>{displayName}</span>
                  {user.email && (
                    <span className="text-xs text-muted-foreground">{user.email}</span>
                  )}
                </div>
              </div>
            </SelectItem>
          );
        })}
        {safeUsers.length === 0 && (
          <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>No users available</span>
          </div>
        )}
      </SelectContent>
    </Select>
  );
};
