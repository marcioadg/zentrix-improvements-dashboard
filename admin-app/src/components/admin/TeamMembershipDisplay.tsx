
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TeamMembership {
  team_id: string;
  team_name: string;
  company_name: string;
  role: string;
}

interface TeamMembershipDisplayProps {
  teamMemberships: TeamMembership[];
  maxDisplay?: number;
}

export const TeamMembershipDisplay: React.FC<TeamMembershipDisplayProps> = ({ 
  teamMemberships, 
  maxDisplay = 6 
}) => {
  if (teamMemberships.length === 0) {
    return <span className="text-muted-foreground text-sm">No teams</span>;
  }

  // Group teams by company
  const teamsByCompany = teamMemberships.reduce((acc, membership) => {
    if (!acc[membership.company_name]) {
      acc[membership.company_name] = [];
    }
    acc[membership.company_name].push(membership);
    return acc;
  }, {} as Record<string, TeamMembership[]>);

  const companies = Object.keys(teamsByCompany);
  const totalTeams = teamMemberships.length;
  const shouldTruncate = totalTeams > maxDisplay;
  
  // For display, we'll show teams up to maxDisplay limit
  let displayedTeams = 0;
  const displayElements: JSX.Element[] = [];

  for (const companyName of companies) {
    const teams = teamsByCompany[companyName];
    
    if (displayedTeams >= maxDisplay) break;
    
    // Add company header if multiple companies
    if (companies.length > 1) {
      displayElements.push(
        <div key={`company-${companyName}`} className="text-xs font-medium text-muted-foreground mb-1">
          {companyName}
        </div>
      );
    }
    
    // Add teams for this company
    for (const team of teams) {
      if (displayedTeams >= maxDisplay) break;
      
      displayElements.push(
        <Badge 
          key={`${team.team_id}-${team.company_name}`} 
          variant="outline" 
          className="mr-1 mb-1 text-xs"
        >
          {team.team_name}
          {/* Role display removed since team roles deprecated */}
        </Badge>
      );
      displayedTeams++;
    }
  }

  if (shouldTruncate) {
    const remainingCount = totalTeams - displayedTeams;
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex flex-wrap items-center max-w-xs">
              {displayElements}
              <Badge variant="secondary" className="text-xs">
                +{remainingCount} more
              </Badge>
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-sm">
            <div className="space-y-2">
              <div className="font-medium">All Teams ({totalTeams})</div>
              {companies.map(companyName => (
                <div key={companyName}>
                  <div className="text-sm font-medium">{companyName}</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {teamsByCompany[companyName].map(team => (
                      <Badge 
                        key={`${team.team_id}-${team.company_name}`} 
                        variant="outline" 
                        className="text-xs"
                      >
                        {team.team_name}
                        {/* Role display removed since team roles deprecated */}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="flex flex-wrap items-center max-w-xs">
      {displayElements}
    </div>
  );
};
