
import React from 'react';
import { TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useUserCapabilities } from '@/hooks/useUserCapabilities';
import { EmptyState } from '@/components/ui/empty-state';

interface EmptyMetricsStateProps {
  isLoading?: boolean;
  message?: string;
}

export const EmptyMetricsState: React.FC<EmptyMetricsStateProps> = ({ 
  isLoading = false, 
  message = "No metrics yet. Add your first metric above."
}) => {
  const navigate = useNavigate();
  const { permissionLevel } = useUserCapabilities();

  const handleGoToTeams = () => {
    navigate('/people?tab=team');
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <LoadingSpinner size="lg" label="Loading metrics..." />
      </div>
    );
  }

  return (
    <EmptyState
      icon={TrendingUp}
      title="No Metrics Yet"
      description={message}
      action={permissionLevel !== 'view-only' ? {
        label: 'Go to Teams',
        onClick: handleGoToTeams,
        variant: 'outline'
      } : undefined}
    />
  );
};
