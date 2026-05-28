
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const TeamSecurityStatus: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Team-Based Security Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            🔒 <strong>Team-based security is now active.</strong> Users can only view and manage data for teams they're members of.
          </p>
          <p>
            📋 Goals, tasks, issues, metrics, and meetings are now restricted to team members only.
          </p>
          <p>
            👥 Use the team management features to assign people to appropriate teams.
          </p>
          <p>
            🚫 Users without team memberships will see no team data - this is working correctly.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
