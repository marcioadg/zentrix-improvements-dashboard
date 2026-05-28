import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, ArrowRight, Network } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AnalyzerOrgChartEmptyStateProps {
  userOrgRole: string | null;
}

export const AnalyzerOrgChartEmptyState: React.FC<AnalyzerOrgChartEmptyStateProps> = ({ 
  userOrgRole 
}) => {
  const navigate = useNavigate();

  const handleNavigateToOrgChart = () => {
    navigate('/org-chart');
  };

  return (
    <div className="flex items-center justify-center min-h-[400px] p-6">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center text-center p-8">
          <div className="flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-6">
            <Network className="h-8 w-8 text-primary" />
          </div>
          
          <h3 className="text-xl font-semibold mb-3">
            No Team Members Found
          </h3>
          
          <div className="text-muted-foreground mb-6 space-y-2">
            {userOrgRole ? (
              <>
                <p>
                  You are assigned to the <strong>{userOrgRole}</strong> role, but no one reports to you in the organization chart.
                </p>
                <p>
                  The People Analyzer only shows team members who report directly or indirectly to you.
                </p>
              </>
            ) : (
              <>
                <p>
                  You don't have a role assignment in the organization chart.
                </p>
                <p>
                  To use the People Analyzer, you need team members reporting to you in the org chart.
                </p>
              </>
            )}
          </div>

          <Button 
            onClick={handleNavigateToOrgChart}
            className="flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            View Organization Chart
            <ArrowRight className="h-4 w-4" />
          </Button>
          
          <p className="text-sm text-muted-foreground mt-4">
            Set up your team structure to start analyzing people
          </p>
        </CardContent>
      </Card>
    </div>
  );
};