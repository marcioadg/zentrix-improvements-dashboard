
import React from 'react';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { Button } from '@/components/ui/button';
import { Building2, RefreshCw, AlertTriangle } from 'lucide-react';
import { CompanySwitcher } from '@/components/shared/CompanySwitcher';

export const CompanyHeader: React.FC = () => {
  const { currentCompany, loading, error, refreshCompanies } = useMultiCompanyAccess();

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-1">
        <div className="p-1.5 rounded-md bg-muted">
          <Building2 className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1">
          <div className="animate-pulse bg-muted h-3.5 w-28 rounded mb-1"></div>
          <div className="animate-pulse bg-muted h-2.5 w-16 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-1">
        <div className="p-1.5 rounded-md bg-destructive/10">
          <AlertTriangle className="h-4 w-4 text-destructive" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-destructive">Company Error</div>
          <div className="text-xs text-destructive/80 truncate">{error}</div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={refreshCompanies}
          className="text-destructive hover:text-destructive/80 h-7 w-7 p-0"
          title="Retry loading company"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  // Sempre mostrar o CompanySwitcher para manter a seta e o acesso a convites/"new company"
  // - Sem empresa atual: mostra switcher (permite criar/aceitar convites)
  // - Com 1+ empresas: também mostra switcher (seta sempre visível)
  if (!currentCompany) {
    return <CompanySwitcher variant="sidebar" className="w-full" />;
  }

  return <CompanySwitcher variant="sidebar" className="w-full" />;
};
