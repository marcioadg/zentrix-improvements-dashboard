import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserOverviewModule } from './analytics2/UserOverviewModule';
import { UsageAnalyticsModule } from './analytics2/UsageAnalyticsModule';
import { CustomerHealthModule } from './analytics2/CustomerHealthModule';
import { SessionDetailModule } from './analytics2/SessionDetailModule';
import { TeamProductivityModule } from './analytics2/TeamProductivityModule';
import { AdminToolsModule } from './analytics2/AdminToolsModule';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const Analytics2Content = () => {
  const [activeTab, setActiveTab] = useState('user-overview');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Analytics 2</h2>
        <p className="text-muted-foreground">
          Internal super admin analytics for complete visibility into SaaS usage and customer health
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-4xl grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          <TabsTrigger value="user-overview" className="text-xs md:text-sm">
            User Overview
          </TabsTrigger>
          <TabsTrigger value="usage-analytics" className="text-xs md:text-sm">
            Usage Analytics
          </TabsTrigger>
          <TabsTrigger value="customer-health" className="text-xs md:text-sm">
            Customer Health
          </TabsTrigger>
          <TabsTrigger value="sessions" className="text-xs md:text-sm">
            Session Details
          </TabsTrigger>
        <TabsTrigger value="team-productivity" className="text-xs md:text-sm">
          Team Productivity
        </TabsTrigger>
          <TabsTrigger value="admin-tools" className="text-xs md:text-sm">
            Admin Tools
          </TabsTrigger>
        </TabsList>

        <TabsContent value="user-overview">
          <UserOverviewModule />
        </TabsContent>

        <TabsContent value="usage-analytics">
          <UsageAnalyticsModule />
        </TabsContent>

        <TabsContent value="customer-health">
          <CustomerHealthModule />
        </TabsContent>

        <TabsContent value="sessions">
          <SessionDetailModule />
        </TabsContent>

        <TabsContent value="team-productivity">
          <TeamProductivityModule />
        </TabsContent>

        <TabsContent value="admin-tools">
          <AdminToolsModule />
        </TabsContent>
      </Tabs>
    </div>
  );
};
