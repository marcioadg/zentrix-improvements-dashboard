
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock } from 'lucide-react';

export const AccessRestricted: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold text-foreground tracking-tight">People</h1>
          <p className="text-muted-foreground mt-2">
            Manage team members in your organization
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-muted-foreground" />
            Access Restricted
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-[16px] font-semibold mb-2">Manager Access Required</h3>
            <p className="text-muted-foreground mb-4">
              You need manager or owner privileges to access the People page.
            </p>
            <p className="text-sm text-muted-foreground">
              Contact your administrator to request elevated access if needed.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
