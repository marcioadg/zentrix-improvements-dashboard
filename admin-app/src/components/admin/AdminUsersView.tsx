import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Shield, ShieldCheck, UserPlus, UserMinus, Search } from 'lucide-react';
import { useUserRoles, useCurrentUserRoles } from '@/hooks/useUserRoles';
import { formatDistanceToNow } from 'date-fns';
import { useComprehensiveActivityLogging } from '@/hooks/useComprehensiveActivityLogging';

export const AdminUsersView = () => {
  const { users, loading, assignRole, removeRole } = useUserRoles();
  const { isSuperAdmin: isCurrentUserSuperAdmin } = useCurrentUserRoles();
  const { logUserManagementAction } = useComprehensiveActivityLogging();
  const [searchQuery, setSearchQuery] = useState('');

  const handleAssignRole = async (userId: string) => {
    try {
      const user = users?.find(u => u.id === userId);
      await assignRole(userId, 'super_admin_assistant');
      await logUserManagementAction(
        'role_change',
        userId,
        `Assigned super admin assistant role to ${user?.full_name || 'Unknown User'}`,
        { role: 'super_admin_assistant', action: 'assign' }
      );
    } catch {
      // Role assignment errors are handled by the hook
    }
  };

  const handleRemoveRole = async (userId: string) => {
    try {
      const user = users?.find(u => u.id === userId);
      await removeRole(userId, 'super_admin_assistant');
      await logUserManagementAction(
        'role_change',
        userId,
        `Removed super admin assistant role from ${user?.full_name || 'Unknown User'}`,
        { role: 'super_admin_assistant', action: 'remove' }
      );
    } catch {
      // Role removal errors are handled by the hook
    }
  };

  const isSuperAdminAssistant = (roles: string[]) => {
    return roles.includes('super_admin_assistant');
  };

  const hasUserSuperAdminRole = (roles: string[]) => {
    return roles.includes('super_admin');
  };

  // Separate admin users from regular users
  const adminUsers = users.filter(user => 
    user.roles.includes('super_admin') || user.roles.includes('super_admin_assistant')
  );

  const nonAdminUsers = users.filter(user => 
    !user.roles.includes('super_admin') && !user.roles.includes('super_admin_assistant')
  );

  // Filter non-admin users only if there's a search query
  const searchedNonAdminUsers = searchQuery 
    ? nonAdminUsers.filter(user => 
        user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  // Combine admin users (always shown) with searched non-admin users
  const displayedUsers = [...adminUsers, ...searchedNonAdminUsers];

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Admin Users Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-muted rounded-full animate-pulse" />
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded animate-pulse w-32" />
                    <div className="h-3 bg-muted rounded animate-pulse w-24" />
                  </div>
                </div>
                <div className="h-9 bg-muted rounded animate-pulse w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Admin Users Management
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Assign Super Admin Assistant roles to users. They can perform all administrative tasks except deleting or promoting to Super Admin.
          </p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search users by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Show current admin users section */}
            {adminUsers.length > 0 && (
              <>
                <div className="flex items-center gap-2 pb-2">
                  <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-medium">Current Admin Users</h3>
                  <Badge variant="secondary" className="ml-auto">{adminUsers.length}</Badge>
                </div>
                {adminUsers.map((user) => {
                  const isAssistant = isSuperAdminAssistant(user.roles);
                  const isAdmin = hasUserSuperAdminRole(user.roles);
                  
                  return (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.avatar_url} alt={user.full_name} />
                          <AvatarFallback>
                            {user.full_name
                              .split(' ')
                              .map(n => n[0])
                              .join('')
                              .toUpperCase()
                              .slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{user.full_name}</span>
                            <div className="flex gap-1">
                              {isAdmin && (
                                <Badge variant="destructive" className="text-xs">
                                  <Shield className="h-3 w-3 mr-1" />
                                  Super Admin
                                </Badge>
                              )}
                              {isAssistant && (
                                <Badge variant="secondary" className="text-xs">
                                  <ShieldCheck className="h-3 w-3 mr-1" />
                                  Assistant
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <a 
                              href={`mailto:${user.email}`}
                              className="hover:text-primary transition-colors underline decoration-dotted"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {user.email}
                            </a>
                            <span>•</span>
                            <span>
                              Joined {formatDistanceToNow(new Date(user.created_at))} ago
                            </span>
                          </div>
                        </div>
                      </div>
                      
                       <div className="flex items-center gap-2">
                         {isAssistant && !isAdmin && isCurrentUserSuperAdmin() && (
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => handleRemoveRole(user.id)}
                             className="flex items-center gap-2"
                           >
                             <UserMinus className="h-4 w-4" />
                             Remove Role
                           </Button>
                         )}
                         
                         {isAdmin && (
                           <Badge variant="destructive" className="text-xs">
                             Cannot modify Super Admin
                           </Badge>
                         )}
                       </div>
                    </div>
                  );
                })}
              </>
            )}

            {/* Show searched non-admin users */}
            {searchedNonAdminUsers.length > 0 && (
              <>
                <div className="flex items-center gap-2 pb-2 pt-4 border-t mt-4">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-medium">Search Results</h3>
                  <Badge variant="secondary" className="ml-auto">{searchedNonAdminUsers.length}</Badge>
                </div>
                {searchedNonAdminUsers.map((user) => {
                  return (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.avatar_url} alt={user.full_name} />
                          <AvatarFallback>
                            {user.full_name
                              .split(' ')
                              .map(n => n[0])
                              .join('')
                              .toUpperCase()
                              .slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{user.full_name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <a 
                              href={`mailto:${user.email}`}
                              className="hover:text-primary transition-colors underline decoration-dotted"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {user.email}
                            </a>
                            <span>•</span>
                            <span>
                              Joined {formatDistanceToNow(new Date(user.created_at))} ago
                            </span>
                          </div>
                        </div>
                      </div>
                      
                       <div className="flex items-center gap-2">
                         {isCurrentUserSuperAdmin() && (
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => handleAssignRole(user.id)}
                             className="flex items-center gap-2"
                           >
                             <UserPlus className="h-4 w-4" />
                             Make Assistant
                           </Button>
                         )}
                         
                         {!isCurrentUserSuperAdmin() && (
                           <Badge variant="outline" className="text-xs">
                             Only Super Admins can manage assistants
                           </Badge>
                         )}
                       </div>
                    </div>
                  );
                })}
              </>
            )}
            
            {/* Show message when no search is performed */}
            {!searchQuery && adminUsers.length > 0 && (
              <div className="text-center py-8 text-muted-foreground border-t mt-4">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">Search by name or email to find users to promote</p>
              </div>
            )}
            
            {/* Show message when search has no results */}
            {searchQuery && searchedNonAdminUsers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground border-t mt-4">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No users found matching "{searchQuery}"</p>
              </div>
            )}
            
            {/* Show message when there are no admin users and no search */}
            {adminUsers.length === 0 && !searchQuery && (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No admin users assigned yet</p>
                <p className="text-sm mt-2">Search to find users to promote</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Super Admin Assistant Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
              <span>Can manage all companies, users, and system settings</span>
            </div>
            <div className="flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
              <span>Can view system analytics and logs</span>
            </div>
            <div className="flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
              <span>Can assign/remove Super Admin Assistant roles</span>
            </div>
            <div className="flex items-start gap-2">
              <UserMinus className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
              <span>Cannot delete companies or critical system data</span>
            </div>
            <div className="flex items-start gap-2">
              <UserMinus className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
              <span>Cannot promote users to Super Admin status</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};