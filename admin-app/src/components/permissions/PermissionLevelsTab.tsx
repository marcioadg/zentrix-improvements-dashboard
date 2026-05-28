
import React from 'react';
import CapabilityMatrix from './CapabilityMatrix';
import { PERMISSION_LEVEL_CAPABILITIES } from '@/utils/capabilityDefinitions';

const PermissionLevelsTab: React.FC = () => {
  const roleColors = {
    'view-only': 'bg-muted text-muted-foreground',
    'member': 'bg-muted text-muted-foreground',
    'manager': 'bg-[var(--active)]/10 text-[var(--active)]',
    'director': 'bg-destructive/10 text-destructive',
    'super_admin': 'bg-[var(--active)]/20 text-[var(--active)] font-semibold'
  };

  return (
    <div className="space-y-6">
      <CapabilityMatrix
        title="Permission Level Capabilities"
        description="This matrix shows what capabilities are granted at each permission level. Permission levels determine what users can access and do within the system."
        roles={['view-only', 'member', 'manager', 'director', 'super_admin']}
        roleCapabilities={PERMISSION_LEVEL_CAPABILITIES}
        roleColors={roleColors}
      />
      
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
        <h4 className="font-medium text-primary mb-2">About Permission Levels</h4>
        <div className="text-sm text-primary space-y-2">
          <p>
            <strong>View-Only:</strong> Basic read access to view teams, join meetings, and access dashboard.
          </p>
          <p>
            <strong>Member:</strong> Standard access including team management, voting on issues, and personal task management.
          </p>
          <p>
            <strong>Manager:</strong> Team leadership capabilities including creating teams, leading meetings, and accessing company data.
          </p>
          <p>
            <strong>Director:</strong> Administrative access including all teams, analytics, settings, financials, and user management.
          </p>
          <p>
            <strong>Super Admin:</strong> System-wide access with full capabilities including system access, multi-company management, and security overrides.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PermissionLevelsTab;
