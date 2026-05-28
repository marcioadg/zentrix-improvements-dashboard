
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { useMetricsPermissions } from '@/hooks/useMetricsPermissions';

export const OwnershipDebug = ({ metric }: { metric: any }) => {
  const { user } = useAuth();
  const { currentCompany } = useMultiCompany();
  const { canChangeMetricOwner } = useMetricsPermissions(metric?.team_id);

  const canChange = canChangeMetricOwner(metric);

  return (
    <div className="p-2 bg-primary/5 border rounded text-xs">
      <div>User: {user?.email || 'None'}</div>
      <div>Company: {currentCompany?.name || 'None'}</div>
      <div>Can Change: {canChange ? 'YES' : 'NO'}</div>
      <div>Metric ID: {metric?.id}</div>
    </div>
  );
};
