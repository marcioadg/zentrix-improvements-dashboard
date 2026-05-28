import React, { useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useStrategyTeams } from '@/hooks/useStrategyTeams';
import { useQueryClient } from '@tanstack/react-query';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { useAuth } from '@/contexts/AuthContext';
import { fetchStrategicPlan } from '@/hooks/useSimpleStrategyPersistence';
import { Label } from '@/components/ui/label';
import { Building } from 'lucide-react';
import { logger } from '@/utils/logger';
interface TeamSelectorProps {
  selectedTeamId: string | null;
  onTeamChange: (teamId: string) => void;
}
export const TeamSelector: React.FC<TeamSelectorProps> = React.memo(({
  selectedTeamId,
  onTeamChange
}) => {
  const startTime = performance.now();
  const {
    teams,
    loading,
    error
  } = useStrategyTeams();
  
  const queryClient = useQueryClient();
  const { currentCompany } = useMultiCompanyAccess();
  const { user } = useAuth();
  
  // Prefetch strategy data for a team using ensureQueryData for better reliability
  const prefetchTeamData = async (teamId: string) => {
    if (!currentCompany?.id || !user?.id) return;
    
    try {
      await queryClient.ensureQueryData({
        queryKey: ['simple-strategic-plan', currentCompany?.id, teamId],
        queryFn: () => fetchStrategicPlan(currentCompany?.id, teamId, user.id),
        staleTime: 30000,
      });
    } catch (error) {
      logger.log('Prefetch failed for team:', teamId, error);
    }
  };
  
  // Prefetch the first few teams when dropdown opens
  const handleOpenChange = async (open: boolean) => {
    if (open && teams.length > 0) {
      // Prefetch data for first 3 teams (excluding current selection)
      const teamsToPrefetch = teams.slice(0, 3)
        .filter(team => team.id !== selectedTeamId);
      
      // Run prefetches in parallel
      await Promise.allSettled(
        teamsToPrefetch.map(team => prefetchTeamData(team.id))
      );
    }
  };

  // Memoize the teams list to prevent unnecessary re-renders
  const memoizedTeams = useMemo(() => teams, [teams]);
  if (loading) {
    const loadingTime = performance.now() - startTime;
    logger.log('🐌 TeamSelector: Still loading after', loadingTime, 'ms');
  } else {
    const totalTime = performance.now() - startTime;
    logger.log('✅ TeamSelector: Loaded', memoizedTeams.length, 'teams in', totalTime, 'ms');
  }
  logger.log('🔧 TeamSelector: Rendering with', memoizedTeams.length, 'teams, loading:', loading, 'error:', error);
  if (loading) {
    return <div className="space-y-2">
        <Label className="text-sm font-medium">Team</Label>
        <div className="h-10 bg-muted animate-pulse rounded-md" />
      </div>;
  }
  if (error) {
    return <div className="space-y-2">
        <Label className="text-sm font-medium">Team</Label>
        <div className="text-sm text-destructive py-2">
          Error loading teams: {error}
        </div>
      </div>;
  }
  if (memoizedTeams.length === 0) {
    return <div className="space-y-2">
        <Label className="text-sm font-medium">Team</Label>
        <div className="text-sm text-muted-foreground py-2">
          No teams available
        </div>
      </div>;
  }
  return <div className="space-y-2">
      
      <Select value={selectedTeamId || ''} onValueChange={onTeamChange} onOpenChange={handleOpenChange}>
        <SelectTrigger className="w-full min-w-[200px] bg-background border shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Select a team..." />
          </div>
        </SelectTrigger>
        <SelectContent className="z-50 bg-background border shadow-lg max-h-[300px] overflow-auto">
          {memoizedTeams.map(team => <SelectItem 
              key={team.id} 
              value={team.id} 
              className="cursor-pointer hover:bg-muted/50 focus:bg-muted"
              onMouseEnter={() => prefetchTeamData(team.id)}
            >
              <div className="flex flex-col items-start">
                <span className="font-medium">{team.name}</span>
                {team.description && <span className="text-xs text-muted-foreground">
                    {team.description}
                  </span>}
              </div>
            </SelectItem>)}
        </SelectContent>
      </Select>
    </div>;
});