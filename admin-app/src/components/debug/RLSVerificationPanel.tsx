import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { logger } from '@/utils/logger';
interface RLSTestResult {
  test: string;
  status: 'pass' | 'fail' | 'pending';
  message: string;
  data?: any;
}
export const RLSVerificationPanel: React.FC<{
  visible?: boolean;
}> = ({
  visible = false
}) => {
  const {
    user
  } = useAuth();
  const [results, setResults] = useState<RLSTestResult[]>([]);
  const [loading, setLoading] = useState(false);
  const runRLSTests = async () => {
    if (!user) return;
    setLoading(true);
    const testResults: RLSTestResult[] = [];
    try {
      // Test 1: Can access own profile
      logger.log('🔍 RLS Test 1: Self profile access');
      const {
        data: selfProfile,
        error: selfError
      } = await supabase.from('profiles').select('id, full_name, email').eq('id', user.id).single();
      testResults.push({
        test: 'Self Profile Access',
        status: selfError ? 'fail' : 'pass',
        message: selfError ? selfError.message : `✓ Can access own profile: ${selfProfile?.full_name}`,
        data: selfProfile
      });

      // Test 2: Can access company member profiles
      logger.log('🔍 RLS Test 2: Company member profiles access');
      const {
        data: companyProfiles,
        error: companyError
      } = await supabase.from('profiles').select('id, full_name, email').limit(5);
      testResults.push({
        test: 'Company Profiles Access',
        status: companyError ? 'fail' : 'pass',
        message: companyError ? companyError.message : `✓ Can access ${companyProfiles?.length || 0} company profiles`,
        data: companyProfiles
      });

      // Test 3: Can access teams
      logger.log('🔍 RLS Test 3: Teams access');
      const {
        data: teams,
        error: teamsError
      } = await supabase.from('teams').select('id, name, company_id').limit(5);
      testResults.push({
        test: 'Teams Access',
        status: teamsError ? 'fail' : 'pass',
        message: teamsError ? teamsError.message : `✓ Can access ${teams?.length || 0} teams`,
        data: teams
      });

      // Test 4: Can access team members with profiles and permission levels
      logger.log('🔍 RLS Test 4: Team members with profiles and permission levels');
      const {
        data: teamMembers,
        error: teamMembersError
      } = await supabase.from('team_members').select(`
          user_id,
          teams!inner(company_id),
          profiles:user_id (
            id,
            full_name,
            email
          ),
          company_members!inner(permission_level)
        `).limit(5);
      testResults.push({
        test: 'Team Members with Profiles and Permissions',
        status: teamMembersError ? 'fail' : 'pass',
        message: teamMembersError ? teamMembersError.message : `✓ Can access ${teamMembers?.length || 0} team members with profile and permission data`,
        data: teamMembers
      });

      // Test 5: Check for recursion issues
      logger.log('🔍 RLS Test 5: Recursion check');
      const startTime = Date.now();
      const {
        data: recursionTest,
        error: recursionError
      } = await supabase.from('profiles').select('id, full_name').limit(1);
      const endTime = Date.now();
      testResults.push({
        test: 'Recursion Check',
        status: recursionError || endTime - startTime > 5000 ? 'fail' : 'pass',
        message: recursionError ? 'Recursion error detected' : `✓ Query completed in ${endTime - startTime}ms (no recursion)`,
        data: {
          queryTime: endTime - startTime
        }
      });
    } catch (error) {
      logger.error('🚨 RLS Test Error:', error);
      testResults.push({
        test: 'General Error',
        status: 'fail',
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: error
      });
    }
    setResults(testResults);
    setLoading(false);
  };
  useEffect(() => {
    if (visible && user) {
      runRLSTests();
    }
  }, [visible, user]);
  if (!visible) return null;
  const getStatusIcon = (status: RLSTestResult['status']) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'fail':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <AlertCircle className="h-4 w-4 text-warning" />;
    }
  };
  const getStatusColor = (status: RLSTestResult['status']) => {
    switch (status) {
      case 'pass':
        return 'bg-success/10 text-green-800';
      case 'fail':
        return 'bg-destructive/10 text-red-800';
      default:
        return 'bg-warning/10 text-yellow-800';
    }
  };
  const passCount = results.filter(r => r.status === 'pass').length;
  const failCount = results.filter(r => r.status === 'fail').length;
  return;
};