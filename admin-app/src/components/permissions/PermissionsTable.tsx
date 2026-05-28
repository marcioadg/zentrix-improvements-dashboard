
import React, { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, Users } from 'lucide-react';
import { UserAvatar } from '@/components/UserAvatar';
import { RoleSelector } from '@/components/shared/RoleSelector';
import CapabilitiesList from './CapabilitiesList';
import { useUserManagement, type UnifiedUser } from '@/hooks/useUserManagement';

const PermissionsTable: React.FC = () => {
  const {
    users,
    loading,
    roleUpdating,
    updateUserPermission,
  } = useUserManagement();

  const [search, setSearch] = useState('');
  const [permissionFilter, setPermissionFilter] = useState<string>('all');

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = search === '' || 
        user.full_name.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase());

      const matchesPermission = permissionFilter === 'all' || user.permission_level === permissionFilter;

      return matchesSearch && matchesPermission;
    });
  }, [users, search, permissionFilter]);

  const handlePermissionUpdate = async (userId: string, value: string) => {
    await updateUserPermission(userId, 'permission_level', value);
  };

  const getStatusBadge = (user: UnifiedUser) => {
    if (!user.email_confirmed_at) {
      return <Badge variant="secondary">Pending</Badge>;
    }
    return <Badge variant="default">Active</Badge>;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 flex-1">
            <Search className="h-4 w-4 text-muted-foreground" />
            <div className="h-10 bg-muted rounded w-64 animate-pulse" />
          </div>
          <div className="h-10 bg-muted rounded w-32 animate-pulse" />
        </div>
        <div className="border rounded-lg">
          <div className="h-12 bg-muted/50 border-b" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 border-b last:border-b-0 bg-background animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2 flex-1">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={permissionFilter} onValueChange={setPermissionFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Permission" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Permissions</SelectItem>
              <SelectItem value="view-only">View-Only</SelectItem>
              <SelectItem value="member">Member</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="director">Director</SelectItem>
              <SelectItem value="super_admin">Super Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex items-center space-x-2 text-sm text-secondary-foreground">
        <Users className="h-4 w-4" />
        <span>
          Showing {filteredUsers.length} of {users.length} users
        </span>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Permission Level</TableHead>
              <TableHead>Capabilities</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.user_id}>
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <UserAvatar 
                      fullName={user.full_name}
                      email={user.email}
                      avatarUrl={user.avatar_url}
                      size="sm"
                    />
                    <div>
                      <div className="font-medium">{user.full_name}</div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                    </div>
                  </div>
                </TableCell>
                
                <TableCell className="w-48">
                  <RoleSelector
                    selectedRole={user.permission_level}
                    onRoleChange={(value) => handlePermissionUpdate(user.user_id, value)}
                    disabled={roleUpdating === user.user_id}
                  />
                </TableCell>
                
                <TableCell className="max-w-xs">
                  <CapabilitiesList capabilities={user.capabilities} />
                </TableCell>
                
                <TableCell>
                  {getStatusBadge(user)}
                </TableCell>
              </TableRow>
            ))}
            
            {filteredUsers.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No users found matching your criteria
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default PermissionsTable;
