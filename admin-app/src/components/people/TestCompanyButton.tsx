
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Building, Plus } from 'lucide-react';
import { createTestCompanies } from '@/utils/createTestCompanies';
import { useToast } from '@/hooks/use-toast';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { logger } from '@/utils/logger';

export const TestCompanyButton: React.FC = () => {
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const { refreshCompanies, hasMultipleCompanies } = useMultiCompanyAccess();

  const handleCreateTestCompany = async () => {
    setIsCreating(true);
    try {
      const testCompany = await createTestCompanies();
      await refreshCompanies();
      
      toast({
        title: "Test Company Created",
        description: `Created "${testCompany.name}" - The company switcher should now be visible!`,
      });
    } catch (error) {
      logger.error('Error creating test company:', error);
      toast({
        title: "Error",
        description: "Failed to create test company. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Always show the button to allow creating new companies

  return (
    <Button
      onClick={handleCreateTestCompany}
      disabled={isCreating}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      <Building className="h-4 w-4" />
      {isCreating ? "Creating..." : "Add Test Company"}
      <Plus className="h-4 w-4" />
    </Button>
  );
};
