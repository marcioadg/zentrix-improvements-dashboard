import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

export const MetricsAuthDebugger: React.FC = () => {
  const { toast } = useToast();
  const [debugInfo, setDebugInfo] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);

  const runAuthDebug = async () => {
    setLoading(true);
    try {
      // Check current session
      const { data: session } = await supabase.auth.getSession();
      
      // Check for existing users
      const { data: users } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .limit(5);

      // Check user_settings
      const { data: userSettings } = await supabase
        .from('user_settings')
        .select('user_id, current_company_id')
        .limit(5);

      // Check team_members
      const { data: teamMembers } = await supabase
        .from('team_members')
        .select('user_id, team_id')
        .limit(5);

      setDebugInfo({
        currentSession: session?.session?.user?.id || 'No session',
        hasUsers: users?.length || 0,
        hasUserSettings: userSettings?.length || 0,
        hasTeamMembers: teamMembers?.length || 0,
        sampleUsers: users,
        sampleSettings: userSettings,
        sampleTeamMembers: teamMembers
      });
    } catch (error) {
      logger.error('Debug error:', error);
      setDebugInfo({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const simulateLogin = async (userId: string) => {
    try {
      // This is a development-only simulation
      // In production, proper authentication would be required
      toast({
        title: "Simulation",
        description: `Simulating login for user ${userId}`,
      });
      
      // We can't actually set auth state from client side
      // But we can show what the fix would be
      logger.log('To fix auth, user needs to properly sign in via /auth');
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not simulate login",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Metrics Auth Debugger (Phase 1)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={runAuthDebug} disabled={loading}>
          {loading ? 'Checking...' : 'Check Auth State'}
        </Button>

        {debugInfo && (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">Debug Results:</h4>
              <pre className="text-sm overflow-auto">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </div>

            {debugInfo.sampleUsers?.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Available Users (for testing):</h4>
                {debugInfo.sampleUsers.map((user: any) => (
                  <div key={user.id} className="flex items-center justify-between p-2 border rounded mb-2">
                    <span>{user.email} ({user.full_name})</span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => simulateLogin(user.id)}
                    >
                      Simulate Login
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="p-4 bg-primary/5 dark:bg-blue-950 rounded-lg">
              <h4 className="font-semibold mb-2">Next Steps:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>User needs to sign in via /auth page</li>
                <li>Or fix the existing session if it's corrupted</li>
                <li>Once authenticated, we'll check user_settings and team membership</li>
                <li>Then we can load metrics data properly</li>
              </ol>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};