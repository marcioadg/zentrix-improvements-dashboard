import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

/**
 * If the user lands anywhere on the app while authenticated and we have a
 * `pendingJoinToken` stashed in sessionStorage (from /join/:token bouncing
 * them to login or signup), redirect them back to the join page to complete
 * the flow.
 *
 * Runs once when auth becomes ready. The redirect is consumed (sessionStorage
 * is cleared) by JoinViaLink after a successful join.
 */
export const PendingJoinTokenRedirector: React.FC = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || !user) return;
    let token: string | null = null;
    try {
      token = sessionStorage.getItem('pendingJoinToken');
    } catch {
      return;
    }
    if (!token) return;
    const target = `/join/${token}`;
    if (location.pathname === target) return;
    navigate(target, { replace: true });
  }, [loading, user, location.pathname, navigate]);

  return null;
};
