
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { useEffect } from 'react';
import { logger } from '@/utils/logger';

export const useMultiCompanyAccess = () => {
  const { companies, currentCompany, switchCompany, loading, error, refreshCompanies } = useMultiCompany();

  // If multi-company is loaded, but there is one company and currentCompany is null
  useEffect(() => {
    if (!loading && companies.length === 1 && !currentCompany) {
      logger.warn(
        "[MultiCompanyAccess] Only one company available but none selected. Auto-selecting:", 
        companies[0]?.name
      );
      switchCompany(companies[0].id); // Fire and forget (does nothing if currentCompany is already set)
    }
    if (!loading && companies.length === 0) {
      logger.warn("[MultiCompanyAccess] No companies available for user.");
    }
  }, [companies, currentCompany, loading, switchCompany]);

  const hasMultipleCompanies = companies.length > 1;

  return {
    companies,
    currentCompany,
    switchCompany,
    hasMultipleCompanies,
    loading,
    error,
    refreshCompanies,
  };
};
