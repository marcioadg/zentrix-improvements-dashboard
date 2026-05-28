
import { useState, useEffect } from 'react';
import { CompanyUser } from '@/types/companyUser';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { logger } from '@/utils/logger';

interface UseUserProfileModalStateProps {
  user: CompanyUser | null;
  open: boolean;
}

export const useUserProfileModalState = ({ user, open }: UseUserProfileModalStateProps) => {
  const [selectedRole, setSelectedRole] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { currentCompany } = useMultiCompanyAccess();

  useEffect(() => {
    if (user && open) {
      logger.log('useUserProfileModalState: Opening for user:', user.full_name, 'in company:', currentCompany?.name);
      setSelectedRole(user.role);
    }
  }, [user, open, currentCompany]);

  const handleCancel = (resetTeamSelections: () => void) => {
    if (user) {
      setSelectedRole(user.role);
      resetTeamSelections();
    }
  };

  return {
    selectedRole,
    setSelectedRole,
    loading,
    setLoading,
    currentCompany,
    handleCancel
  };
};
