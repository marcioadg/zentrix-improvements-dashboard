import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, BarChart3 } from 'lucide-react';
interface TeamSelectionDebuggerProps {
  visible?: boolean;
  selectedTeam?: string;
  teams: Array<{
    id: string;
    name: string;
    company_id: string;
    role?: string;
  }>;
  metricsCount?: number;
}
export const TeamSelectionDebugger: React.FC<TeamSelectionDebuggerProps> = ({
  visible = false,
  selectedTeam,
  teams,
  metricsCount = 0
}) => {
  if (!visible) return null;
  const selectedTeamData = teams.find(t => t.id === selectedTeam);
  return <Card className="mb-6 border-blue-200 bg-primary/5">
      
      
    </Card>;
};