
import { useParams } from 'react-router-dom';

export const useCurrentTeamId = () => {
  const { teamId } = useParams<{ teamId: string }>();
  return teamId || '';
};
