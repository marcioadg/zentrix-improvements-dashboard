
import React from 'react';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const StartMeetingButton = () => {
  const navigate = useNavigate();

  const handleJoinTeam = () => {
    navigate('/metrics');
  };

  return (
    <Button 
      onClick={handleJoinTeam}
      variant="success"
      size="lg"
      className="w-full"
    >
      <Users className="h-5 w-5 mr-2" />
      View Metrics
    </Button>
  );
};
