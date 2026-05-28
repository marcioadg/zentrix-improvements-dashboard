
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePeopleDirectCompanies } from '@/hooks/usePeopleDirectCompanies';

interface DirectCompanySelectorProps {
  selectedCompanyId?: string;
  onCompanyChange: (companyId: string) => void;
  disabled?: boolean;
  className?: string;
}

export const DirectCompanySelector: React.FC<DirectCompanySelectorProps> = ({
  selectedCompanyId,
  onCompanyChange,
  disabled = false,
  className = ""
}) => {
  const { companies } = usePeopleDirectCompanies();

  const selectedCompany = companies.find(c => c.id === selectedCompanyId);

  return (
    <Select
      value={selectedCompanyId || ""}
      onValueChange={onCompanyChange}
      disabled={disabled}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder="Select company">
          {selectedCompany ? selectedCompany.name : "Select company"}
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
