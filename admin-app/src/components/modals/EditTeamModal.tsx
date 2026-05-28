
import React, { useState, useEffect } from 'react';
import { BaseModal } from './BaseModal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Team } from '@/hooks/useTeamManagement';
import { Crown, Map } from 'lucide-react';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface EditTeamModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: Team | null;
  onUpdateTeam: (teamId: string, updates: { name?: string; is_leadership?: boolean; has_strategic_plan?: boolean }) => Promise<void>;
}

export const EditTeamModal: React.FC<EditTeamModalProps> = ({
  open,
  onOpenChange,
  team,
  onUpdateTeam,
}) => {
  const [teamName, setTeamName] = useState('');
  const [isLeadership, setIsLeadership] = useState(false);
  const [hasStrategicPlan, setHasStrategicPlan] = useState(false);
  const [existingLeadershipTeam, setExistingLeadershipTeam] = useState<{ id: string; name: string } | null>(null);
  const [checkingLeadership, setCheckingLeadership] = useState(false);

  // Auto-enable strategic plan when leadership is selected
  const effectiveHasStrategicPlan = isLeadership || hasStrategicPlan;
  const [loading, setLoading] = useState(false);
  const { currentCompany } = useMultiCompanyAccess();

  // Check for existing leadership team when modal opens
  useEffect(() => {
    const checkExistingLeadershipTeam = async () => {
      if (!open || !currentCompany?.id || !team) return;
      
      setCheckingLeadership(true);
      try {
        const { data: leadershipTeams, error } = await supabase
          .from('teams')
          .select('id, name')
          .eq('company_id', currentCompany?.id)
          .eq('is_leadership', true)
          .neq('id', team.id); // Exclude current team
        
        if (error) throw error;
        
        setExistingLeadershipTeam(leadershipTeams?.length > 0 ? leadershipTeams[0] : null);
      } catch (error) {
        logger.error('Error checking existing leadership team:', error);
        setExistingLeadershipTeam(null);
      } finally {
        setCheckingLeadership(false);
      }
    };

    checkExistingLeadershipTeam();
  }, [open, currentCompany?.id, team?.id]);

  useEffect(() => {
    if (team && open) {
      setTeamName(team.name);
      setIsLeadership(team.is_leadership || false);
      setHasStrategicPlan(team.has_strategic_plan || false);
    }
  }, [team, open]);

  const handleSubmit = async () => {
    if (!team || !teamName.trim()) return;

    setLoading(true);
    try {
      const updates: { name?: string; is_leadership?: boolean; has_strategic_plan?: boolean } = {};
      if (teamName !== team.name) updates.name = teamName.trim();
      if (isLeadership !== (team.is_leadership || false)) updates.is_leadership = isLeadership;
      if (effectiveHasStrategicPlan !== (team.has_strategic_plan || false)) updates.has_strategic_plan = effectiveHasStrategicPlan;

      await onUpdateTeam(team.id, updates);
      onOpenChange(false);
    } catch (error) {
      logger.error('Error updating team:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (team) {
      setTeamName(team.name);
      setIsLeadership(team.is_leadership || false);
      setHasStrategicPlan(team.has_strategic_plan || false);
    }
    onOpenChange(false);
  };

  if (!team) return null;

  return (
    <BaseModal
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Team"
      description="Update team details and manage members."
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      submitText="Update Team"
      submitDisabled={!teamName.trim() || loading}
      loading={loading}
    >
      <div className="space-y-6">
        <div>
          <Label htmlFor="edit-team-name">Team Name *</Label>
          <Input
            id="edit-team-name"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="Enter team name"
            disabled={loading}
          />
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={`flex items-center space-x-2 ${existingLeadershipTeam && !isLeadership ? 'opacity-50' : ''}`}>
                <Checkbox
                  id="leadership-team"
                  checked={isLeadership}
                  onCheckedChange={(checked) => setIsLeadership(checked as boolean)}
                  disabled={loading || checkingLeadership || (existingLeadershipTeam && !isLeadership)}
                />
                <Label 
                  htmlFor="leadership-team" 
                  className={`text-sm font-normal flex items-center gap-2 ${
                    existingLeadershipTeam && !isLeadership 
                      ? 'cursor-not-allowed text-muted-foreground' 
                      : 'cursor-pointer'
                  }`}
                >
                  <Crown className={`h-4 w-4 ${
                    existingLeadershipTeam && !isLeadership ? 'text-muted-foreground' : 'text-warning'
                  }`} />
                  Mark as Leadership Team
                </Label>
              </div>
            </TooltipTrigger>
            {existingLeadershipTeam && !isLeadership && (
              <TooltipContent>
                <p>Only one leadership team is allowed per company. "{existingLeadershipTeam.name}" is already the leadership team.</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>

         {isLeadership && (
           <div className="p-3 bg-warning/5 border border-yellow-200 rounded-lg">
             <p className="text-sm text-yellow-800">
               <strong>Note:</strong> Only members of the leadership team can view and manage company goals. 
               If another team is currently marked as leadership, it will be unmarked automatically.
             </p>
           </div>
         )}

         <div className="flex items-center space-x-2">
           <Checkbox
             id="strategic-plan-edit"
             checked={effectiveHasStrategicPlan}
             onCheckedChange={(checked) => !isLeadership && setHasStrategicPlan(checked as boolean)}
             disabled={loading || isLeadership}
           />
           <Label 
             htmlFor="strategic-plan-edit" 
             className="text-sm font-normal cursor-pointer flex items-center gap-2"
           >
             <Map className="h-4 w-4 text-primary" />
             Has its own strategic plan
           </Label>
         </div>
         
         {effectiveHasStrategicPlan && (
           <div className="p-3 bg-primary/5 border border-blue-200 rounded-lg">
             <p className="text-sm text-blue-800">
               <strong>Note:</strong> This team will appear in strategic planning tools and can create its own strategic plans.
               {isLeadership && " Leadership teams automatically have their own strategic plan."}
             </p>
           </div>
          )}
      </div>
    </BaseModal>
  );
};
