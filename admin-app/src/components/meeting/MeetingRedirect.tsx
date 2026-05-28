
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMeeting } from '@/contexts/MeetingContext';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/utils/logger';

interface MeetingRedirectProps {
  children: React.ReactNode;
}

export const MeetingRedirect: React.FC<MeetingRedirectProps> = ({ children }) => {
  const { activeMeetingId, activeMeetingTeamId, meetingType } = useMeeting();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Only redirect if:
    // 1. User is authenticated
    // 2. There's an active meeting with a team ID
    // 3. User is not already on a meeting page
    // 4. User is not on auth pages
    const isOnMeetingPage = location.pathname.startsWith('/meeting/');
    const isOnAuthPage = ['/login', '/signup', '/complete-invitation'].includes(location.pathname);
    
    // activeMeetingTeamId represents the team ID for all meeting types
    if (user && activeMeetingId && activeMeetingTeamId && !isOnMeetingPage && !isOnAuthPage) {
      logger.log('MeetingRedirect: Redirecting to active meeting:', {
        identifier: activeMeetingTeamId,
        meetingType,
        isMemberMeeting: meetingType === 'custom'  // Could be member or team custom
      });
      const path = meetingType ? `/meeting/${activeMeetingTeamId}/${meetingType}` : `/meeting/${activeMeetingTeamId}`;
      navigate(path, { replace: true });
    }
  }, [user, activeMeetingId, activeMeetingTeamId, navigate, location.pathname]);

  return <>{children}</>;
};
