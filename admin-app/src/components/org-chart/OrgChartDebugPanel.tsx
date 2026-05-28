import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Bug, AlertTriangle, CheckCircle } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
interface DebugInfo {
  currentUser: {
    id: string;
    company_id: string;
    role: string;
  };
  profiles: Array<{
    id: string;
    full_name: string;
    email: string;
    company_id: string;
    role: string;
  }>;
  roles: Array<{
    id: string;
    title: string;
    company_id: string;
    assignments?: any[];
  }>;
  companyMismatch: Array<{
    profile: any;
    expectedCompanyId: string;
    actualCompanyId: string;
  }>;
}
interface OrgChartDebugPanelProps {
  debugInfo: DebugInfo | null;
}
export const OrgChartDebugPanel: React.FC<OrgChartDebugPanelProps> = ({
  debugInfo
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Add defensive checks for debugInfo
  if (!debugInfo) {
    return null;
  }

  // Safe access with defaults
  const safeDebugInfo = {
    currentUser: debugInfo.currentUser || {
      id: 'unknown',
      company_id: 'unknown',
      role: 'unknown'
    },
    profiles: debugInfo.profiles || [],
    roles: debugInfo.roles || [],
    companyMismatch: debugInfo.companyMismatch || []
  };
  const hasMismatch = safeDebugInfo.companyMismatch.length > 0;
  return <Card className="mb-4 border-orange-200 bg-orange-50">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Current User Info */}
            <div>
              <h4 className="font-medium mb-2">Current User Info</h4>
              <div className="bg-white p-3 rounded border text-sm space-y-1">
                <div><strong>ID:</strong> {safeDebugInfo.currentUser.id}</div>
                <div><strong>Company ID:</strong> {safeDebugInfo.currentUser.company_id}</div>
                <div><strong>Role:</strong> {safeDebugInfo.currentUser.role}</div>
              </div>
            </div>

            {/* Company Mismatch Issues */}
            {hasMismatch && <div>
                <h4 className="font-medium mb-2 text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Company Mismatch Issues ({safeDebugInfo.companyMismatch.length})
                </h4>
                <div className="space-y-2">
                  {safeDebugInfo.companyMismatch.map((mismatch, index) => <div key={index} className="bg-destructive/5 border border-red-200 p-3 rounded text-sm">
                      <div><strong>User:</strong> {mismatch.profile?.full_name || 'Unknown'} ({mismatch.profile?.email || 'No email'})</div>
                      <div><strong>Expected Company:</strong> {mismatch.expectedCompanyId}</div>
                      <div><strong>Actual Company:</strong> {mismatch.actualCompanyId}</div>
                    </div>)}
                </div>
              </div>}

            {/* Profiles Summary */}
            <div>
              <h4 className="font-medium mb-2">Profiles Summary</h4>
              <div className="bg-white p-3 rounded border text-sm">
                <div><strong>Total Profiles:</strong> {safeDebugInfo.profiles.length}</div>
                <div><strong>Expected Company:</strong> {safeDebugInfo.currentUser.company_id}</div>
                <div className="mt-2">
                  <strong>Profile Companies:</strong>
                  <div className="mt-1 space-y-1">
                    {Object.entries(safeDebugInfo.profiles.reduce((acc, profile) => {
                    const companyId = profile?.company_id || 'unknown';
                    acc[companyId] = (acc[companyId] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)).map(([companyId, count]) => <div key={companyId} className="flex items-center gap-2">
                        <Badge variant={companyId === safeDebugInfo.currentUser.company_id ? "default" : "destructive"} className="text-xs">
                          {companyId === safeDebugInfo.currentUser.company_id ? <CheckCircle className="h-3 w-3 mr-1" /> : <AlertTriangle className="h-3 w-3 mr-1" />}
                          {companyId}: {count} users
                        </Badge>
                      </div>)}
                  </div>
                </div>
              </div>
            </div>

            {/* Roles Summary */}
            <div>
              <h4 className="font-medium mb-2">Roles Summary</h4>
              <div className="bg-white p-3 rounded border text-sm">
                <div><strong>Total Roles:</strong> {safeDebugInfo.roles.length}</div>
                <div><strong>Assigned Roles:</strong> {safeDebugInfo.roles.filter(r => r.assignments?.length).length}</div>
                <div><strong>Vacant Roles:</strong> {safeDebugInfo.roles.filter(r => !r.assignments?.length).length}</div>
              </div>
            </div>

            {/* All Profiles Detail */}
            <div>
              <h4 className="font-medium mb-2">All Profiles Detail</h4>
              <div className="max-h-60 overflow-y-auto bg-white border rounded">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="p-2 text-left">Name</th>
                      <th className="p-2 text-left">Email</th>
                      <th className="p-2 text-left">Company ID</th>
                      <th className="p-2 text-left">Role</th>
                      <th className="p-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {safeDebugInfo.profiles.map(profile => <tr key={profile?.id || Math.random()} className="border-t">
                        <td className="p-2">{profile?.full_name || 'Unknown'}</td>
                        <td className="p-2">{profile?.email || 'No email'}</td>
                        <td className="p-2 font-mono">{profile?.company_id || 'Unknown'}</td>
                        <td className="p-2">{profile?.role || 'No role'}</td>
                        <td className="p-2">
                          {profile?.company_id === safeDebugInfo.currentUser.company_id ? <Badge variant="default" className="text-xs">Correct</Badge> : <Badge variant="destructive" className="text-xs">Mismatch</Badge>}
                        </td>
                      </tr>)}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>;
};