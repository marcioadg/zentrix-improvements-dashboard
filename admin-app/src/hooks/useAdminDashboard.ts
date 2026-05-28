import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface AdminDashboardStats {
  totalUsers: number;
  totalCompanies: number;
  activeSessions: number;
  recentSignups: number;
  activeUsers7d: number;
  totalTeams: number;
}

export interface RecentSignup {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  avatar_url: string | null;
}

export const useAdminDashboard = () => {
  const [stats, setStats] = useState<AdminDashboardStats>({
    totalUsers: 0,
    totalCompanies: 0,
    activeSessions: 0,
    recentSignups: 0,
    activeUsers7d: 0,
    totalTeams: 0,
  });
  const [recentSignups, setRecentSignups] = useState<RecentSignup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysAgoISO = sevenDaysAgo.toISOString();

        const [
          usersResult,
          companiesResult,
          recentSignupsResult,
          teamsResult,
          recentSignupListResult,
        ] = await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          supabase.from('companies').select('id', { count: 'exact', head: true }),
          supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgoISO),
          supabase.from('teams').select('id', { count: 'exact', head: true }),
          supabase.from('profiles').select('id, email, full_name, created_at, avatar_url').gte('created_at', sevenDaysAgoISO).order('created_at', { ascending: false }).limit(10),
        ]);

        // Estimate active sessions from recent logins
        const { count: activeSessionsCount } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .gte('last_login_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

        // Active users in last 7 days
        const { count: activeUsers7dCount } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .gte('last_login_at', sevenDaysAgoISO);

        setStats({
          totalUsers: usersResult.count ?? 0,
          totalCompanies: companiesResult.count ?? 0,
          activeSessions: activeSessionsCount ?? 0,
          recentSignups: recentSignupsResult.count ?? 0,
          activeUsers7d: activeUsers7dCount ?? 0,
          totalTeams: teamsResult.count ?? 0,
        });

        setRecentSignups(recentSignupListResult.data ?? []);
      } catch (error) {
        logger.error('Error fetching admin dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return { stats, recentSignups, loading };
};
