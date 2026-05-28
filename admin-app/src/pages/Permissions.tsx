
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Users, Settings, Wifi, BarChart3 } from 'lucide-react';
import { CompanySelector } from '@/components/shared/CompanySelector';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { useUserManagement } from '@/hooks/useUserManagement';
import PermissionsTable from '@/components/permissions/PermissionsTable';
import PermissionLevelsTab from '@/components/permissions/PermissionLevelsTab';
import MetricsPermissionsTab from '@/components/permissions/MetricsPermissionsTab';

const Permissions = () => {
  const { currentCompany, companies } = useMultiCompanyAccess();
  const [selectedCompanyId, setSelectedCompanyId] = React.useState<string>(currentCompany?.id || '');
  
  const { 
    users, 
    loading,
    updateUserPermission 
  } = useUserManagement();

  React.useEffect(() => {
    if (currentCompany && !selectedCompanyId) {
      setSelectedCompanyId(currentCompany?.id);
    }
  }, [currentCompany, selectedCompanyId]);

  const handleCompanyChange = (companyId: string) => {
    setSelectedCompanyId(companyId);
  };

  const statsData = React.useMemo(() => {
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.email_confirmed_at).length;
    const adminUsers = users.filter(u => 
      u.permission_level === 'director' || 
      u.permission_level === 'super_admin'
    ).length;
    const managerUsers = users.filter(u => 
      u.permission_level === 'manager' || 
      u.permission_level === 'director' ||
      u.permission_level === 'super_admin'
    ).length;

    return { totalUsers, activeUsers, adminUsers, managerUsers };
  }, [users]);

  return (
    <div className="px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold text-foreground tracking-tight">Permissions</h1>
          <p className="text-[13px] text-muted-foreground">
            Manage user permission levels and capabilities across your organization
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge className="bg-success/10 text-green-800">
            <Wifi className="h-3 w-3 mr-1" />
            Live Updates
          </Badge>
        </div>
      </div>

      {/* Company Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Company Selection</span>
          </CardTitle>
          <CardDescription>
            Select a company to view and manage user permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CompanySelector
            selectedCompanyId={selectedCompanyId}
            onCompanyChange={handleCompanyChange}
            className="max-w-md"
          />
        </CardContent>
      </Card>

      {selectedCompanyId && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{statsData.totalUsers}</div>
                <p className="text-xs text-muted-foreground">
                  {statsData.activeUsers} active
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Managers+</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{statsData.managerUsers}</div>
                <p className="text-xs text-muted-foreground">
                  Manager or above level
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Directors+</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{statsData.adminUsers}</div>
                <p className="text-xs text-muted-foreground">
                  Director or Super Admin
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{statsData.totalUsers - statsData.activeUsers}</div>
                <p className="text-xs text-muted-foreground">
                  Awaiting confirmation
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Tabs defaultValue="management" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="management" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                User Management
              </TabsTrigger>
              <TabsTrigger value="metrics-permissions" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Metrics Permissions
              </TabsTrigger>
              <TabsTrigger value="permission-levels" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Permission Levels
              </TabsTrigger>
            </TabsList>

            <TabsContent value="management">
              <Card>
                <CardHeader>
                  <CardTitle>User Permissions</CardTitle>
                  <CardDescription>
                    Manage user permission levels and view their capabilities in real-time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PermissionsTable />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="metrics-permissions">
              <MetricsPermissionsTab />
            </TabsContent>

            <TabsContent value="permission-levels">
              <PermissionLevelsTab />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default Permissions;
