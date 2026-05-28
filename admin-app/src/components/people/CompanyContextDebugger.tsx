
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { useUserTeams } from '@/hooks/useUserTeams';
import { useTeams } from '@/hooks/useTeams';
import { usePeopleManagement } from '@/hooks/usePeopleManagement';
import { Bug, Users, Building, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const CompanyContextDebugger: React.FC = () => {
  const { companies, currentCompany, refreshCompanies } = useMultiCompany();
  const { teams: userTeams, loading: userTeamsLoading, refetch: refetchUserTeams } = useUserTeams();
  const { teams: allTeams, loading: allTeamsLoading, refetch: refetchAllTeams } = useTeams();
  const { hasManagerAccess } = usePeopleManagement();

  // Only show in development or for users with manager access
  const shouldShow = process.env.NODE_ENV === 'development' || hasManagerAccess;

  if (!shouldShow) return null;

  const handleRefreshAll = async () => {
    await Promise.all([
      refreshCompanies(),
      refetchUserTeams(),
      refetchAllTeams()
    ]);
  };

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <Bug className="h-4 w-4" />
            Company Context Debugger
            <Badge variant="outline" className="text-xs">
              Debug Mode
            </Badge>
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefreshAll}
            className="text-orange-700 border-orange-300 hover:bg-warning/10"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh All
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-medium text-orange-800">
              <Building className="h-4 w-4" />
              Current Company
            </div>
            <div className="pl-6 space-y-1">
              <div>Name: <code className="bg-warning/10 px-1 rounded">{currentCompany?.name || 'None'}</code></div>
              <div>ID: <code className="bg-warning/10 px-1 rounded text-xs">{currentCompany?.id || 'None'}</code></div>
              <div>Role: <Badge variant="secondary" className="text-xs">{currentCompany?.role || 'None'}</Badge></div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 font-medium text-orange-800">
              <Building className="h-4 w-4" />
              All Companies ({companies.length})
            </div>
            <div className="pl-6 space-y-1 max-h-24 overflow-y-auto">
              {companies.map(company => (
                <div key={company.id} className="text-xs">
                  <span className={company.id === currentCompany?.id ? 'font-bold' : ''}>
                    {company.name}
                  </span>
                  <span className="text-muted-foreground ml-1">({company.role})</span>
                  <div className="text-muted-foreground text-xs">{company.id}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 font-medium text-orange-800">
              <Users className="h-4 w-4" />
              Teams Context
            </div>
            <div className="pl-6 space-y-1">
              <div>User Teams: <Badge variant="outline" className="text-xs">{userTeamsLoading ? '...' : userTeams.length}</Badge></div>
              <div>All Teams: <Badge variant="outline" className="text-xs">{allTeamsLoading ? '...' : allTeams.length}</Badge></div>
              {userTeams.length > 0 && (
                <div className="max-h-16 overflow-y-auto">
                  {userTeams.map(team => (
                    <div key={team.id} className="text-xs">
                      • {team.name} <span className="text-muted-foreground">(member)</span>
                      <div className="text-muted-foreground text-xs pl-2">Company: {team.company_id}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-orange-200">
          <div className="text-xs text-warning">
            This debugger helps track company context and team visibility issues. 
            Check application logs for detailed information about team filtering and company switching.
            Use "Refresh All" to manually sync all data if teams are not appearing correctly.
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
