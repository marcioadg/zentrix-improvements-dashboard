
import React, { useState, useRef, useCallback } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { getUserDisplayName } from '@/utils/userDisplayUtils';
import { getInitials } from '@/utils/nameUtils';

interface User {
  id: string;
  full_name: string;
  email?: string;
  avatar_url?: string;
}

interface HeaderInfo {
  title: string;
  description?: string;
}

interface MultiUserSelectorProps {
  users: User[];
  selectedUserIds: string[];
  onSelectionChange: (userIds: string[]) => void;
  placeholder?: string;
  headerInfo?: HeaderInfo;
  className?: string;
  compact?: boolean;
}

export const MultiUserSelector: React.FC<MultiUserSelectorProps> = ({
  users = [],
  selectedUserIds = [],
  onSelectionChange,
  placeholder = "Select users...",
  headerInfo,
  className,
  compact = false,
}) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const safeUsers = Array.isArray(users) ? users : [];
  const safeSelectedUserIds = Array.isArray(selectedUserIds) ? selectedUserIds : [];

  const filteredUsers = safeUsers.filter(user => {
    if (!searchTerm) return true;
    const displayName = getUserDisplayName(user).toLowerCase();
    const email = user.email?.toLowerCase() || '';
    const searchLower = searchTerm.toLowerCase();
    return displayName.includes(searchLower) || email.includes(searchLower);
  });

  const handleSelect = useCallback((userId: string, event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    const isCurrentlySelected = safeSelectedUserIds.includes(userId);
    const newSelection = isCurrentlySelected
      ? safeSelectedUserIds.filter(id => id !== userId)
      : [...safeSelectedUserIds, userId];
    
    onSelectionChange(newSelection);
  }, [safeSelectedUserIds, onSelectionChange]);

  const getSelectedUsers = useCallback(() => {
    return safeUsers.filter(user => safeSelectedUserIds.includes(user.id));
  }, [safeUsers, safeSelectedUserIds]);

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setSearchTerm('');
    } else {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, []);

  const selectedUsers = getSelectedUsers();

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between", compact ? "h-10 w-auto min-w-[2.5rem] px-2" : "w-full h-15", className)}
        >
          {selectedUsers.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : compact ? (
            <div className="flex items-center gap-1">
              {selectedUsers.slice(0, 3).map(user => (
                <Avatar key={user.id} className="h-6 w-6">
                  <AvatarImage src={user.avatar_url} />
                  <AvatarFallback className="text-xs">
                    {getInitials(user.full_name, user.email)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {selectedUsers.length > 3 && (
                <span className="text-xs text-muted-foreground ml-1">
                  +{selectedUsers.length - 3}
                </span>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap gap-1 max-w-full">
              {selectedUsers.map(user => {
                const displayName = getUserDisplayName(user);
                return (
                  <Badge key={user.id} variant="secondary" className="text-xs">
                    {displayName}
                  </Badge>
                );
              })}
            </div>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="min-w-[240px] w-[--radix-popover-trigger-width] p-0 max-h-[380px] overflow-hidden"
        align="start"
        sideOffset={4}
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          setTimeout(() => searchInputRef.current?.focus(), 50);
        }}
      >
        {/* Header */}
        {headerInfo && (
          <div className="px-3 py-2 border-b border-border">
            <h4 className="text-sm font-medium text-foreground">{headerInfo.title}</h4>
            {headerInfo.description && (
              <p className="text-xs text-muted-foreground mt-1">
                {headerInfo.description}
              </p>
            )}
          </div>
        )}

        {/* Search Input */}
        <div className="p-2 border-b border-border">
          <Input
            ref={searchInputRef}
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8"
          />
        </div>

        {/* User List */}
        <div className="overflow-y-auto" style={{ maxHeight: '240px' }}>
          {filteredUsers.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {searchTerm ? 'No users found matching your search.' : 'No users found.'}
            </div>
          ) : (
            <div className="p-1">
              {filteredUsers.map((user) => {
                const displayName = getUserDisplayName(user);
                const hasRealName = user?.full_name && user.full_name.trim().length > 0;
                const isSelected = safeSelectedUserIds.includes(user.id);
                
                return (
                  <div
                    key={user.id}
                    onClick={(e) => handleSelect(user.id, e)}
                    className="flex items-center gap-2 cursor-pointer hover:bg-accent px-2 py-2 rounded-sm mx-1 my-0.5 transition-colors"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Avatar className="h-6 w-6 flex-shrink-0">
                        <AvatarImage src={user.avatar_url} />
                        <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                          {getInitials(user.full_name, user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-sm text-foreground truncate font-medium">
                          {displayName}
                        </span>
                        {hasRealName && user.email && (
                          <span className="text-xs text-muted-foreground truncate">
                            {user.email}
                          </span>
                        )}
                      </div>
                    </div>
                    <Check
                      className={cn(
                        "h-4 w-4 flex-shrink-0 text-primary transition-all duration-200",
                        isSelected ? "opacity-100 scale-100" : "opacity-0 scale-75"
                      )}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
