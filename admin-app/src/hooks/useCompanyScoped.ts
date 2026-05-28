
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { useAuth } from '@/contexts/AuthContext';
import { getUserRoleInCompany, getAccessibleTeamsForUser, UserRole } from '@/services/companyRoleService';
import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/utils/logger';

export const useCompanyScoped = () => {
  const { user } = useAuth();
  const { currentCompany } = useMultiCompanyAccess();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [accessibleTeams, setAccessibleTeams] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshUserRole = useCallback(async () => {
    if (!user || !currentCompany) {
      setUserRole(null);
      setAccessibleTeams([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const role = await getUserRoleInCompany(user.id, currentCompany?.id);
      const teams = await getAccessibleTeamsForUser(user.id, currentCompany?.id, role);
      
      setUserRole(role);
      setAccessibleTeams(teams);
    } catch (error) {
      logger.error('Error refreshing user role:', error);
      setUserRole(null);
      setAccessibleTeams([]);
    } finally {
      setLoading(false);
    }
  }, [user, currentCompany]);

  useEffect(() => {
    refreshUserRole();
  }, [refreshUserRole]);

  return {
    currentCompany,
    userRole,
    accessibleTeams,
    loading,
    refreshUserRole
  };
};
