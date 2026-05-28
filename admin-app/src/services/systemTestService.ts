

import { supabase } from '@/integrations/supabase/client';
import type { SystemTest } from '@/types/superAdmin';
import { logger } from '@/utils/logger';

export const loadSystemTests = async (): Promise<SystemTest[]> => {
  try {
    const { data, error } = await supabase
      .from('system_tests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      logger.warn('Error loading system tests:', error);
      return [];
    }
    
    // Type cast the data to ensure test_type matches our interface
    return (data || []).map(test => ({
      ...test,
      test_type: test.test_type as 'automated' | 'manual',
      status: test.status as 'pending' | 'running' | 'passed' | 'failed'
    }));
  } catch (error) {
    logger.warn('Error loading system tests:', error);
    return [];
  }
};

const testDatabaseConnection = async () => {
  const { error } = await supabase.from('companies').select('count').limit(1);
  if (error) throw new Error('Database connection failed');
};

const testAuthentication = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Authentication test failed - no session');
};

const testCoreFeatures = async () => {
  // Test basic table access - using specific table calls instead of dynamic strings
  const { error: profilesError } = await supabase.from('profiles').select('count').limit(1);
  if (profilesError) throw new Error(`Core feature test failed for profiles: ${profilesError.message}`);
  
  const { error: teamsError } = await supabase.from('teams').select('count').limit(1);
  if (teamsError) throw new Error(`Core feature test failed for teams: ${teamsError.message}`);
  
  const { error: metricsError } = await supabase.from('weekly_metrics').select('count').limit(1);
  if (metricsError) throw new Error(`Core feature test failed for weekly_metrics: ${metricsError.message}`);
  
  const { error: issuesError } = await supabase.from('issues').select('count').limit(1);
  if (issuesError) throw new Error(`Core feature test failed for issues: ${issuesError.message}`);
};

export const runSystemTest = async (testName: string, testCategory: string) => {
  const startTime = Date.now();
  
  let status: 'passed' | 'failed' = 'passed';
  let errorMessage: string | null = null;

  try {
    // Run the actual test based on category
    switch (testCategory) {
      case 'database':
        await testDatabaseConnection();
        break;
      case 'authentication':
        await testAuthentication();
        break;
      case 'core_features':
        await testCoreFeatures();
        break;
      default:
        throw new Error('Unknown test category');
    }
  } catch (testError) {
    status = 'failed';
    errorMessage = testError instanceof Error ? testError.message : 'Test failed';
  }

  const duration = Date.now() - startTime;

  // Insert test result
  await supabase
    .from('system_tests')
    .insert({
      test_name: testName,
      test_type: 'automated',
      test_category: testCategory,
      status,
      executed_at: new Date().toISOString(),
      duration_ms: duration,
      error_message: errorMessage
    });

  return { status, duration };
};

