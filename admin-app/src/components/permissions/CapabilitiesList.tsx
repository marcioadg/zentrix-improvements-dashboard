
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface CapabilitiesListProps {
  capabilities: string[];
}

const CapabilitiesList: React.FC<CapabilitiesListProps> = ({ capabilities }) => {
  const getCapabilityDisplay = (capability: string) => {
    const displayMap: Record<string, { label: string; description: string; color: string }> = {
      view_team_info: { label: 'View Teams', description: 'Can view team information and members', color: 'bg-primary/20 text-primary' },
      participate_meetings: { label: 'Join Meetings', description: 'Can participate in team meetings', color: 'bg-success/10 text-green-800' },
      create_personal_tasks: { label: 'Personal Tasks', description: 'Can create and manage personal tasks', color: 'bg-muted text-foreground' },
      vote_issues: { label: 'Vote Issues', description: 'Can vote on issues and discussions', color: 'bg-secondary text-purple-800' },
      access_dashboard: { label: 'Dashboard', description: 'Can access company dashboard', color: 'bg-indigo-100 text-indigo-800' },
      view_company_data: { label: 'Company Data', description: 'Can view company-wide data and metrics', color: 'bg-cyan-100 text-cyan-800' },
      manage_assigned_teams: { label: 'Manage Teams', description: 'Can manage assigned teams and members', color: 'bg-warning/10 text-orange-800' },
      add_remove_team_members: { label: 'Team Members', description: 'Can add/remove team members', color: 'bg-warning/10 text-yellow-800' },
      conduct_meetings: { label: 'Lead Meetings', description: 'Can conduct and facilitate meetings', color: 'bg-emerald-100 text-emerald-800' },
      create_teams: { label: 'Create Teams', description: 'Can create new teams', color: 'bg-teal-100 text-teal-800' },
      full_company_access: { label: 'Full Access', description: 'Complete access to all company features', color: 'bg-destructive/10 text-red-800' },
      manage_all_teams: { label: 'All Teams', description: 'Can manage all company teams', color: 'bg-pink-100 text-pink-800' },
      company_settings: { label: 'Settings', description: 'Can modify company settings', color: 'bg-violet-100 text-violet-800' },
      financial_data: { label: 'Financials', description: 'Can access financial data and reports', color: 'bg-rose-100 text-rose-800' },
      manage_users: { label: 'User Management', description: 'Can manage company users and permissions', color: 'bg-amber-100 text-amber-800' },
      manage_team_settings: { label: 'Team Settings', description: 'Can modify team configurations', color: 'bg-lime-100 text-lime-800' },
      assign_tasks_others: { label: 'Assign Tasks', description: 'Can assign tasks to other users', color: 'bg-sky-100 text-sky-800' },
      access_analytics: { label: 'Analytics', description: 'Can access advanced analytics and insights', color: 'bg-muted text-foreground' },
      strategic_planning: { label: 'Strategy', description: 'Can access strategic planning tools', color: 'bg-stone-100 text-stone-800' },
      system_wide_access: { label: 'System Access', description: 'System-wide administrative access', color: 'bg-red-200 text-red-900' },
      manage_multiple_companies: { label: 'Multi-Company', description: 'Can manage multiple companies', color: 'bg-orange-200 text-orange-900' },
      override_security: { label: 'Security Override', description: 'Can override security policies', color: 'bg-red-300 text-red-900' },
      access_admin_panel: { label: 'Admin Panel', description: 'Can access system administration panel', color: 'bg-secondary text-foreground' }
    };

    return displayMap[capability] || { 
      label: capability.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), 
      description: 'Custom capability',
      color: 'bg-muted text-foreground'
    };
  };

  const displayedCapabilities = capabilities.slice(0, 3);
  const remainingCount = capabilities.length - 3;

  return (
    <TooltipProvider>
      <div className="flex flex-wrap gap-1">
        {displayedCapabilities.map((capability) => {
          const display = getCapabilityDisplay(capability);
          return (
            <Tooltip key={capability}>
              <TooltipTrigger asChild>
                <Badge className={`text-xs ${display.color} cursor-help`}>
                  {display.label}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>{display.description}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
        {remainingCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge className="text-xs bg-secondary text-foreground cursor-help">
                +{remainingCount} more
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1">
                {capabilities.slice(3).map((capability) => {
                  const display = getCapabilityDisplay(capability);
                  return (
                    <div key={capability} className="text-sm">
                      <strong>{display.label}:</strong> {display.description}
                    </div>
                  );
                })}
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
};

export default CapabilitiesList;
