import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CreateCompanyModal } from './CreateCompanyModal';
import { CompanyManagementView } from './CompanyManagementView';
import { Plus } from 'lucide-react';

export const CompanyManagement = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <div className="space-y-4 md:space-y-6">
      <CompanyManagementView onCreateCompany={() => setShowCreateModal(true)} />

      <CreateCompanyModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
      />
    </div>
  );
};