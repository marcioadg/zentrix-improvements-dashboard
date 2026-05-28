
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Building, AlertCircle, Crown } from 'lucide-react';
import { logger } from '@/utils/logger';

interface Company {
  id: string;
  name: string;
  slug: string;
  is_direct?: boolean;
}

interface DisplayUserCompany {
  id: string;
  name: string;
  role: string;
  is_primary?: boolean;
}

interface CompanyMembershipSectionProps {
  isEditing: boolean;
  availableCompanies: Company[];
  displayUserCompanies: DisplayUserCompany[];
  selectedCompanyIds: string[];
  onCompanyToggle: (companyId: string) => void;
  loading: boolean;
}

export const CompanyMembershipSection: React.FC<CompanyMembershipSectionProps> = ({
  isEditing,
  availableCompanies,
  displayUserCompanies,
  selectedCompanyIds,
  onCompanyToggle,
  loading
}) => {
  logger.log('🔍 CompanyMembershipSection: Rendering with props:', {
    isEditing,
    availableCompaniesCount: availableCompanies.length,
    displayUserCompaniesCount: displayUserCompanies.length,
    selectedCompanyIdsCount: selectedCompanyIds.length,
    loading
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Building className="h-4 w-4" />
          Company Memberships
        </CardTitle>
        <CardDescription>
          {isEditing 
            ? "Select which companies this user should be a member of. Primary company cannot be removed." 
            : "Companies this user is a member of"
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-2">
            {availableCompanies.length === 0 ? (
              <div className="text-center py-4">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No companies available</p>
              </div>
            ) : (
              availableCompanies.map((company) => {
                const userCompany = displayUserCompanies.find(uc => uc.id === company.id);
                const isPrimary = userCompany?.is_primary || false;
                
                return (
                  <div key={company.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`company-${company.id}`}
                      checked={selectedCompanyIds.includes(company.id)}
                      onCheckedChange={() => onCompanyToggle(company.id)}
                      disabled={loading || isPrimary}
                    />
                    <label
                      htmlFor={`company-${company.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className={isPrimary ? 'font-semibold' : ''}>{company.name}</span>
                        <div className="flex gap-1">
                          {isPrimary && (
                            <Badge variant="outline" className="text-xs bg-warning/10 text-yellow-800">
                              <Crown className="h-3 w-3 mr-1" />
                              Primary
                            </Badge>
                          )}
                          {company.is_direct && (
                            <Badge variant="outline" className="text-xs">Direct</Badge>
                          )}
                        </div>
                      </div>
                    </label>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {displayUserCompanies.length === 0 ? (
              <div className="text-center py-4">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No company memberships</p>
              </div>
            ) : (
              displayUserCompanies.map((company) => (
                <div key={company.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span className={`font-medium ${company.is_primary ? 'font-semibold' : ''}`}>
                      {company.name}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {company.is_primary && (
                      <Badge variant="outline" className="text-xs bg-warning/10 text-yellow-800">
                        <Crown className="h-3 w-3 mr-1" />
                        Primary
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {company.role}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
