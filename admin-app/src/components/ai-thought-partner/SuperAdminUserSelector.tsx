import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserManagement } from '@/hooks/useUserManagement';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from '@/components/ui/select';
import { UserCircle2 } from 'lucide-react';

interface SuperAdminUserSelectorProps {
  selectedUserId: string | null;
  onUserChange: (userId: string | null) => void;
  currentCompanyId?: string;
}

export const SuperAdminUserSelector: React.FC<SuperAdminUserSelectorProps> = ({
  selectedUserId,
  onUserChange,
  currentCompanyId
}) => {
  const { users, loading } = useUserManagement();
  const { user: currentUser } = useAuth();

  // Filter active users only
  const activeUsers = users.filter(u => u.status === 'active');

  const displayValue = selectedUserId 
    ? activeUsers.find(u => u.user_id === selectedUserId)?.full_name || 'Unknown User'
    : currentUser?.user_metadata?.full_name || 'You';

  if (loading) {
    return (
      <div className="w-[200px] h-9 px-3 py-2 border border-amber-500/30 bg-amber-500/10 rounded-md flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400">
        <UserCircle2 className="h-4 w-4" />
        Loading...
      </div>
    );
  }

  return (
    <Select 
      value={selectedUserId || currentUser?.id || ''} 
      onValueChange={(value) => {
        onUserChange(value === currentUser?.id ? null : value);
      }}
    >
      <SelectTrigger className="w-[200px] border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 focus:ring-amber-500/50">
        <div className="flex items-center gap-2">
          <UserCircle2 className="h-4 w-4" />
          <SelectValue>
            <span className="text-xs font-medium">{displayValue}</span>
          </SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={currentUser?.id || ''}>
          <div className="flex items-center gap-2">
            <span className="font-medium">You</span>
            <span className="text-xs text-muted-foreground">(Current User)</span>
          </div>
        </SelectItem>
        <SelectSeparator />
        {activeUsers.map(user => (
          <SelectItem key={user.user_id} value={user.user_id}>
            <div className="flex flex-col gap-0.5">
              <span className="text-sm">{user.full_name}</span>
              <span className="text-xs text-muted-foreground">{user.email}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
