
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { useProfile } from '@/hooks/useProfile';
import { useUserManagement } from '@/hooks/useUserManagement';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Bug, CheckCircle, XCircle } from 'lucide-react';
import { logger } from '@/utils/logger';

export const RoleUpdateDebugger: React.FC = () => {
  const { user } = useAuth();
  const { currentCompany } = useMultiCompany();
  const { profile } = useProfile();
  const { users, hasManagerAccess } = useUserManagement();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isDebugging, setIsDebugging] = useState(false);

  const runDiagnostics = async () => {
    setIsDebugging(true);
    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      auth: {},
      profile: {},
      company: {},
      permissions: {},
      database: {}
    };

    try {
      // Auth diagnostics
      diagnostics.auth = {
        userId: user?.id || 'Not authenticated',
        email: user?.email || 'No email',
        isAuthenticated: !!user
      };

      // Profile diagnostics
      diagnostics.profile = {
        profileExists: !!profile,
        fullName: profile?.full_name || 'No name',
        companyId: profile?.company_id || 'No company'
      };

      // Company diagnostics
      diagnostics.company = {
        currentCompanyExists: !!currentCompany,
        companyId: currentCompany?.id || 'No company',
        companyName: currentCompany?.name || 'No company name'
      };

      // Permission diagnostics
      diagnostics.permissions = {
        hasManagerAccess,
        usersCount: users.length,
        currentUserInList: !!users.find(u => u.user_id === user?.id)
      };

      // Database connectivity test
      if (user?.id && currentCompany?.id) {
        try {
          const { data: companyMember, error } = await supabase
            .from('company_members')
            .select('*')
            .eq('user_id', user.id)
            .eq('company_id', currentCompany?.id)
            .single();

          diagnostics.database = {
            canConnectToDatabase: !error,
            companyMembershipExists: !!companyMember,
            companyMemberData: companyMember || null,
            error: error?.message || null
          };
        } catch (dbError) {
          diagnostics.database = {
            canConnectToDatabase: false,
            error: dbError instanceof Error ? dbError.message : 'Unknown database error'
          };
        }
      }

      setDebugInfo(diagnostics);
    } catch (error) {
      logger.error('Debug diagnostics failed:', error);
      diagnostics.error = error instanceof Error ? error.message : 'Unknown error';
      setDebugInfo(diagnostics);
    } finally {
      setIsDebugging(false);
    }
  };

  const renderStatus = (value: boolean | undefined, label: string) => {
    if (value === undefined) return <Badge variant="secondary">Unknown</Badge>;
    return value ? (
      <Badge variant="default" className="bg-green-500">
        <CheckCircle className="w-3 h-3 mr-1" />
        {label}
      </Badge>
    ) : (
      <Badge variant="destructive">
        <XCircle className="w-3 h-3 mr-1" />
        {label}
      </Badge>
    );
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bug className="w-5 h-5" />
          Role Update Debugger
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runDiagnostics} 
          disabled={isDebugging}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isDebugging ? 'animate-spin' : ''}`} />
          {isDebugging ? 'Running Diagnostics...' : 'Run Diagnostics'}
        </Button>

        {debugInfo && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Authentication Status */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Authentication</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {renderStatus(debugInfo.auth.isAuthenticated, 'Authenticated')}
                <p className="text-xs text-muted-foreground">
                  User ID: {debugInfo.auth.userId}
                </p>
                <p className="text-xs text-muted-foreground">
                  Email: {debugInfo.auth.email}
                </p>
              </CardContent>
            </Card>

            {/* Profile Status */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {renderStatus(debugInfo.profile.profileExists, 'Profile Exists')}
                <p className="text-xs text-muted-foreground">
                  Company ID: {debugInfo.profile.companyId}
                </p>
              </CardContent>
            </Card>

            {/* Company Status */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Company Context</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {renderStatus(debugInfo.company.currentCompanyExists, 'Company Selected')}
                <p className="text-xs text-muted-foreground">
                  Company: {debugInfo.company.companyName}
                </p>
                <p className="text-xs text-muted-foreground">
                  ID: {debugInfo.company.companyId}
                </p>
              </CardContent>
            </Card>

            {/* Permissions Status */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Permissions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {renderStatus(debugInfo.permissions.hasManagerAccess, 'Manager Access')}
                {renderStatus(debugInfo.permissions.currentUserInList, 'In Company List')}
                <p className="text-xs text-muted-foreground">
                  Users Count: {debugInfo.permissions.usersCount}
                </p>
              </CardContent>
            </Card>

            {/* Database Status */}
            {debugInfo.database && (
              <Card className="md:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Database Connectivity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {renderStatus(debugInfo.database.canConnectToDatabase, 'Database Connected')}
                  {renderStatus(debugInfo.database.companyMembershipExists, 'Company Membership Exists')}
                  
                  {debugInfo.database.companyMemberData && (
                    <div className="mt-3 p-3 bg-muted rounded text-xs">
                      <strong>Company Member Data:</strong>
                      <pre className="mt-1 whitespace-pre-wrap">
                        {JSON.stringify(debugInfo.database.companyMemberData, null, 2)}
                      </pre>
                    </div>
                  )}
                  
                  {debugInfo.database.error && (
                    <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive">
                      <strong>Database Error:</strong> {debugInfo.database.error}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {debugInfo && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Raw Debug Data</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-64">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
};
