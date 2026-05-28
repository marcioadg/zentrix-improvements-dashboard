import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
interface TeamSwitchDebuggerProps {
  visible?: boolean;
  selectedTeam: string;
  teams: Array<{
    id: string;
    name: string;
    company_id: string;
  }>;
  onTeamSelect: (teamId: string) => void;
}
export const TeamSwitchDebugger: React.FC<TeamSwitchDebuggerProps> = ({
  visible = false,
  selectedTeam,
  teams,
  onTeamSelect
}) => {
  const [switchHistory, setSwitchHistory] = useState<Array<{
    timestamp: string;
    from: string;
    to: string;
    reason: string;
  }>>([]);
  const logTeamSwitch = (from: string, to: string, reason: string) => {
    setSwitchHistory(prev => [...prev, {
      timestamp: new Date().toISOString(),
      from,
      to,
      reason
    }].slice(-10)); // Keep last 10 switches
  };

  // Override the team select function to add logging
  const handleTeamSelect = (teamId: string) => {
    logTeamSwitch(selectedTeam, teamId, 'Manual selection');
    onTeamSelect(teamId);
  };
  if (!visible) return null;
  return <Card className="mb-6 border-orange-200 bg-orange-50">
      
      
    </Card>;
};