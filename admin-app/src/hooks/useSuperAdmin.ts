import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { CompanyStats, SystemTest, AdminAction } from '@/types/superAdmin';
import { loadCompanies, getRecentCompanies, getRecentlyActiveCompanies } from '@/services/companyStatsService';
import { loadSystemTests, runSystemTest } from '@/services/systemTestService';
import { loadAdminActions, logAdminAction } from '@/services/adminActionService';
import { logger } from '@/utils/logger';

export const useSuperAdmin = () => {
  const [companies, setCompanies] = useState<CompanyStats[]>([]);
  const [recentCompanies, setRecentCompanies] = useState<CompanyStats[]>([]);
  const [recentlyActiveCompanies, setRecentlyActiveCompanies] = useState<CompanyStats[]>([]);
  const [systemTests, setSystemTests] = useState<SystemTest[]>([]);
  const [adminActions, setAdminActions] = useState<AdminAction[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadCompaniesData = async (forceRefresh = false) => {
    try {
      logger.log(`🔄 Loading companies data${forceRefresh ? ' (FORCED REFRESH)' : ''}...`);
      
      // Load companies once, then derive other lists from the cached result
      const companiesData = await loadCompanies();
      
      logger.log(`✅ Loaded ${companiesData.length} companies`);
      
      // Derive recent and active companies client-side to avoid redundant queries
      const recentCompaniesData = [...companiesData]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 1000);
      
      const recentActiveData = [...companiesData]
        .sort((a, b) => {
          if (a.last_login_at && b.last_login_at) {
            return new Date(b.last_login_at).getTime() - new Date(a.last_login_at).getTime();
          }
          if (a.last_login_at) return -1;
          if (b.last_login_at) return 1;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        })
        .slice(0, 1000);
      
      setCompanies(companiesData);
      setRecentCompanies(recentCompaniesData);
      setRecentlyActiveCompanies(recentActiveData);
    } catch (error) {
      logger.error('Error loading companies:', error);
      toast({
        title: "Error",
        description: "Failed to load companies",
        variant: "destructive",
      });
    }
  };

  const loadSystemTestsData = async () => {
    const testsData = await loadSystemTests();
    setSystemTests(testsData);
  };

  const loadAdminActionsData = async () => {
    const actionsData = await loadAdminActions();
    setAdminActions(actionsData);
  };

  const runAutomatedTest = async (testName: string, testCategory: string) => {
    try {
      const { status, duration } = await runSystemTest(testName, testCategory);

      // Log admin action
      await logAdminAction(
        'test_execution',
        `Executed automated test: ${testName}`,
        { test_name: testName, status, duration },
        'system'
      );

      await loadSystemTestsData();
      await loadAdminActionsData();
      
      toast({
        title: status === 'passed' ? "Test Passed" : "Test Failed",
        description: `${testName} completed in ${duration}ms`,
        variant: status === 'passed' ? "default" : "destructive",
      });
    } catch (error) {
      logger.error('Error running test:', error);
      toast({
        title: "Test Error",
        description: "Failed to execute test",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        loadCompaniesData(false),
        loadSystemTestsData(),
        loadAdminActionsData()
      ]);
      setLoading(false);
    };

    loadData();
  }, []);

  return {
    companies,
    recentCompanies,
    recentlyActiveCompanies,
    systemTests,
    adminActions,
    loading,
    runAutomatedTest,
    refetch: () => {
      logger.log('🔄 Force refetch triggered from useSuperAdmin');
      return Promise.all([
        loadCompaniesData(true), 
        loadSystemTestsData(), 
        loadAdminActionsData()
      ]);
    }
  };
};
