import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useUserTeams } from '@/hooks/useUserTeams';
import { useTeamMemberSelector } from '@/hooks/useTeamMemberSelector';
import { Users, AlertTriangle } from 'lucide-react';
interface LeadershipTeamDebuggerProps {
  visible?: boolean;
  selectedTeamId?: string;
}
export const LeadershipTeamDebugger: React.FC<LeadershipTeamDebuggerProps> = ({
  visible = false,
  selectedTeamId
}) => {
  const {
    teams
  } = useUserTeams();
  const {
    users: selectedTeamMembers,
    loading,
    error
  } = useTeamMemberSelector(selectedTeamId || null);
  if (!visible) return null;

  // Find all leadership teams
  const leadershipTeams = teams.filter(team => team.name?.toLowerCase().includes('leadership') || team.name?.toLowerCase().includes('liderança'));
  return <Card className="mb-6 border-blue-200 bg-primary/5">
      
      
    </Card>;
};