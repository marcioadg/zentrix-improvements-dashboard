
import React from 'react';
import { CompanyUser } from '@/types/companyUser';
import { CompanySelector } from '@/components/shared/CompanySelector';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building } from 'lucide-react';

interface CompanyAssignmentSectionProps {
  user: CompanyUser;
  isEditing: boolean;
  selectedCompanyId: string;
  onCompanyChange: (companyId: string) => void;
  loading: boolean;
}

export const CompanyAssignmentSection: React.FC<CompanyAssignmentSectionProps> = ({
  user,
  isEditing,
  selectedCompanyId,
  onCompanyChange,
  loading
}) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Building className="h-4 w-4" />
          Company Assignment
        </CardTitle>
        <CardDescription>
          {isEditing 
            ? "Change the user's primary company assignment" 
            : "The company this user is primarily assigned to"
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <CompanySelector
            selectedCompanyId={selectedCompanyId}
            onCompanyChange={onCompanyChange}
            disabled={loading}
            className="w-full"
          />
        ) : (
          <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
            <Building className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Current Company</span>
            <span className="text-muted-foreground">
              (Company information will be loaded from context)
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
