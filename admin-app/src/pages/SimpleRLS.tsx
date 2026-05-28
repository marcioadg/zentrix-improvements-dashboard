import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Shield, Search, Lock, Unlock, Eye, Database, AlertTriangle, CheckCircle } from 'lucide-react';
import { useSimplifiedRLSManagement } from '@/hooks/useSimplifiedRLSManagement';
import { useToast } from '@/hooks/use-toast';

const SimpleRLS = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  
  const {
    policies,
    tableStatuses,
    statistics,
    loading,
    error,
    isConnected,
    toggleTableRLS,
    refreshAll,
  } = useSimplifiedRLSManagement();

  const filteredTables = tableStatuses.filter(table => 
    table.table_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPolicies = policies.filter(policy => 
    policy.tablename.toLowerCase().includes(searchTerm.toLowerCase()) ||
    policy.policyname.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group policies by table and summarize permissions
  const tablePermissions = React.useMemo(() => {
    const grouped = new Map();
    
    policies.forEach(policy => {
      if (!grouped.has(policy.tablename)) {
        grouped.set(policy.tablename, {
          tablename: policy.tablename,
          permissions: {
            create: false,
            read: false,
            update: false,
            delete: false
          },
          policyCount: 0
        });
      }
      
      const table = grouped.get(policy.tablename);
      table.policyCount++;
      
      // Map SQL commands to CRUD operations
      switch (policy.cmd) {
        case 'INSERT':
          table.permissions.create = true;
          break;
        case 'SELECT':
          table.permissions.read = true;
          break;
        case 'UPDATE':
          table.permissions.update = true;
          break;
        case 'DELETE':
          table.permissions.delete = true;
          break;
      }
    });
    
    return Array.from(grouped.values()).filter(table =>
      table.tablename.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [policies, searchTerm]);

  const handleToggleProtection = async (tableName: string, currentlyEnabled: boolean) => {
    try {
      await toggleTableRLS(tableName, !currentlyEnabled);
      toast({
        title: "Success",
        description: `Table protection ${!currentlyEnabled ? 'enabled' : 'disabled'} for ${tableName}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update table protection",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading security settings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <CardTitle className="text-destructive">Cannot Load Security Settings</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              There was a problem loading your database security settings.
            </p>
            <Button onClick={refreshAll} className="w-full">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Database Security
              </h1>
              <p className="text-muted-foreground">
                Control who can access your data
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-destructive'}`} />
            <span className="text-sm text-muted-foreground">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* Security Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tables</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics?.total_tables || 0}</div>
              <p className="text-xs text-muted-foreground">
                Data storage tables
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Protected Tables</CardTitle>
              <Lock className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                {statistics?.rls_enabled_tables || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Tables with security enabled
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unprotected Tables</CardTitle>
              <Unlock className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {(statistics?.total_tables || 0) - (statistics?.rls_enabled_tables || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Tables without security
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Security Rules</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics?.total_policies || 0}</div>
              <p className="text-xs text-muted-foreground">
                Access control rules
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tables or security rules..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Tables Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Your Data Tables ({filteredTables.length})
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Each table stores different types of information. You can control who has access to each one.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {filteredTables.map((table) => (
                  <div key={table.table_name} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium">{table.table_name}</h3>
                        <div className="flex gap-2">
                          {table.rls_enabled ? (
                            <Badge variant="default" className="text-xs bg-success/10 text-green-800">
                              <Lock className="h-3 w-3 mr-1" />
                              Protected
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="text-xs">
                              <Unlock className="h-3 w-3 mr-1" />
                              Unprotected
                            </Badge>
                          )}
                          {table.policy_count > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {table.policy_count} rules
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {table.rls_enabled 
                          ? `This table is protected with ${table.policy_count} access rules`
                          : 'This table is not protected - anyone can access it'
                        }
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={table.rls_enabled}
                        onCheckedChange={() => handleToggleProtection(table.table_name, table.rls_enabled)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Simplified Permissions Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                User Permissions ({tablePermissions.length} tables)
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                What users can do with each data table.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {tablePermissions.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No permissions found</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Enable table protection to see user permissions
                    </p>
                  </div>
                ) : (
                  tablePermissions.map((table) => (
                    <div key={table.tablename} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-3">
                            <h3 className="font-medium text-lg">Users can access {table.tablename}</h3>
                            <Badge variant="outline" className="text-xs">
                              {table.policyCount} rules
                            </Badge>
                          </div>
                          
                          {/* CRUD Permissions */}
                          <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${table.permissions.create ? 'bg-green-500' : 'bg-muted'}`} />
                              <span className={`text-sm ${table.permissions.create ? 'text-foreground' : 'text-muted-foreground'}`}>
                                Create new records
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${table.permissions.read ? 'bg-green-500' : 'bg-muted'}`} />
                              <span className={`text-sm ${table.permissions.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                                View records
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${table.permissions.update ? 'bg-green-500' : 'bg-muted'}`} />
                              <span className={`text-sm ${table.permissions.update ? 'text-foreground' : 'text-muted-foreground'}`}>
                                Edit records
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${table.permissions.delete ? 'bg-green-500' : 'bg-muted'}`} />
                              <span className={`text-sm ${table.permissions.delete ? 'text-foreground' : 'text-muted-foreground'}`}>
                                Delete records
                              </span>
                            </div>
                          </div>

                          {/* Summary */}
                          <div className="flex gap-2 flex-wrap">
                            {table.permissions.create && (
                              <Badge variant="secondary" className="text-xs bg-success/10 text-green-800">
                                Create
                              </Badge>
                            )}
                            {table.permissions.read && (
                              <Badge variant="secondary" className="text-xs bg-primary/10 text-blue-800">
                                Read
                              </Badge>
                            )}
                            {table.permissions.update && (
                              <Badge variant="secondary" className="text-xs bg-warning/10 text-orange-800">
                                Update
                              </Badge>
                            )}
                            {table.permissions.delete && (
                              <Badge variant="secondary" className="text-xs bg-destructive/10 text-red-800">
                                Delete
                              </Badge>
                            )}
                            {!table.permissions.create && !table.permissions.read && !table.permissions.update && !table.permissions.delete && (
                              <Badge variant="outline" className="text-xs text-muted-foreground">
                                No permissions configured
                              </Badge>
                            )}
                          </div>
                        </div>
                        <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <p className="text-sm text-muted-foreground">
              Common security management tasks
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                variant="outline" 
                onClick={refreshAll}
                className="flex items-center gap-2"
              >
                <Shield className="h-4 w-4" />
                Refresh Security Status
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => {
                  const unprotectedTables = tableStatuses.filter(t => !t.rls_enabled);
                  if (unprotectedTables.length === 0) {
                    toast({
                      title: "All tables are already protected",
                      description: "No action needed",
                    });
                  } else {
                    toast({
                      title: "Protection Status",
                      description: `${unprotectedTables.length} tables need protection`,
                      variant: "destructive",
                    });
                  }
                }}
                className="flex items-center gap-2"
              >
                <AlertTriangle className="h-4 w-4" />
                Check Security Status
              </Button>

              <Button 
                variant="outline"
                onClick={() => {
                  toast({
                    title: "Security Report",
                    description: `${statistics?.rls_enabled_tables || 0} of ${statistics?.total_tables || 0} tables are protected`,
                  });
                }}
                className="flex items-center gap-2"
              >
                <Eye className="h-4 w-4" />
                Security Summary
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SimpleRLS;