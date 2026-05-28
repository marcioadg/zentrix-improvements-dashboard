import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import type { CompanyUsageStats, PlatformOverviewStats, TimePeriod, SortOption } from '@/types/platformUsage';
import { logger } from '@/utils/logger';

export const usePlatformUsage = () => {
  const [companyStats, setCompanyStats] = useState<CompanyUsageStats[]>([]);
  const [filteredStats, setFilteredStats] = useState<CompanyUsageStats[]>([]);
  const [overviewStats, setOverviewStats] = useState<PlatformOverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('30d');
  const [sortOption, setSortOption] = useState<SortOption>('name_asc');
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const getDateRange = (period: TimePeriod) => {
    const endDate = new Date();
    let startDate = new Date();

    switch (period) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case 'all':
        startDate = new Date('2020-01-01'); // Beginning of time for the platform
        break;
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  };

  const sortCompanies = (companies: CompanyUsageStats[], option: SortOption) => {
    const sorted = [...companies];
    
    switch (option) {
      case 'name_asc':
        return sorted.sort((a, b) => a.company_name.localeCompare(b.company_name));
      case 'name_desc':
        return sorted.sort((a, b) => b.company_name.localeCompare(a.company_name));
      case 'created_newest':
        return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case 'created_oldest':
        return sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      case 'hours_desc':
        return sorted.sort((a, b) => b.total_hours - a.total_hours);
      case 'hours_asc':
        return sorted.sort((a, b) => a.total_hours - b.total_hours);
      case 'avg_session_desc':
        return sorted.sort((a, b) => b.average_session_minutes - a.average_session_minutes);
      case 'avg_session_asc':
        return sorted.sort((a, b) => a.average_session_minutes - b.average_session_minutes);
      case 'last_activity':
        return sorted.sort((a, b) => {
          if (!a.last_activity_date) return 1;
          if (!b.last_activity_date) return -1;
          return new Date(b.last_activity_date).getTime() - new Date(a.last_activity_date).getTime();
        });
      case 'active_users':
        return sorted.sort((a, b) => b.active_users_count - a.active_users_count);
      case 'sessions_desc':
        return sorted.sort((a, b) => b.total_sessions - a.total_sessions);
      default:
        return sorted;
    }
  };

  const loadPlatformUsage = async (period: TimePeriod) => {
    try {
      setLoading(true);
      const { startDate, endDate } = getDateRange(period);

      logger.debug('Loading platform usage:', { period, startDate, endDate });

      // Fetch company usage statistics
      const { data: usageData, error: usageError } = await supabase
        .from('company_usage_stats')
        .select(`
          company_id,
          user_id,
          total_minutes,
          session_count,
          average_session_minutes,
          stat_date,
          companies!inner(name, created_at)
        `)
        .gte('stat_date', startDate)
        .lte('stat_date', endDate);

      if (usageError) throw usageError;

      logger.debug('Raw usage data:', usageData);

      // Aggregate data by company
      const companyMap = new Map<string, {
        company_id: string;
        company_name: string;
        created_at: string;
        total_minutes: number;
        total_sessions: number;
        active_users: Set<string>;
        session_minutes_sum: number;
        session_count_for_avg: number;
        last_activity_date: string | null;
      }>();

      usageData?.forEach((row: any) => {
        const companyId = row.company_id;
        const existing = companyMap.get(companyId);

        if (existing) {
          existing.total_minutes += row.total_minutes || 0;
          existing.total_sessions += row.session_count || 0;
          existing.active_users.add(row.user_id);
          existing.session_minutes_sum += (row.average_session_minutes || 0) * (row.session_count || 0);
          existing.session_count_for_avg += row.session_count || 0;
          
          if (row.stat_date && (!existing.last_activity_date || row.stat_date > existing.last_activity_date)) {
            existing.last_activity_date = row.stat_date;
          }
        } else {
          companyMap.set(companyId, {
            company_id: companyId,
            company_name: row.companies?.name || 'Unknown Company',
            created_at: row.companies?.created_at || new Date().toISOString(),
            total_minutes: row.total_minutes || 0,
            total_sessions: row.session_count || 0,
            active_users: new Set([row.user_id]),
            session_minutes_sum: (row.average_session_minutes || 0) * (row.session_count || 0),
            session_count_for_avg: row.session_count || 0,
            last_activity_date: row.stat_date || null
          });
        }
      });

      // Convert map to array and calculate final stats
      const companies: CompanyUsageStats[] = Array.from(companyMap.values())
        .map(company => ({
          company_id: company.company_id,
          company_name: company.company_name,
          created_at: company.created_at,
          total_hours: Math.round((company.total_minutes / 60) * 100) / 100,
          total_minutes: company.total_minutes,
          total_sessions: company.total_sessions,
          active_users_count: company.active_users.size,
          average_session_minutes: company.session_count_for_avg > 0 
            ? Math.round((company.session_minutes_sum / company.session_count_for_avg) * 100) / 100 
            : 0,
          last_activity_date: company.last_activity_date
        }));

      const sortedCompanies = sortCompanies(companies, sortOption);
      setCompanyStats(sortedCompanies);
      setFilteredStats(sortedCompanies);

      // Calculate overview statistics
      const totalCompanies = companies.length;
      const totalMinutes = companies.reduce((sum, c) => sum + c.total_minutes, 0);
      const totalHours = Math.round((totalMinutes / 60) * 100) / 100;
      const avgHours = totalCompanies > 0 ? Math.round((totalHours / totalCompanies) * 100) / 100 : 0;

      const mostActive = companies.length > 0 
        ? companies.reduce((max, company) => 
            company.total_hours > max.hours 
              ? { name: company.company_name, hours: company.total_hours }
              : max
          , { name: companies[0].company_name, hours: companies[0].total_hours })
        : null;

      setOverviewStats({
        total_companies: totalCompanies,
        total_hours: totalHours,
        average_hours_per_company: avgHours,
        most_active_company: mostActive
      });

      logger.debug('Platform usage loaded:', { companies: companies.length, totalHours });

    } catch (error) {
      logger.error('Error loading platform usage:', error);
      toast({
        title: "Error",
        description: "Failed to load platform usage data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlatformUsage(timePeriod);
  }, [timePeriod]);

  useEffect(() => {
    if (companyStats.length > 0) {
      const sortedCompanies = sortCompanies(companyStats, sortOption);
      setCompanyStats(sortedCompanies);
      setFilteredStats(sortedCompanies);
    }
  }, [sortOption]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredStats(companyStats);
    } else {
      const filtered = companyStats.filter(company =>
        company.company_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredStats(filtered);
    }
  }, [searchTerm, companyStats]);

  return {
    companyStats: filteredStats,
    overviewStats,
    loading,
    timePeriod,
    setTimePeriod,
    sortOption,
    setSortOption,
    searchTerm,
    setSearchTerm,
    refetch: () => loadPlatformUsage(timePeriod)
  };
};
