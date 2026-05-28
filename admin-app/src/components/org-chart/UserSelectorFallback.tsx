
import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle, Loader2, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { getUserDisplayName } from '@/utils/userDisplayUtils';
import { logger } from '@/utils/logger';

interface UserSelectorFallbackProps {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

export const UserSelectorFallback: React.FC<UserSelectorFallbackProps> = ({
  value,
  onValueChange,
  disabled = false
}) => {
  const { currentCompany } = useMultiCompanyAccess();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    if (!currentCompany?.id) return;

    setLoading(true);
    setError(null);
    
    try {
      logger.log('🔍 UserSelectorFallback: Fetching users for company:', currentCompany?.id);
      
      // Simple direct query as fallback
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .eq('company_id', currentCompany?.id)
        .order('full_name');

      if (error) throw error;

      const validUsers = (data || []).filter(user => user.id);

      logger.log('🔍 UserSelectorFallback: Loaded users:', validUsers.length);
      setUsers(validUsers);
    } catch (err) {
      logger.error('🚨 UserSelectorFallback: Error fetching users:', err);
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [currentCompany?.id]);

  if (error) {
    return (
      <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
        <AlertCircle className="h-4 w-4 text-destructive" />
        <div className="flex-1">
          <p className="text-sm text-destructive font-medium">Unable to load users</p>
          <p className="text-xs text-muted-foreground">{error}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={fetchUsers}
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled || loading}>
      <SelectTrigger>
        <SelectValue placeholder={loading ? "Loading users..." : "Select person (optional)"} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="vacant">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            Position vacant
          </div>
        </SelectItem>
        {loading ? (
          <SelectItem value="loading" disabled>
            <div className="flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              Loading users...
            </div>
          </SelectItem>
        ) : users.length === 0 ? (
          <SelectItem value="no-users" disabled>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-3 w-3 text-muted-foreground" />
              No users found in this company
            </div>
          </SelectItem>
        ) : (
          users.map((user) => {
            const displayName = getUserDisplayName(user);
            const hasRealName = user?.full_name && user.full_name.trim().length > 0;
            
            return (
              <SelectItem key={user.id} value={user.id}>
                {displayName} {hasRealName && user.email ? `(${user.email})` : (!hasRealName && !user.email ? '(No email)' : '')}
              </SelectItem>
            );
          })
        )}
      </SelectContent>
    </Select>
  );
};
