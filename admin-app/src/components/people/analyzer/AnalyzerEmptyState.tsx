import React from 'react';
import { Users, Target, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AnalyzerEmptyStateProps {
  type: 'no-core-values' | 'no-people' | 'no-permissions' | 'loading-error' | 'no-reports';
  onNavigateToStrategy?: () => void;
  onRefresh?: () => void;
  onNavigateToOrgChart?: () => void;
  userOrgRole?: string | null;
}

export const AnalyzerEmptyState: React.FC<AnalyzerEmptyStateProps> = ({ 
  type, 
  onNavigateToStrategy,
  onRefresh,
  onNavigateToOrgChart,
  userOrgRole
}) => {
  const getEmptyStateContent = () => {
    switch (type) {
      case 'no-core-values':
        return {
          icon: <Target className="h-8 w-8 text-primary" />,
          title: "Core Values Setup Required",
          description: "Before you can use the People Analyzer, you need to define your company's core values in the Strategy page.",
          action: onNavigateToStrategy ? (
            <Button onClick={onNavigateToStrategy} size="sm" className="mt-4">
              Go to Strategy Page
            </Button>
          ) : null
        };
      
      case 'no-people':
        return {
          icon: <Users className="h-8 w-8 text-muted-foreground" />,
          title: "No People to Analyze",
          description: "There are no team members available for analysis. Make sure people are added to your company and teams.",
          action: null
        };
      
      case 'no-permissions':
        return {
          icon: <Settings className="h-8 w-8 text-muted-foreground" />,
          title: "Permission Required",
          description: "You don't have permission to view people data. Contact your administrator to get the necessary permissions.",
          action: null
        };
      
      case 'loading-error':
        return {
          icon: <Settings className="h-8 w-8 text-destructive" />,
          title: "Loading Error",
          description: "There was an error loading the People Analyzer. Please try refreshing the page.",
          action: onRefresh ? (
            <Button onClick={onRefresh} variant="ghost" size="sm" className="mt-4">
              Refresh Page
            </Button>
          ) : null
        };
      
      case 'no-reports':
        return {
          icon: <Users className="h-8 w-8 text-muted-foreground" />,
          title: "No Team Members Found",
          description: userOrgRole 
            ? `You are assigned to the ${userOrgRole} role, but no one reports to you in the organization chart. The People Analyzer only shows team members who report directly or indirectly to you.`
            : "You don't have a role assignment in the organization chart. To use the People Analyzer, you need team members reporting to you in the org chart.",
          action: onNavigateToOrgChart ? (
            <Button onClick={onNavigateToOrgChart} size="sm" className="mt-4">
              View Organization Chart
            </Button>
          ) : null
        };
      
      default:
        return {
          icon: <Users className="h-8 w-8 text-muted-foreground" />,
          title: "No Data Available",
          description: "No data is currently available for the People Analyzer.",
          action: null
        };
    }
  };

  const content = getEmptyStateContent();

  return (
    <div className="max-w-md mx-auto mt-8 p-6 text-center">
      <div className="flex justify-center mb-4">
        <div className="relative bg-primary/10 backdrop-blur-sm rounded-full p-4 ring-1 ring-primary/10">
          {content.icon}
        </div>
      </div>
      <h3 className="text-[16px] font-semibold text-foreground mb-2">
        {content.title}
      </h3>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        {content.description}
      </p>
      {content.action}
    </div>
  );
};