import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSearchParams } from 'react-router-dom';
import { LayoutDashboard, Users, Building2, Sparkles } from 'lucide-react';
import { AdminDashboardStats } from '@/components/admin/AdminDashboardStats';
import { UserManagement } from '@/components/admin/UserManagement';
import { AdminCompanyTable } from '@/components/admin/AdminCompanyTable';
import { WowUsageGrowthChart } from '@/components/admin/WowUsageGrowthChart';
import { OnboardingFunnelChart } from '@/components/admin/OnboardingFunnelChart';
import { AgentUsage } from '@/components/admin/AgentUsage';

const VALID_TABS = ['dashboard', 'users', 'companies', 'agent'] as const;
type TabValue = (typeof VALID_TABS)[number];

export const AdminPanel: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  const activeTab: TabValue = VALID_TABS.includes(rawTab as TabValue)
    ? (rawTab as TabValue)
    : 'dashboard';

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Panel</h1>
        <p className="text-muted-foreground">
          Manage users, companies, and monitor system health.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Users</span>
          </TabsTrigger>
          <TabsTrigger value="companies" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Companies</span>
          </TabsTrigger>
          <TabsTrigger value="agent" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Agent</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <div className="space-y-6">
            <AdminDashboardStats />
            <WowUsageGrowthChart />
            <OnboardingFunnelChart />
          </div>
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <UserManagement />
        </TabsContent>

        <TabsContent value="companies" className="mt-6">
          <AdminCompanyTable />
        </TabsContent>

        <TabsContent value="agent" className="mt-6">
          <AgentUsage />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPanel;
