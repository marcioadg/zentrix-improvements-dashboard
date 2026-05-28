import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Save, Loader2 } from 'lucide-react';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/utils/logger';

export const VoteLimitSettings: React.FC = () => {
  const { currentCompany, refreshCompanies } = useMultiCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  const [voteLimit, setVoteLimit] = useState(5);
  const [isUpdating, setIsUpdating] = useState(false);
  const [canEditCompany, setCanEditCompany] = useState(false);

  useEffect(() => {
    if (currentCompany?.default_vote_limit) {
      setVoteLimit(currentCompany?.default_vote_limit);
    }
  }, [currentCompany?.default_vote_limit]);

  useEffect(() => {
    checkEditPermissions();
  }, [user?.id, currentCompany?.id]);

  const checkEditPermissions = async () => {
    if (!user?.id || !currentCompany?.id) {
      setCanEditCompany(false);
      return;
    }

    try {
      // Check if user is company director/admin from company_members table
      const { data: membershipData } = await supabase
        .from('company_members')
        .select('permission_level')
        .eq('user_id', user.id)
        .eq('company_id', currentCompany?.id)
        .maybeSingle();

      // Check if user is super admin from profiles table
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      const isSuperAdmin = profileData?.role === 'super_admin';
      const hasCompanyEditPermission = membershipData && 
        ['director', 'admin', 'owner', 'super_admin'].includes(membershipData.permission_level);

      setCanEditCompany(isSuperAdmin || hasCompanyEditPermission);
    } catch (error) {
      logger.error('Error checking permissions:', error);
      setCanEditCompany(false);
    }
  };

  const handleUpdateVoteLimit = async () => {
    if (!canEditCompany || !currentCompany?.id || voteLimit < 3 || voteLimit > 100) {
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('companies')
        .update({ default_vote_limit: voteLimit })
        .eq('id', currentCompany?.id);

      if (error) {
        throw error;
      }

      toast({
        title: "Vote Limit Updated",
        description: `Default vote limit set to ${voteLimit} votes per meeting.`,
      });

      await refreshCompanies();
    } catch (error) {
      logger.error('Error updating vote limit:', error);
      toast({
        title: "Error",
        description: "Failed to update vote limit. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const hasChanges = voteLimit !== (currentCompany?.default_vote_limit || 5);

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div>
        <h2 className="text-lg font-medium">Voting</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Set the default number of votes each team member gets during meetings.
        </p>
      </div>

      <Separator />

      {canEditCompany && (
        <div className="space-y-3">
          <Label htmlFor="vote-limit" className="text-sm font-medium">Default votes per user per meeting</Label>
          <div className="flex gap-3 max-w-md">
            <Input
              id="vote-limit"
              type="number"
              min={3}
              max={100}
              value={voteLimit}
              onChange={(e) => setVoteLimit(parseInt(e.target.value) || 5)}
              disabled={isUpdating}
              className="h-9 w-24"
            />
            <Button 
              onClick={handleUpdateVoteLimit}
              disabled={!hasChanges || isUpdating || voteLimit < 3 || voteLimit > 100}
              size="sm"
              className="h-9 shrink-0"
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {isUpdating ? 'Updating...' : 'Update'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Between 3 and 100 votes. Current: {currentCompany?.default_vote_limit || 5}
          </p>
        </div>
      )}

      <div className="rounded-lg bg-muted/30 p-4 max-w-lg">
        <p className="text-sm font-medium mb-2">How voting works:</p>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Company default: <strong>{currentCompany?.default_vote_limit || 5} votes per meeting</strong></li>
          <li>• Meeting scribes can temporarily override this limit for specific meetings</li>
          <li>• Individual users cannot set custom vote limits</li>
          <li>• Votes are returned when issues are resolved or archived</li>
        </ul>
        {!canEditCompany && (
          <p className="text-xs text-muted-foreground mt-3 pt-2 border-t border-border">
            Only directors and admins can change the company vote limit
          </p>
        )}
      </div>
    </div>
  );
};