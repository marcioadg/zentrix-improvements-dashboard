
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';

export const usePeopleDirectCompanies = () => {
  const { companies, currentCompany } = useMultiCompanyAccess();
  
  return {
    companies,
    currentCompany,
    setCurrentCompany: () => {
      // No-op since company switching is now handled by CompanySwitcher
    }
  };
};
