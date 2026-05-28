
import React from 'react';
import { ZentrixAIChatInterface } from '@/components/ai-thought-partner/ZentrixAIChatInterface';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { CompanyStateReport } from '@/components/dashboard/CompanyStateReport';

export const AIThoughtPartner = () => {
  const { currentCompany } = useMultiCompanyAccess();

  return (
    <div className="h-[calc(100svh-3rem)] w-full flex flex-col bg-background overflow-hidden">
      <ZentrixAIChatInterface
        key={currentCompany?.id || 'no-company'}
        viewContext="company"
      />
      <CompanyStateReport companyId={currentCompany?.id || ""} />
    </div>
  );
};

export default AIThoughtPartner;
