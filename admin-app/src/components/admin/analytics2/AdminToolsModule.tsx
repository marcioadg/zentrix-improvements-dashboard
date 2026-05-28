import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Activity, Building2, FileSpreadsheet, Database, Download } from 'lucide-react';
import { ExportActionCard } from './components/ExportActionCard';
import { AdminActionsLog } from '../AdminActionsLog';
import { useAdminActions } from '@/hooks/useAdminActions';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  exportUsersCSV,
  exportCompaniesCSV,
  exportAnalyticsJSON,
  exportHealthDataCSV,
  exportSessionsCSV,
  exportAdminActionsCSV
} from '@/services/adminExportService';

export const AdminToolsModule: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<{ start?: Date; end?: Date }>({});

  const { data: adminActions = [], isLoading: actionsLoading } = useAdminActions({
    startDate: dateFilter.start,
    endDate: dateFilter.end,
    limit: 200
  });

  const { data: systemStatus } = useQuery({
    queryKey: ['systemStatus'],
    queryFn: async () => {
      const [usersRes, companiesRes, sessionsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('companies').select('id', { count: 'exact', head: true }),
        supabase.from('company_usage_stats')
          .select('user_id')
          .gte('stat_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      ]);

      const activeUsers = new Set(sessionsRes.data?.map(s => s.user_id)).size;

      return {
        totalUsers: usersRes.count || 0,
        activeUsers,
        totalCompanies: companiesRes.count || 0
      };
    },
    staleTime: 60000
  });

  const filteredActions = adminActions.filter(action => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      action.description?.toLowerCase().includes(search) ||
      action.action_type?.toLowerCase().includes(search) ||
      action.admin_user_name?.toLowerCase().includes(search) ||
      action.company_name?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="space-y-6">
      {/* System Status KPIs */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStatus?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">All registered users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users (7d)</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStatus?.activeUsers || 0}</div>
            <p className="text-xs text-muted-foreground">Users with sessions this week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStatus?.totalCompanies || 0}</div>
            <p className="text-xs text-muted-foreground">All registered organizations</p>
          </CardContent>
        </Card>
      </div>

      {/* Export Actions Grid */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Data Export Tools</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <ExportActionCard
            title="Export Users"
            description="All users with roles and companies"
            icon={<Users className="h-5 w-5 text-primary" />}
            onExport={exportUsersCSV}
          />

          <ExportActionCard
            title="Export Companies"
            description="All companies with member counts"
            icon={<Building2 className="h-5 w-5 text-primary" />}
            onExport={exportCompaniesCSV}
          />

          <ExportActionCard
            title="Export Analytics"
            description="Complete analytics snapshot (JSON)"
            icon={<Database className="h-5 w-5 text-primary" />}
            onExport={exportAnalyticsJSON}
          />

          <ExportActionCard
            title="Export Health Data"
            description="Customer success tracking data"
            icon={<FileSpreadsheet className="h-5 w-5 text-primary" />}
            onExport={exportHealthDataCSV}
          />

          <ExportActionCard
            title="Export Sessions"
            description="User session and usage data"
            icon={<Activity className="h-5 w-5 text-primary" />}
            onExport={exportSessionsCSV}
          />

          <ExportActionCard
            title="Export Admin Actions"
            description="Admin actions log (filtered)"
            icon={<Download className="h-5 w-5 text-primary" />}
            onExport={() => exportAdminActionsCSV(filteredActions)}
          />
        </div>
      </div>

      {/* Admin Actions Log */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Admin Actions Log</h2>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search actions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportAdminActionsCSV(filteredActions)}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Log
            </Button>
          </div>
        </div>

        <AdminActionsLog
          adminActions={filteredActions}
          loading={actionsLoading}
        />
      </div>
    </div>
  );
};
