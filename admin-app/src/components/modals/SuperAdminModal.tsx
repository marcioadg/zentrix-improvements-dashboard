import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, TestTube2, Timer, Database, Building2, Activity, Megaphone, Rocket, Settings, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AnnouncementManagement } from '@/components/announcements/AnnouncementManagement';
import { FeatureLaunchManager } from '@/components/features/FeatureLaunchManager';

interface SuperAdminModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SuperAdminModal: React.FC<SuperAdminModalProps> = ({
  open,
  onOpenChange
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  const handleNavigateAndClose = (path: string) => {
    navigate(path);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden border-0 shadow-2xl">
        <DialogHeader className="border-b border-border/40 pb-4">
          <DialogTitle className="flex items-center gap-3 text-lg font-medium">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-destructive/5 border border-red-200">
              <Shield className="h-4 w-4 text-destructive" />
            </div>
            <span className="text-foreground">Admin Panel</span>
            <Badge variant="secondary" className="text-xs font-normal px-2 py-0.5 bg-muted/50">
              Super Admin
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-2">
          <TabsList className="grid w-full grid-cols-6 h-9 bg-muted/30 p-1">
            <TabsTrigger 
              value="overview" 
              className="text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="announcements"
              className="text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              Announcements
            </TabsTrigger>
            <TabsTrigger 
              value="features"
              className="text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              Features
            </TabsTrigger>
            <TabsTrigger 
              value="permissions"
              className="text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              Permissions
            </TabsTrigger>
            <TabsTrigger 
              value="security"
              className="text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              Security
            </TabsTrigger>
            <TabsTrigger 
              value="system"
              className="text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              System
            </TabsTrigger>
          </TabsList>

          <div className="mt-6 max-h-[55vh] overflow-y-auto">
            <TabsContent value="overview" className="space-y-6 mt-0">
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-medium text-foreground">System Status</h3>
                </div>
                
                <div className="rounded-lg border border-border/40 bg-muted/20 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Platform Status</span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-foreground">Operational</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    The admin panel provides centralized control over system announcements and feature releases. 
                    Use the tabs above to manage user communications and deploy new functionality.
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="announcements" className="space-y-6 mt-0">
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2">
                  <Megaphone className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-medium text-foreground">System Announcements</h3>
                </div>
                <p className="text-sm text-muted-foreground -mt-2">
                  Create and manage system-wide announcements that appear at the top of the app for all users.
                </p>
                
                <div className="rounded-lg border border-border/40 bg-background/50 p-1">
                  <AnnouncementManagement />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="features" className="space-y-6 mt-0">
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2">
                  <Rocket className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-medium text-foreground">Feature Launches</h3>
                </div>
                <p className="text-sm text-muted-foreground -mt-2">
                  Launch new features and updates with beautiful news cards that appear in user dashboards.
                </p>
                
                <div className="rounded-lg border border-border/40 bg-background/50 p-1">
                  <FeatureLaunchManager />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="permissions" className="space-y-6 mt-0">
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-medium text-foreground">User Permissions</h3>
                </div>
                <p className="text-sm text-muted-foreground -mt-2">
                  Manage user roles, permissions, and access levels across the system.
                </p>
                
                <div className="rounded-lg border border-border/40 bg-muted/20 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-foreground">Role Management</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Configure user roles and their associated permissions.
                      </p>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => handleNavigateAndClose('/permissions')}
                      className="h-8 text-xs"
                    >
                      Open Permissions
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="security" className="space-y-6 mt-0">
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-medium text-foreground">Security & Database</h3>
                </div>
                <p className="text-sm text-muted-foreground -mt-2">
                  Configure database security policies and row-level security settings.
                </p>
                
                <div className="space-y-3">
                  <div className="rounded-lg border border-border/40 bg-muted/20 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-foreground">RLS Policies</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          Review and configure database security policies.
                        </p>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => handleNavigateAndClose('/rls')}
                        className="h-8 text-xs"
                      >
                        Manage RLS
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="system" className="space-y-6 mt-0">
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-medium text-foreground">System Management</h3>
                </div>
                <p className="text-sm text-muted-foreground -mt-2">
                  System testing, performance monitoring, and administrative tools.
                </p>
                
                <div className="space-y-3">
                  <div className="rounded-lg border border-border/40 bg-muted/20 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-foreground">System Testing</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          Run automated tests and diagnostics.
                        </p>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => handleNavigateAndClose('/testing')}
                        className="h-8 text-xs"
                      >
                        Run Tests
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border/40 bg-muted/20 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-foreground">Performance Monitor</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          Analyze system performance and speed tests.
                        </p>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => handleNavigateAndClose('/speed')}
                        className="h-8 text-xs"
                      >
                        Speed Test
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border/40 bg-muted/20 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-foreground">Company Management</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          Manage companies, users, and system data.
                        </p>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => handleNavigateAndClose('/company-management')}
                        className="h-8 text-xs"
                      >
                        Manage
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border/40 bg-muted/20 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-foreground">Platform Usage</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          Track platform usage hours by company.
                        </p>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => handleNavigateAndClose('/platform-usage')}
                        className="h-8 text-xs"
                      >
                        View Usage
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};