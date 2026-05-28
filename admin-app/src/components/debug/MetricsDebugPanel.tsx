import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { useUserTeams } from '@/hooks/useUserTeams';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
interface MetricsDebugPanelProps {
  teamId?: string;
  visible?: boolean;
}
export const MetricsDebugPanel: React.FC<MetricsDebugPanelProps> = ({
  teamId,
  visible = false
}) => {
  const {
    user
  } = useAuth();
  const {
    currentCompany
  } = useMultiCompany();
  const {
    teams
  } = useUserTeams();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  if (!visible) return null;
  const runDebugCheck = async () => {
    if (!user || !teamId) return;
    setLoading(true);
    try {
      // Check team membership
      const {
        data: membership,
        error: membershipError
      } = await supabase.from('team_members').select('id, user_id, team_id, joined_at').eq('team_id', teamId).eq('user_id', user.id);

      // Check metrics count
      const {
        data: metricsCount,
        error: metricsError
      } = await supabase.from('weekly_metrics').select('id', {
        count: 'exact'
      }).eq('team_id', teamId).is('deleted_at', null);

      // Check user's role in team
      const userTeam = teams.find(t => t.id === teamId);
      setDebugInfo({
        user: {
          id: user.id,
          email: user.email
        },
        team: {
          id: teamId,
          membership: membership || [],
          membershipError: membershipError?.message
          // userRole removed as team roles are deprecated
        },
        metrics: {
          count: metricsCount?.length || 0,
          error: metricsError?.message
        },
        company: {
          id: currentCompany?.id,
          name: currentCompany?.name
        },
        teams: teams.map(t => ({
          id: t.id,
          name: t.name,
          role: t.role
        })),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Debug check error:', error);
      setDebugInfo({
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };
  return <Card className="mb-6 border-yellow-200 bg-warning/5">
      
      
    </Card>;
};