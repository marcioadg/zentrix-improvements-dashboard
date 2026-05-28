
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { useUserTeams } from '@/hooks/useUserTeams';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { networkDebugger } from '@/utils/networkDebugger';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { logger } from '@/utils/logger';

interface UserAccessDebuggerProps {
  visible?: boolean;
  targetUserId?: string; // For debugging specific users like Amanda
}

export const UserAccessDebugger: React.FC<UserAccessDebuggerProps> = ({ 
  visible = false,
  targetUserId 
}) => {
  const { user } = useAuth();
  const { currentCompany, companies } = useMultiCompany();
  const { teams } = useUserTeams();
  const [debugResults, setDebugResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const userIdToDebug = targetUserId || user?.id;

  useEffect(() => {
    if (visible && userIdToDebug) {
      runFullDiagnostic();
    }
  }, [visible, userIdToDebug]);

  const runFullDiagnostic = async () => {
    if (!userIdToDebug) return;
    
    setLoading(true);
    try {
      logger.log('🔍 UserAccessDebugger: Running full diagnostic for user:', userIdToDebug);
      
      // Test user access
      const accessResults = await networkDebugger.testUserAccess(userIdToDebug);
      
      // Get network logs
      const networkLogs = networkDebugger.getLogs();
      const failedRequests = networkDebugger.getFailedRequests();
      
      setDebugResults({
        userAccess: accessResults,
        networkLogs: networkLogs.slice(0, 10), // Last 10 requests
        failedRequests,
        currentContext: {
          userId: userIdToDebug,
          currentCompany: currentCompany ? { id: currentCompany?.id, name: currentCompany?.name } : null,
          availableCompanies: companies.map(c => ({ id: c.id, name: c.name })),
          userTeams: teams.map(t => ({ id: t.id, name: t.name }))
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.error('UserAccessDebugger: Diagnostic failed:', error);
      setDebugResults({
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <Card className="mb-6 border-blue-200 bg-primary/5">
      <CardHeader>
        <CardTitle className="text-blue-800 flex items-center gap-2">
          🔍 User Access Debugger
          <Badge variant="outline">Debug Mode</Badge>
          {targetUserId && <Badge variant="secondary">Target: {targetUserId.slice(0, 8)}...</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button 
              onClick={runFullDiagnostic} 
              disabled={loading || !userIdToDebug}
              variant="outline"
            >
              {loading ? 'Running Diagnostic...' : 'Run Full Diagnostic'}
            </Button>
            
            <Button 
              onClick={() => networkDebugger.clearLogs()} 
              variant="outline"
              size="sm"
            >
              Clear Logs
            </Button>
          </div>

          {debugResults && (
            <div className="space-y-4">
              {/* User Access Status */}
              {debugResults.userAccess && (
                <Alert className={debugResults.userAccess.hasProfile ? "border-green-200 bg-success/5" : "border-red-200 bg-destructive/5"}>
                  <div className="flex items-center gap-2">
                    {debugResults.userAccess.hasProfile ? 
                      <CheckCircle className="h-4 w-4 text-success" /> : 
                      <XCircle className="h-4 w-4 text-destructive" />
                    }
                    <AlertDescription>
                      <strong>Profile Access:</strong> {debugResults.userAccess.hasProfile ? 'Success' : 'Failed'}
                      {debugResults.userAccess.error && (
                        <div className="text-sm text-destructive mt-1">Error: {debugResults.userAccess.error}</div>
                      )}
                    </AlertDescription>
                  </div>
                </Alert>
              )}

              {/* Companies & Teams */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-blue-800">Companies ({debugResults.userAccess?.companies?.length || 0})</h4>
                  <div className="space-y-1">
                    {debugResults.userAccess?.companies?.map((comp: any, idx: number) => (
                      <div key={idx} className="text-sm bg-white p-2 rounded border">
                        <div><strong>Role:</strong> {comp.role}</div>
                        <div><strong>Company:</strong> {comp.companies?.name || 'Unknown'}</div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-blue-800">Teams ({debugResults.userAccess?.teams?.length || 0})</h4>
                  <div className="space-y-1">
                    {debugResults.userAccess?.teams?.map((team: any, idx: number) => (
                      <div key={idx} className="text-sm bg-white p-2 rounded border">
                        <div><strong>Team:</strong> {team.teams?.name || 'Unknown'}</div>
                        <div><strong>Company ID:</strong> {team.teams?.company_id?.slice(0, 8)}...</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Failed Requests */}
              {debugResults.failedRequests?.length > 0 && (
                <Alert className="border-red-200 bg-destructive/5">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <AlertDescription>
                    <strong>Failed Network Requests ({debugResults.failedRequests.length}):</strong>
                    <div className="mt-2 space-y-1">
                      {debugResults.failedRequests.slice(0, 3).map((req: any, idx: number) => (
                        <div key={idx} className="text-xs bg-destructive/10 p-2 rounded">
                          <div><strong>{req.requestType}</strong> - {req.error}</div>
                          <div>Duration: {req.duration.toFixed(2)}ms</div>
                        </div>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Current Context */}
              <div className="bg-white p-4 rounded border">
                <h4 className="font-medium text-blue-800 mb-2">Current Context</h4>
                <pre className="text-xs overflow-auto max-h-40 bg-muted/50 p-2 rounded">
                  {JSON.stringify(debugResults.currentContext, null, 2)}
                </pre>
              </div>

              {/* Recent Network Activity */}
              {debugResults.networkLogs?.length > 0 && (
                <div className="bg-white p-4 rounded border">
                  <h4 className="font-medium text-blue-800 mb-2">Recent Network Activity</h4>
                  <div className="space-y-1 max-h-40 overflow-auto">
                    {debugResults.networkLogs.map((log: any, idx: number) => (
                      <div key={idx} className={`text-xs p-2 rounded ${log.success ? 'bg-success/5' : 'bg-destructive/5'}`}>
                        <div className="flex justify-between">
                          <span><strong>{log.requestType}</strong></span>
                          <span>{log.duration.toFixed(2)}ms</span>
                        </div>
                        {!log.success && <div className="text-destructive">Error: {log.error}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div className="text-sm text-primary">
            <p><strong>Purpose:</strong> Diagnose user access issues and network connectivity problems.</p>
            <p><strong>User ID:</strong> {userIdToDebug || 'Not available'}</p>
            <p><strong>Current Company:</strong> {currentCompany?.name || 'None'}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
