
import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useSimpleStrategy } from '@/contexts/SimpleStrategyContext';
import { Link } from 'lucide-react';
import { useLeadershipAccess } from '@/hooks/useLeadershipAccess';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { logger } from '@/utils/logger';

export const NicheSection: React.FC = () => {
  const { data, updateData, strategicPlan } = useSimpleStrategy();
  const { isLeadershipMember } = useLeadershipAccess();

  // Check if current niche matches leadership niche
  const getLeadershipNiche = () => {
    return strategicPlan?.leadership_reference?.marketing?.niche || '';
  };
  
  const normalize = (s?: string) => (s || '').trim().replace(/\s+/g, ' ').toLowerCase();
  
  const leadershipNiche = getLeadershipNiche();
  const nicheMatchesLeadership = !isLeadershipMember && 
    strategicPlan?.company_shared &&
    !!normalize((data as any)?.marketing?.niche) && 
    normalize((data as any)?.marketing?.niche) === normalize(leadershipNiche);

  const updateNiche = (value: string) => {
    logger.log('📝 NicheSection: Updating niche with value:', value);
    updateData({
      // Update both locations for backward compatibility
      niche: value,
      marketing: {
        ...(data as any).marketing,
        niche: value,
      },
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <Label className="text-base font-semibold">
            Niche
          </Label>
          {nicheMatchesLeadership && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Link className="h-3 w-3 text-primary dark:text-blue-400" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Matches leadership team niche</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          What specific market segment or niche do we serve?
        </p>
      </div>

      <div className="space-y-2">
        <Textarea
          value={(data as any)?.marketing?.niche || (data as any)?.niche || ''}
          onChange={(e) => updateNiche(e.target.value)}
          placeholder="Describe your specific market niche, focus area, or specialty..."
          autoResize
        />
      </div>
    </div>
  );
};
