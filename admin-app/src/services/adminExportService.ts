import { supabase } from '@/integrations/supabase/client';
import type { AdminAction } from '@/types/superAdmin';

// Helper to download file
const downloadFile = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Helper to escape CSV values
const escapeCSV = (value: any): string => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export const exportUsersCSV = async () => {
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      email,
      role,
      created_at,
      last_login_at
    `)
    .order('created_at', { ascending: false });

  if (profilesError) throw profilesError;

  const { data: memberships } = await supabase
    .from('company_members')
    .select(`
      user_id,
      company_id,
      status,
      permission_level,
      companies (name)
    `);

  const membershipMap = new Map<string, any[]>();
  memberships?.forEach(m => {
    if (!membershipMap.has(m.user_id!)) {
      membershipMap.set(m.user_id!, []);
    }
    membershipMap.get(m.user_id!)!.push(m);
  });

  const headers = ['User ID', 'Name', 'Email', 'Role', 'Companies', 'Status', 'Created At', 'Last Login'];
  const rows = profiles?.map(user => {
    const userMemberships = membershipMap.get(user.id) || [];
    const companies = userMemberships.map(m => m.companies?.name).filter(Boolean).join('; ');
    const statuses = userMemberships.map(m => m.status).join('; ');

    return [
      escapeCSV(user.id),
      escapeCSV(user.full_name),
      escapeCSV(user.email),
      escapeCSV(user.role),
      escapeCSV(companies),
      escapeCSV(statuses),
      escapeCSV(user.created_at),
      escapeCSV(user.last_login_at || 'Never')
    ].join(',');
  }) || [];

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const timestamp = new Date().toISOString().split('T')[0];
  downloadFile(blob, `users-export-${timestamp}.csv`);
};

export const exportCompaniesCSV = async () => {
  const { data: companies, error } = await supabase
    .from('companies')
    .select(`
      id,
      name,
      slug,
      created_at,
      status
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const { data: memberships } = await supabase
    .from('company_members')
    .select('company_id, status');

  const { data: teams } = await supabase
    .from('teams')
    .select('company_id, id');

  const memberCountMap = new Map<string, number>();
  memberships?.forEach(m => {
    memberCountMap.set(m.company_id, (memberCountMap.get(m.company_id) || 0) + (m.status === 'active' ? 1 : 0));
  });

  const teamCountMap = new Map<string, number>();
  teams?.forEach(t => {
    teamCountMap.set(t.company_id, (teamCountMap.get(t.company_id) || 0) + 1);
  });

  const headers = ['Company ID', 'Name', 'Slug', 'Status', 'Members', 'Teams', 'Created At'];
  const rows = companies?.map(company => [
    escapeCSV(company.id),
    escapeCSV(company.name),
    escapeCSV(company.slug),
    escapeCSV(company.status),
    escapeCSV(memberCountMap.get(company.id) || 0),
    escapeCSV(teamCountMap.get(company.id) || 0),
    escapeCSV(company.created_at)
  ].join(',')) || [];

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const timestamp = new Date().toISOString().split('T')[0];
  downloadFile(blob, `companies-export-${timestamp}.csv`);
};

export const exportAnalyticsJSON = async () => {
  // Fetch all relevant analytics data
  const [usersRes, companiesRes, usageRes, subscriptionsRes] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at', { ascending: false }),
    supabase.from('companies').select('*').order('created_at', { ascending: false }),
    supabase.from('company_usage_stats').select('*'),
    supabase.from('company_subscriptions').select('*')
  ]);

  const exportData = {
    exportDate: new Date().toISOString(),
    dataType: 'Full Analytics Snapshot',
    users: usersRes.data || [],
    companies: companiesRes.data || [],
    usageStats: usageRes.data || [],
    subscriptions: subscriptionsRes.data || [],
    summary: {
      totalUsers: usersRes.data?.length || 0,
      totalCompanies: companiesRes.data?.length || 0,
      totalUsageRecords: usageRes.data?.length || 0,
      totalSubscriptions: subscriptionsRes.data?.length || 0
    }
  };

  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const timestamp = new Date().toISOString().split('T')[0];
  downloadFile(blob, `analytics-snapshot-${timestamp}.json`);
};

export const exportHealthDataCSV = async () => {
  const { data: healthData, error } = await supabase
    .from('customer_success_tracking')
    .select(`
      *,
      companies (name)
    `)
    .order('updated_at', { ascending: false });

  if (error) throw error;

  const headers = [
    'Company Name',
    'Account Stage',
    'Customer Health',
    'Migration Status',
    'WhatsApp Group',
    'Onboarding Video',
    'Subscription Status',
    'Status Notes',
    'Updated At'
  ];

  const rows = healthData?.map(item => [
    escapeCSV(item.companies?.name),
    escapeCSV(item.account_stage),
    escapeCSV(item.customer_health),
    escapeCSV(item.customer_migration),
    escapeCSV(item.whatsapp_group),
    escapeCSV(item.onboarding_video),
    escapeCSV(item.subs_status),
    escapeCSV(item.customer_status_notes),
    escapeCSV(item.updated_at)
  ].join(',')) || [];

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const timestamp = new Date().toISOString().split('T')[0];
  downloadFile(blob, `customer-health-export-${timestamp}.csv`);
};

export const exportSessionsCSV = async () => {
  const { data: sessions, error } = await supabase
    .from('company_usage_stats')
    .select(`
      *,
      profiles (full_name, email),
      companies (name)
    `)
    .order('stat_date', { ascending: false })
    .limit(5000);

  if (error) throw error;

  const headers = [
    'Date',
    'User Name',
    'User Email',
    'Company',
    'Session Count',
    'Total Minutes',
    'Avg Session Minutes'
  ];

  const rows = sessions?.map(session => [
    escapeCSV(session.stat_date),
    escapeCSV(session.profiles?.full_name),
    escapeCSV(session.profiles?.email),
    escapeCSV(session.companies?.name),
    escapeCSV(session.session_count),
    escapeCSV(session.total_minutes),
    escapeCSV(session.average_session_minutes)
  ].join(',')) || [];

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const timestamp = new Date().toISOString().split('T')[0];
  downloadFile(blob, `sessions-export-${timestamp}.csv`);
};

export const exportAdminActionsCSV = async (actions: AdminAction[]) => {
  const headers = [
    'Timestamp',
    'Action Type',
    'Admin User',
    'Company',
    'Target Type',
    'Target ID',
    'Description',
    'Success',
    'Affected User',
    'IP Address'
  ];

  const rows = actions.map(action => [
    escapeCSV(action.created_at),
    escapeCSV(action.action_type),
    escapeCSV(action.admin_user_name),
    escapeCSV(action.company_name),
    escapeCSV(action.target_type),
    escapeCSV(action.target_id),
    escapeCSV(action.description),
    escapeCSV(action.success !== false ? 'Yes' : 'No'),
    escapeCSV(action.affected_user_name),
    escapeCSV(action.user_ip_address)
  ].join(','));

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const timestamp = new Date().toISOString().split('T')[0];
  downloadFile(blob, `admin-actions-export-${timestamp}.csv`);
};
