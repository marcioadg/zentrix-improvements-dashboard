
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, BarChart3, Edit, Shield, Users, Eye, Settings, CheckCircle, AlertCircle } from 'lucide-react';
import { UserAvatar } from '@/components/UserAvatar';
import { useUserManagement } from '@/hooks/useUserManagement';
import { CAPABILITY_DEFINITIONS } from '@/utils/capabilityDefinitions';

const MetricsPermissionsTab: React.FC = () => {
  const { users, loading } = useUserManagement();
  const [search, setSearch] = useState('');
  const [permissionFilter, setPermissionFilter] = useState<string>('all');
  const [capabilityFilter, setCapabilityFilter] = useState<string>('all');

  // Get metrics-related capabilities
  const metricsCapabilities = CAPABILITY_DEFINITIONS.filter(cap => 
    cap.category === 'Metrics & Data'
  );

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = search === '' || 
        user.full_name.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase());

      const matchesPermission = permissionFilter === 'all' || user.permission_level === permissionFilter;

      const matchesCapability = capabilityFilter === 'all' || 
        user.capabilities.includes(capabilityFilter);

      return matchesSearch && matchesPermission && matchesCapability;
    });
  }, [users, search, permissionFilter, capabilityFilter]);

  const getMetricsCapabilities = (userCapabilities: string[]) => {
    return metricsCapabilities.filter(cap => userCapabilities.includes(cap.key));
  };

  const getCapabilityIcon = (capability: string) => {
    switch (capability) {
      case 'view_metrics':
        return <Eye className="h-3 w-3" />;
      case 'edit_metrics':
        return <Edit className="h-3 w-3" />;
      case 'manage_metrics':
        return <Settings className="h-3 w-3" />;
      case 'view_company_data':
        return <BarChart3 className="h-3 w-3" />;
      case 'access_analytics':
        return <Shield className="h-3 w-3" />;
      default:
        return <BarChart3 className="h-3 w-3" />;
    }
  };

  const getCapabilityBadgeVariant = (capability: string) => {
    switch (capability) {
      case 'view_metrics':
        return 'secondary';
      case 'edit_metrics':
        return 'default';
      case 'manage_metrics':
        return 'destructive';
      case 'view_company_data':
        return 'outline';
      case 'access_analytics':
        return 'secondary';
      default:
        return 'outline';
    }
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
    <div className="space-y-6">
      {/* Enhanced Metrics Permissions Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Metrics Permissions Overview
          </CardTitle>
          <CardDescription>
            Understand who can view, edit, and manage metrics in your organization. All users can edit any metric regardless of ownership.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-primary/5 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="h-4 w-4 text-primary dark:text-blue-400" />
                <span className="font-medium text-blue-900 dark:text-blue-100">View Metrics</span>
              </div>
              <p className="text-sm text-primary dark:text-blue-300">
                Can view metric dashboards and team performance data
              </p>
            </div>
            <div className="p-4 bg-success/5 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-2">
                <Edit className="h-4 w-4 text-success dark:text-green-400" />
                <span className="font-medium text-green-900 dark:text-green-100">Edit Metrics</span>
              </div>
              <p className="text-sm text-success dark:text-green-300">
                Can update any metric values - not restricted by ownership
              </p>
            </div>
            <div className="p-4 bg-destructive/5 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2 mb-2">
                <Settings className="h-4 w-4 text-destructive dark:text-red-400" />
                <span className="font-medium text-red-900 dark:text-red-100">Manage Metrics</span>
              </div>
              <p className="text-sm text-red-700 dark:text-red-300">
                Can create, delete, and fully control metrics structure
              </p>
            </div>
          </div>

          {/* Key Point about Metric Editing */}
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-900 dark:text-amber-100 mb-1">Important: Universal Metric Editing</h4>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Any user with "Edit Metrics" capability can update <strong>any metric's values</strong>, regardless of who owns the metric. 
                  Metric ownership determines who is responsible for the metric, but does not restrict editing permissions.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
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
          
          <Select value={capabilityFilter} onValueChange={setCapabilityFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Metrics Capability" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Capabilities</SelectItem>
              {metricsCapabilities.map((cap) => (
                <SelectItem key={cap.key} value={cap.key}>
                  {cap.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <Users className="h-4 w-4" />
        <span>
          Showing {filteredUsers.length} of {users.length} users
        </span>
      </div>

      {/* Metrics Permissions Table */}
      <Card>
        <CardHeader>
          <CardTitle>User Metrics Permissions</CardTitle>
          <CardDescription>
            Detailed view of each user's metrics-related capabilities and data access scope
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Permission Level</TableHead>
                  <TableHead>Metrics Capabilities</TableHead>
                  <TableHead>Data Access Scope</TableHead>
                  <TableHead>Can Edit Metrics</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => {
                  const userMetricsCapabilities = getMetricsCapabilities(user.capabilities);
                  const hasCompanyAccess = user.capabilities.includes('view_company_data');
                  const canEditMetrics = user.capabilities.includes('edit_metrics');
                  const canManageMetrics = user.capabilities.includes('manage_metrics');
                  
                  return (
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
                      
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {user.permission_level}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {userMetricsCapabilities.length > 0 ? (
                            userMetricsCapabilities.map((cap) => (
                              <Badge 
                                key={cap.key} 
                                variant={getCapabilityBadgeVariant(cap.key)}
                                className="text-xs flex items-center gap-1"
                                title={cap.description}
                              >
                                {getCapabilityIcon(cap.key)}
                                {cap.label}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-sm text-muted-foreground">No metrics access</span>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="space-y-1">
                          {hasCompanyAccess ? (
                            <Badge variant="default" className="text-xs">
                              Company-wide
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              Team-only
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          {canEditMetrics ? (
                            <div className="flex items-center gap-1">
                              <CheckCircle className="h-4 w-4 text-success dark:text-green-400" />
                              <span className="text-sm text-success dark:text-green-300 font-medium">
                                All metrics
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <AlertCircle className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                No editing
                              </span>
                            </div>
                          )}
                          {canManageMetrics && (
                            <Badge variant="destructive" className="text-xs">
                              + Create/Delete
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                
                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No users found matching your criteria
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Permission Level Details */}
      <Card>
        <CardHeader>
          <CardTitle>Metrics Permission Levels Explained</CardTitle>
          <CardDescription>
            Detailed breakdown of what each permission level can do with metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Eye className="h-4 w-4 text-primary dark:text-blue-400" />
                  View-Only Users
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• View team metrics and dashboards</li>
                  <li>• Access basic metric data</li>
                  <li>• <strong>Cannot edit any metrics</strong></li>
                  <li>• Team-only data access</li>
                </ul>
              </div>
              
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Edit className="h-4 w-4 text-success dark:text-green-400" />
                  Members
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• View team metrics and dashboards</li>
                  <li>• <strong>Edit ANY metric values</strong></li>
                  <li>• Update metrics they own or others own</li>
                  <li>• Team-only data access</li>
                </ul>
              </div>
              
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Settings className="h-4 w-4 text-primary dark:text-blue-400" />
                  Managers
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• <strong>Edit ANY metric values</strong></li>
                  <li>• Create and delete metrics</li>
                  <li>• Company-wide data access</li>
                  <li>• Access analytics and reports</li>
                  <li>• Change metric ownership</li>
                </ul>
              </div>
              
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-destructive dark:text-red-400" />
                  Directors & Super Admins
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• <strong>Full metrics management</strong></li>
                  <li>• Company-wide data access</li>
                  <li>• Edit any metric, change ownership</li>
                  <li>• Access all analytics</li>
                  <li>• Complete system control</li>
                </ul>
              </div>
            </div>

            {/* Key Insights */}
            <div className="bg-primary/5 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Key Insights</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-primary dark:text-blue-300">
                <div>
                  <strong>Metric Editing:</strong> Members and above can edit ANY metric value, regardless of who owns it. This promotes collaboration and ensures metrics stay up-to-date.
                </div>
                <div>
                  <strong>Data Access:</strong> Only Directors and Super Admins have company-wide access. Members see team-only data for privacy and focus.
                </div>
                <div>
                  <strong>Metric Management:</strong> Only Managers and above can create, delete, or change ownership of metrics to maintain structure.
                </div>
                <div>
                  <strong>Analytics:</strong> Advanced analytics and reporting are limited to management roles to prevent information overload.
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MetricsPermissionsTab;
