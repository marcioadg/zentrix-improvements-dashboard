
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { useUserCapabilities } from '@/hooks/useUserCapabilities';
import { useMetricsPermissions } from '@/hooks/useMetricsPermissions';

interface MetricOwnershipDebugProps {
  metric: any;
}

export const MetricOwnershipDebug: React.FC<MetricOwnershipDebugProps> = ({ metric }) => {
  const { user } = useAuth();
  const { currentCompany } = useMultiCompany();
  const { hasCapability, capabilities, permissionLevel } = useUserCapabilities();
  const { canChangeMetricOwner } = useMetricsPermissions(metric.team_id);

  const debugInfo = {
    user: {
      id: user?.id,
      email: user?.email
    },
    company: {
      id: currentCompany?.id,
      name: currentCompany?.name
    },
    permissions: {
      permissionLevel,
      capabilities,
      hasManageMetrics: hasCapability('manage_metrics'),
      hasEditMetrics: hasCapability('edit_metrics'),
      canChangeOwner: canChangeMetricOwner(metric)
    },
    metric: {
      id: metric.id,
      name: metric.metric_name,
      current_owner_id: metric.owner_id,
      team_id: metric.team_id
    },
    functionsAvailable: {
      hasCapability: typeof hasCapability,
      canChangeMetricOwner: typeof canChangeMetricOwner
    }
  };

  return (
    <div className="mt-4 p-4 bg-muted rounded-lg max-w-4xl">
      <h3 className="font-bold mb-2">🔍 Debug: Ownership Change Issue</h3>
      <pre className="text-xs overflow-auto max-h-96 bg-white p-2 rounded border">
        {JSON.stringify(debugInfo, null, 2)}
      </pre>
      
      <div className="mt-4 space-y-2">
        <div className={`p-2 rounded ${debugInfo.permissions.hasManageMetrics ? 'bg-success/10 text-green-800' : 'bg-destructive/10 text-red-800'}`}>
          <strong>Has manage_metrics capability:</strong> {debugInfo.permissions.hasManageMetrics ? 'YES' : 'NO'}
        </div>
        
        <div className={`p-2 rounded ${debugInfo.permissions.canChangeOwner ? 'bg-success/10 text-green-800' : 'bg-destructive/10 text-red-800'}`}>
          <strong>Can change metric owner:</strong> {debugInfo.permissions.canChangeOwner ? 'YES' : 'NO'}
        </div>
        
        <div className="p-2 bg-primary/10 text-blue-800 rounded">
          <strong>Permission Level:</strong> {debugInfo.permissions.permissionLevel}
        </div>
        
        {!debugInfo.permissions.hasManageMetrics && (
          <div className="p-2 bg-warning/10 text-yellow-800 rounded">
            <strong>❌ Issue:</strong> You need 'manage_metrics' capability. Ask admin for Manager role or higher.
          </div>
        )}

        {debugInfo.permissions.hasManageMetrics && !debugInfo.permissions.canChangeOwner && (
          <div className="p-2 bg-warning/10 text-orange-800 rounded">
            <strong>⚠️ Bug:</strong> You have manage_metrics but canChangeMetricOwner returns false. Check useMetricsPermissions hook.
          </div>
        )}
      </div>
    </div>
  );
};
