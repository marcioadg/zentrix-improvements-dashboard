import React, { useState, useEffect } from 'react';
import { Hand, UserCheck } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

interface OrgRole {
  id: string;
  title: string;
  responsibilities?: string; // Database stores as string, not array
}

export const UserOrgPositionsIndicator = () => {
  logger.debug('UserOrgPositionsIndicator component rendered');
  
  const { user } = useAuth();
  const { currentCompany } = useMultiCompany();
  const [orgRoles, setOrgRoles] = useState<OrgRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserOrgRoles = async () => {
      if (!user?.id || !currentCompany?.id) {
        logger.debug('Missing user or company for role assignments fetch');
        setLoading(false);
        return;
      }

      try {
        logger.debug('Fetching role assignments for authenticated user');
        
        // First check if user has any role assignments at all
        const { data: allRoleAssignments, error: allError } = await supabase
          .from('role_assignments')
          .select('*')
          .eq('user_id', user.id);

        logger.debug('Role assignments query completed', { count: allRoleAssignments?.length || 0, hasError: !!allError });

        // Then get role assignments with org_roles data
        const { data: roleAssignments, error } = await supabase
          .from('role_assignments')
          .select(`
            role_id,
            org_role:org_roles!inner(
              id,
              title,
              responsibilities,
              company_id
            )
          `)
          .eq('user_id', user.id);

        logger.debug('Role assignments with org data retrieved', { count: roleAssignments?.length || 0, hasError: !!error });

        if (error) {
          logger.error('Error fetching org roles:', error);
          setOrgRoles([]);
          return;
        }

        if (!roleAssignments || roleAssignments.length === 0) {
          logger.debug('No role assignments found');
          setOrgRoles([]);
          return;
        }

        // Filter for roles in the current company
        const companyRoles = roleAssignments.filter(assignment => {
          const orgRole = Array.isArray(assignment.org_role) ? assignment.org_role[0] : assignment.org_role;
          return orgRole?.company_id === currentCompany?.id;
        });

        logger.debug('Company roles filtered', { count: companyRoles.length });

        const userRoles: OrgRole[] = companyRoles
          .map(assignment => {
            const orgRole = Array.isArray(assignment.org_role) 
              ? assignment.org_role[0] 
              : assignment.org_role;
            return orgRole;
          })
          .filter(role => role && role.id);

        logger.debug('User roles processed', { count: userRoles.length });
        setOrgRoles(userRoles);
      } catch (err) {
        logger.error('Error loading roles:', err);
        setOrgRoles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUserOrgRoles();
  }, [user?.id, currentCompany?.id]);

  if (loading) {
    return (
      <div className="inline-flex items-center justify-center animate-pulse">
        <Hand className="w-4 h-4 text-muted-foreground" />
      </div>
    );
  }

  if (orgRoles.length === 0) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="cursor-help">
              <Hand className="w-4 h-4 text-muted-foreground" />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-sm">No organizational position assigned</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const formatResponsibilities = (responsibilities: string | string[] | null | undefined): string[] => {
    if (!responsibilities) {
      return ['No specific responsibilities defined'];
    }
    
    // If it's already an array, return it
    if (Array.isArray(responsibilities)) {
      return responsibilities.length > 0 ? responsibilities : ['No specific responsibilities defined'];
    }
    
    // If it's a string, split by newlines and filter out empty strings
    const splitResponsibilities = responsibilities
      .split('\n')
      .map(r => r.trim())
      .filter(r => r.length > 0);
    
    return splitResponsibilities.length > 0 ? splitResponsibilities : ['No specific responsibilities defined'];
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="cursor-help">
            <Hand className="w-4 h-4 text-primary" />
          </div>
        </TooltipTrigger>
        <TooltipContent 
          side="bottom" 
          align="start"
          className="max-w-sm p-4 space-y-3 bg-popover border border-border shadow-lg rounded-lg"
        >
          <div className="flex items-center gap-2 border-b border-border pb-2">
            <UserCheck className="w-4 h-4 text-primary" />
            <h4 className="font-medium text-foreground">
              {orgRoles.length === 1 ? 'Your Position' : 'Your Positions'}
            </h4>
          </div>
          
          <div className="space-y-3">
            {orgRoles.map((role, index) => (
              <div key={role.id} className={`${index > 0 ? 'border-t border-border pt-3' : ''}`}>
                <h5 className="font-medium text-foreground text-sm">
                  {role.title}
                </h5>
                
                <div className="mt-2">
                  <p className="text-xs font-medium text-foreground mb-1">Key Responsibilities:</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {formatResponsibilities(role.responsibilities).map((responsibility, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-primary leading-none mt-0.5">•</span>
                        <span className="flex-1">{responsibility}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};