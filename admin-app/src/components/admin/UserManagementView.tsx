import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Users, Search, MoreHorizontal, Shield, ShieldCheck, RefreshCw } from 'lucide-react';
import { useUserRoles, UserWithRoles, useCurrentUserRoles } from '@/hooks/useUserRoles';
import { formatDistanceToNow } from 'date-fns';
import { useComprehensiveActivityLogging } from '@/hooks/useComprehensiveActivityLogging';

export const UserManagementView = () => {
  const { users, loading, assignRole, removeRole, refetch } = useUserRoles();
  const { isSuperAdmin: isCurrentUserSuperAdmin } = useCurrentUserRoles();
  const { logUserManagementAction } = useComprehensiveActivityLogging();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredUsers = users.filter(user =>
    user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAssignAssistantRole = async (user: UserWithRoles) => {
    await assignRole(user.id, 'super_admin_assistant');
    await logUserManagementAction(
      'role_change',
      user.id,
      `Assigned super admin assistant role to ${user.full_name}`,
      { role: 'super_admin_assistant', action: 'assign' }
    );
  };

  const handleRemoveAssistantRole = async (user: UserWithRoles) => {
    await removeRole(user.id, 'super_admin_assistant');
    await logUserManagementAction(
      'role_change',
      user.id,
      `Removed super admin assistant role from ${user.full_name}`,
      { role: 'super_admin_assistant', action: 'remove' }
    );
  };

  const getTotalStats = () => {
    return {
      totalUsers: users.length,
      superAdminAssistants: users.filter(u => u.roles.includes('super_admin_assistant')).length,
      superAdmins: users.filter(u => u.roles.includes('super_admin')).length,
    };
  };

  const stats = getTotalStats();

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadges = (roles: string[]) => {
    return roles.map(role => {
      let variant: 'default' | 'secondary' | 'destructive' = 'secondary';
      let icon = null;
      
      if (role === 'super_admin') {
        variant = 'destructive';
        icon = <Shield className="h-3 w-3 mr-1" />;
      } else if (role === 'super_admin_assistant') {
        variant = 'default';
        icon = <ShieldCheck className="h-3 w-3 mr-1" />;
      }

      return (
        <Badge key={role} variant={variant} className="flex items-center">
          {icon}
          {role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </Badge>
      );
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-3 md:p-4">
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs md:text-sm font-medium text-muted-foreground">Total Users</p>
              <p className="text-lg md:text-2xl font-bold">{stats.totalUsers}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-3 md:p-4">
          <div className="flex items-center space-x-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs md:text-sm font-medium text-muted-foreground">Super Admins</p>
              <p className="text-lg md:text-2xl font-bold">{stats.superAdmins}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-3 md:p-4">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs md:text-sm font-medium text-muted-foreground">Assistants</p>
              <p className="text-lg md:text-2xl font-bold">{stats.superAdminAssistants}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader className="space-y-1">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg md:text-xl">User Management</CardTitle>
              <CardDescription className="text-sm md:text-base">
                Manage user roles and permissions
              </CardDescription>
            </div>
            <Button onClick={refetch} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
          
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="md:overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar_url} />
                          <AvatarFallback className="text-xs">
                            {getUserInitials(user.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{user.full_name}</div>
                          <a 
                            href={`mailto:${user.email}`}
                            className="text-sm text-muted-foreground hover:text-primary transition-colors underline decoration-dotted"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {user.email}
                          </a>
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.roles.length > 0 ? (
                          getRoleBadges(user.roles)
                        ) : (
                          <Badge variant="outline">Member</Badge>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                    </TableCell>
                    
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                         <DropdownMenuContent align="end">
                           {!user.roles.includes('super_admin_assistant') && !user.roles.includes('super_admin') && isCurrentUserSuperAdmin() && (
                             <DropdownMenuItem onClick={() => handleAssignAssistantRole(user)}>
                               <ShieldCheck className="h-4 w-4 mr-2" />
                               Make Assistant
                             </DropdownMenuItem>
                           )}
                           {user.roles.includes('super_admin_assistant') && isCurrentUserSuperAdmin() && (
                             <DropdownMenuItem onClick={() => handleRemoveAssistantRole(user)}>
                               <Shield className="h-4 w-4 mr-2" />
                               Remove Assistant
                             </DropdownMenuItem>
                           )}
                           {user.roles.includes('super_admin') && (
                             <DropdownMenuItem disabled>
                               <Shield className="h-4 w-4 mr-2" />
                               Cannot modify Super Admin
                             </DropdownMenuItem>
                           )}
                           {!isCurrentUserSuperAdmin() && !user.roles.includes('super_admin') && (
                             <DropdownMenuItem disabled>
                               <Shield className="h-4 w-4 mr-2" />
                               Only Super Admins can manage assistants
                             </DropdownMenuItem>
                           )}
                         </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {filteredUsers.length === 0 && (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? 'No users found matching your search.' : 'No users found.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};