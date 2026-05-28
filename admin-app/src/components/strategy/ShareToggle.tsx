import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Globe, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { StrategicPlanSharingService } from '@/services/strategicPlanSharingService';
import { useQueryClient } from '@tanstack/react-query';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { logger } from '@/utils/logger';

interface ShareToggleProps {
  planId?: string;
  isShared: boolean;
  onToggle: (shared: boolean) => void;
  disabled?: boolean;
}

export const ShareToggle: React.FC<ShareToggleProps> = ({
  planId,
  isShared,
  onToggle,
  disabled = false
}) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentCompany } = useMultiCompanyAccess();

  // Load sharing status from database when planId is provided
  useEffect(() => {
    const loadSharingStatus = async () => {
      if (planId && isShared === false) { // Only load if we don't already have the status
        try {
          const status = await StrategicPlanSharingService.getPlanSharingStatus(planId);
          if (status !== isShared) {
            onToggle(status);
          }
        } catch (error) {
          logger.error('Error loading sharing status:', error);
        }
      }
    };
    
    loadSharingStatus();
  }, [planId]);

  const handleToggle = async (checked: boolean) => {
    if (!planId) {
      // Fallback to parent handler if no planId (for backward compatibility)
      onToggle(checked);
      return;
    }

    setLoading(true);
    try {
      await StrategicPlanSharingService.updatePlanSharing(planId, checked);
      onToggle(checked);

      toast({
        title: "Sharing Updated",
        description: checked
          ? "Strategic plan is now shared with the company"
          : "Strategic plan is now private to the team",
      });

      // Invalidate all strategic plan queries for this company so all teams update immediately
      if (currentCompany?.id) {
        logger.log('🔄 Invalidating strategic plan queries for company:', currentCompany?.id);
        await queryClient.invalidateQueries({ queryKey: ['simple-strategic-plan', currentCompany?.id] });
      } else {
        await queryClient.invalidateQueries({ queryKey: ['simple-strategic-plan'] });
      }
    } catch (error) {
      logger.error('Error updating sharing:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update sharing settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <div className="flex items-center gap-2">
        {isShared ? (
          <Globe className="h-4 w-4 text-muted-foreground" />
        ) : (
          <Lock className="h-4 w-4 text-muted-foreground" />
        )}
        <Label 
          htmlFor="share-toggle" 
          className="text-sm font-normal cursor-pointer"
        >
          Share with company
        </Label>
      </div>
      <Switch
        id="share-toggle"
        checked={isShared}
        onCheckedChange={handleToggle}
        disabled={disabled || loading}
      />
    </div>
  );
};