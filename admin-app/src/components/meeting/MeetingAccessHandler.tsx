
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface UserTeam {
  id: string;
  name: string;
  company_id: string;
  description?: string;
  role?: string;
}

interface MeetingAccessHandlerProps {
  teamId?: string;
  teams: UserTeam[];
  teamsLoading: boolean;
}

export const MeetingAccessHandler: React.FC<MeetingAccessHandlerProps> = ({
  teamId,
  teams,
  teamsLoading
}) => {
  const navigate = useNavigate();
  const currentTeam = teams.find(team => team.id === teamId);
  const hasTeamAccess = !!currentTeam;

  if (!teamId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Team Not Found</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">Please select a valid team to start a meeting.</p>
            <Button onClick={() => navigate('/meetings')}>
              Back to Meetings
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (teamsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Loading...</h1>
          <p className="text-muted-foreground">Verifying team access...</p>
        </div>
      </div>
    );
  }

  if (!hasTeamAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-center justify-center">
              <Lock className="h-5 w-5 text-muted-foreground" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="space-y-2">
              <p className="text-muted-foreground">
                You don't have access to this team's meetings.
              </p>
              <p className="text-sm text-muted-foreground">
                You must be a member of this team to participate in meetings.
              </p>
            </div>
            <div className="space-y-2">
              <Button onClick={() => navigate('/meetings')} className="w-full">
                Back to My Meetings
              </Button>
              <Button onClick={() => navigate('/settings/teams')} variant="outline" className="w-full">
                Manage Teams
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
};
