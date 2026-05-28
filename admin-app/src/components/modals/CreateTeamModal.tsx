
import React, { useState, useEffect } from 'react';
import { BaseModal } from './BaseModal';
import { Input } from '@/components/ui/input';

import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MemberSelector } from '@/components/shared/MemberSelector';
import { useCompanyUsers } from '@/hooks/useCompanyUsers';
import { Badge } from '@/components/ui/badge';
import { Users, Crown, Map } from 'lucide-react';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface CreateTeamModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateTeam: (name: string, memberIds?: string[], isLeadership?: boolean, hasStrategicPlan?: boolean) => Promise<void>;
}

export const CreateTeamModal: React.FC<CreateTeamModalProps> = ({
  open,
  onOpenChange,
  onCreateTeam,
}) => {
  const [teamName, setTeamName] = useState('');
  const [isLeadership, setIsLeadership] = useState(false);
  const [hasStrategicPlan, setHasStrategicPlan] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [existingLeadershipTeam, setExistingLeadershipTeam] = useState<{ id: string; name: string } | null>(null);
  const [checkingLeadership, setCheckingLeadership] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  // Auto-enable strategic plan when leadership is selected
  const effectiveHasStrategicPlan = isLeadership || hasStrategicPlan;
  const [loading, setLoading] = useState(false);
  const { users, loading: usersLoading } = useCompanyUsers();
  const { currentCompany } = useMultiCompanyAccess();

  // Check for existing leadership team when modal opens
  useEffect(() => {
    const checkExistingLeadershipTeam = async () => {
      if (!open || !currentCompany?.id) return;
      
      setCheckingLeadership(true);
      try {
        const { data: leadershipTeams, error } = await supabase
          .from('teams')
          .select('id, name')
          .eq('company_id', currentCompany?.id)
          .eq('is_leadership', true);
        
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
  }, [open, currentCompany?.id]);

  const handleSubmit = async () => {
    if (!teamName.trim()) {
      setAttemptedSubmit(true);
      return;
    }

    setLoading(true);
    try {
      logger.log('CreateTeamModal: Creating team with leadership flag:', {
        teamName: teamName.trim(),
        memberCount: selectedMembers.length,
        selectedMembers,
        isLeadership
      });
      
      await onCreateTeam(
        teamName.trim(), 
        selectedMembers.length > 0 ? selectedMembers : undefined,
        isLeadership,
        effectiveHasStrategicPlan
      );
      
      // Reset form state
      setTeamName('');
      setIsLeadership(false);
      setHasStrategicPlan(false);
      setSelectedMembers([]);
      setAttemptedSubmit(false);
      
      logger.log('CreateTeamModal: Team created successfully, form reset');
      // Modal closure is handled by parent component
    } catch (error) {
      logger.error('CreateTeamModal: Error creating team:', error);
      // Don't reset form on error, let user try again
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setTeamName('');
    setIsLeadership(false);
    setHasStrategicPlan(false);
    setSelectedMembers([]);
    setAttemptedSubmit(false);
    onOpenChange(false);
  };

  // Get selected member names for preview
  const selectedMemberNames = selectedMembers
    .map(id => users.find(user => user.id === id)?.full_name)
    .filter(Boolean);

  return (
    <BaseModal
      open={open}
      onOpenChange={onOpenChange}
      title="Create New Team"
      description="Create a new team and select initial members."
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      submitText="Create Team"
      submitDisabled={!teamName.trim() || loading}
      loading={loading}
      size="lg"
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="team-name" className={attemptedSubmit && !teamName.trim() ? 'text-destructive' : ''}>
            Team Name *
          </Label>
          <Input
            id="team-name"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="Enter team name"
            disabled={loading}
            className={attemptedSubmit && !teamName.trim() ? 'border-destructive focus-visible:ring-destructive/30' : ''}
          />
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={`flex items-center space-x-2 ${existingLeadershipTeam ? 'opacity-50' : ''}`}>
                <Checkbox
                  id="leadership-team"
                  checked={isLeadership}
                  onCheckedChange={(checked) => setIsLeadership(checked as boolean)}
                  disabled={loading || checkingLeadership || !!existingLeadershipTeam}
                />
                <Label 
                  htmlFor="leadership-team" 
                  className={`text-sm font-normal flex items-center gap-2 ${
                    existingLeadershipTeam 
                      ? 'cursor-not-allowed text-muted-foreground' 
                      : 'cursor-pointer'
                  }`}
                >
                  <Crown className={`h-4 w-4 ${
                    existingLeadershipTeam ? 'text-muted-foreground' : 'text-warning'
                  }`} />
                  Mark as Leadership Team
                </Label>
              </div>
            </TooltipTrigger>
            {existingLeadershipTeam && (
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
             id="strategic-plan"
             checked={effectiveHasStrategicPlan}
             onCheckedChange={(checked) => !isLeadership && setHasStrategicPlan(checked as boolean)}
             disabled={loading || isLeadership}
           />
           <Label 
             htmlFor="strategic-plan" 
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

        <MemberSelector
          members={users}
          selectedMembers={selectedMembers}
          onSelectionChange={setSelectedMembers}
          loading={usersLoading}
        />

        {selectedMembers.length > 0 && (
          <div className="p-2 bg-muted/30 rounded-md border border-muted">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs font-medium">
                Team Members Preview ({selectedMembers.length})
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {selectedMemberNames.map((name, index) => (
                <Badge key={index} variant="secondary" className="text-xs px-2 py-0">
                  {name}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              These members will be automatically assigned to the team and their profiles will be updated.
            </p>
          </div>
        )}
      </div>
    </BaseModal>
  );
};
