/**
 * MobileMeetingAccessDeniedScreen — full-screen gate shown when the
 * current user is not a member of the team this meeting belongs to.
 *
 * Mirrors desktop's MeetingAccessHandler (Access Denied Lock card) but
 * shaped for mobile: full-bleed, primary CTA back to /m/tasks, secondary
 * link to settings/teams.
 *
 * Showing this gate BEFORE we mount MeetingSectionRenderer prevents the
 * cascade of "Access Denied" toasts and 400 / 404 fetches that fire
 * when its child hooks (useSimpleIssues, useUnifiedTeamTasks, etc.) try
 * to read team-scoped data they can't see.
 */
import React from 'react';
import { Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface MobileMeetingAccessDeniedScreenProps {
  /**
   * Display label for the team the user tried to access. If we can read
   * the team row (RLS permits) we'll show it; otherwise pass undefined.
   */
  teamLabel?: string | null;
  onBack?: () => void;
}

export const MobileMeetingAccessDeniedScreen: React.FC<MobileMeetingAccessDeniedScreenProps> = ({
  teamLabel,
  onBack,
}) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
      <div className="w-14 h-14 rounded-full bg-muted/70 text-muted-foreground flex items-center justify-center mb-4">
        <Lock className="h-6 w-6" />
      </div>
      <h1 className="text-[20px] font-bold text-foreground" style={{ letterSpacing: '-0.2px' }}>
        Access denied
      </h1>
      <p className="text-[12.5px] text-muted-foreground mt-2 max-w-xs leading-relaxed">
        You're not a member of {teamLabel ? <strong className="text-foreground">{teamLabel}</strong> : 'this team'}.
        You need to be a team member to view its meeting.
      </p>

      <div className="flex flex-col gap-2 mt-6 w-full max-w-xs">
        <Button
          type="button"
          onClick={() => navigate('/m/tasks')}
          className="w-full h-11"
        >
          Back to my tasks
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => (onBack ? onBack() : navigate(-1))}
          className="w-full h-11"
        >
          Go back
        </Button>
      </div>
    </div>
  );
};

export default MobileMeetingAccessDeniedScreen;
