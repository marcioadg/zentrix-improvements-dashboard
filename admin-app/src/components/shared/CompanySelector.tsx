
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';

interface CompanySelectorProps {
  selectedCompanyId?: string;
  onCompanyChange: (companyId: string) => void;
  disabled?: boolean;
  className?: string;
}

export const CompanySelector: React.FC<CompanySelectorProps> = ({
  selectedCompanyId,
  onCompanyChange,
  disabled = false,
  className = ""
}) => {
  const { currentCompany, companies } = useMultiCompanyAccess();

  // For single company users, only show their company
  if (!currentCompany) {
    return (
      <Select disabled={true}>
        <SelectTrigger className={className}>
          <SelectValue placeholder="No company available" />
        </SelectTrigger>
      </Select>
    );
  }

  return (
    <Select
      value={selectedCompanyId || currentCompany?.id}
      onValueChange={onCompanyChange}
      disabled={disabled}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder="Select company">
          {companies.find(c => c.id === (selectedCompanyId || currentCompany?.id))?.name || currentCompany?.name}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {companies.map((company) => (
          <SelectItem key={company.id} value={company.id}>
            <div className="flex items-center gap-2">
              <span>{company.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
