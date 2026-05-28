import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { useOptimizedUserTeams } from '@/hooks/useOptimizedUserTeams';
import { useProfile } from '@/hooks/useProfile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { logger } from '@/lib/logger';
export const DataLoadingDebugger: React.FC = () => {
  const {
    user,
    session,
    loading: authLoading
  } = useAuth();
  const {
    profile,
    loading: profileLoading,
    error: profileError
  } = useProfile();
  const {
    companies,
    currentCompany,
    loading: companyLoading,
    error: companyError
  } = useMultiCompany();
  const {
    teams,
    loading: teamsLoading
  } = useOptimizedUserTeams();
  useEffect(() => {
    logger.debug('Authentication State Debug', {
      userExists: !!user,
      sessionExists: !!session,
      authLoading
    });
  }, [user, session, authLoading]);
  useEffect(() => {
    logger.debug('Profile State Debug', {
      profileExists: !!profile,
      profileLoading,
      hasError: !!profileError
    });
  }, [profile, profileLoading, profileError]);
  useEffect(() => {
    logger.debug('Company State Debug', {
      companiesCount: companies.length,
      hasCurrentCompany: !!currentCompany,
      companyLoading,
      hasError: !!companyError
    });
  }, [companies, currentCompany, companyLoading, companyError]);
  useEffect(() => {
    logger.debug('Teams State Debug', {
      teamsCount: teams.length,
      teamsLoading
    });
  }, [teams, teamsLoading]);
  const getStatusIcon = (condition: boolean, loading: boolean) => {
    if (loading) return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />;
    return condition ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-destructive" />;
  };
  const getStatusColor = (condition: boolean, loading: boolean) => {
    if (loading) return "bg-primary/5 text-primary";
    return condition ? "bg-success/5 text-success" : "bg-destructive/5 text-red-700";
  };
  return <Card className="border-yellow-200 bg-warning/5 mb-4">
      
      
    </Card>;
};