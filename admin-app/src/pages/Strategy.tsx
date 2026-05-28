import React, { useState, useEffect, useTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { StrategyTab } from '@/components/strategy/StrategyTab';
import { ExecutionTab } from '@/components/strategy/ExecutionTab';
import { SwotTab } from '@/components/strategy/SwotTab';
import { SimpleStrategyProvider, useSimpleStrategy } from '@/contexts/SimpleStrategyContext';
import { supabase } from '@/integrations/supabase/client';
import { ExportButton } from '@/components/strategy/ExportButton';
import { SimpleSaveStatusIndicator } from '@/components/strategy/SimpleSaveStatusIndicator';
import { TeamSelector } from '@/components/strategy/TeamSelector';
import { ShareToggle } from '@/components/strategy/ShareToggle';
import { useStrategyTeams } from '@/hooks/useStrategyTeams';
import { StrategyPageSkeleton } from '@/components/strategy/StrategyPageSkeleton';
import { useLeadershipAccess } from '@/hooks/useLeadershipAccess';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { safeStorage } from '@/utils/safeStorage';
import { useTeamStrategicFlags } from '@/hooks/useTeamStrategicFlags';
import { VersionHistory } from '@/components/strategy/VersionHistory';
import { fetchStrategicPlan } from '@/hooks/useSimpleStrategyPersistence';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Save, RotateCcw, Loader2, Building, RefreshCw, MoreHorizontal } from 'lucide-react';
import { format } from 'date-fns';
import { logger } from '@/utils/logger';

// Extract the content component to have access to both team state and strategy context
const StrategyContentWithTeam = ({ selectedTeamId, setSelectedTeamId, previewVersion, setPreviewVersion, isSwitchingTeam, initialTab = 'strategy', hideStrategyAndSwot = false }: {
  selectedTeamId: string | null;
  setSelectedTeamId: (teamId: string) => void;
  previewVersion: any;
  setPreviewVersion: (version: any) => void;
  isSwitchingTeam: boolean;
  initialTab?: 'strategy' | 'execution' | 'swot';
  hideStrategyAndSwot?: boolean;
}) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isSharedWithCompany, setIsSharedWithCompany] = useState(false);
  const [isSavingVersion, setIsSavingVersion] = useState(false);
  
  const { saveStatus, manualSave, isLoading, isFetching, strategicPlan, versions, restoreVersion, createManualVersion, isHydrated } = useSimpleStrategy();
  const { isLeadershipMember: isLeadershipTeamMember } = useLeadershipAccess(selectedTeamId || undefined);
  const { currentCompany } = useMultiCompany();
  const { user } = useAuth();
  const { isLeadershipTeam, hasStrategicPlan } = useTeamStrategicFlags(selectedTeamId || undefined);

  // Check company_members.permission_level to determine edit access.
  // Only manager, director, admin, owner, and super_admin can edit strategy.
  const [permissionLevel, setPermissionLevel] = useState<string | null>(null);
  useEffect(() => {
    const fetchPermission = async () => {
      if (!user?.id || !currentCompany?.id) {
        setPermissionLevel(null);
        return;
      }
      const { data } = await supabase
        .from('company_members')
        .select('permission_level')
        .eq('user_id', user.id)
        .eq('company_id', currentCompany.id)
        .eq('status', 'active')
        .maybeSingle();
      setPermissionLevel(data?.permission_level || null);
    };
    fetchPermission();
  }, [user?.id, currentCompany?.id]);

  const EDIT_ROLES = ['manager', 'director', 'admin', 'owner', 'super_admin'];
  const isLeadershipMember = isLeadershipTeamMember && EDIT_ROLES.includes(permissionLevel || '');

  // Load sharing status when team changes
  useEffect(() => {
    if (strategicPlan?.company_shared !== undefined) {
      setIsSharedWithCompany(strategicPlan.company_shared);
    }
  }, [strategicPlan]);

  const handleShareToggle = (shared: boolean) => {
    setIsSharedWithCompany(shared);
  };

  const handleSaveVersion = async () => {
    if (!strategicPlan?.id) return;
    
    setIsSavingVersion(true);
    
    // First ensure all current data is saved
    await manualSave();
    
    // Then create the version snapshot
    const result = await createManualVersion();
    setIsSavingVersion(false);
    
    if (!result.success) {
      logger.error('Failed to save version:', result.error);
    }
  };

  const handleViewInline = (version: any) => {
    setPreviewVersion(version);
  };

  const handleReturnToLive = () => {
    setPreviewVersion(null);
  };

  const handleRestoreFromPreview = async () => {
    if (previewVersion) {
      await restoreVersion(previewVersion.id);
      setPreviewVersion(null);
    }
  };

  const isPreviewing = !!previewVersion;


  return (
    <div className="h-full flex flex-col relative px-6 py-6">
      {/* Preview banner */}
      {previewVersion && (
        <div className="bg-muted/50 border border-border rounded-[6px] p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Viewing Manual Snapshot — Version {versions ? versions.length - (versions.findIndex(v => v.id === previewVersion.id) || 0) : 1}
                </p>
                <p className="text-xs text-muted-foreground">
                  From {format(new Date(previewVersion.created_at), 'MMM d, yyyy h:mm a')} • Read-only
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRestoreFromPreview}
                className="h-8 px-3"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Restore this version
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReturnToLive}
                className="h-8 px-3"
              >
                Return to live
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Simplified header */}
      <div className="flex items-start justify-between border-b border-border pb-4 mb-6">
        <div>
          <h1 className="text-[20px] font-semibold text-foreground tracking-tight">Strategic Plan</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Define your strategic foundation, execution plan, and SWOT analysis</p>
        </div>
        
        <div className="flex items-center gap-2">
          <TeamSelector 
            selectedTeamId={selectedTeamId}
            onTeamChange={setSelectedTeamId}
          />
          {isFetching && !isSwitchingTeam && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {isLeadershipTeam && isLeadershipMember && (
            <ShareToggle
              planId={strategicPlan?.id}
              isShared={isSharedWithCompany}
              onToggle={handleShareToggle}
              disabled={!selectedTeamId}
            />
          )}
          {!isPreviewing && (
            <SimpleSaveStatusIndicator 
              status={saveStatus} 
              onManualSave={manualSave}
            />
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" aria-label="More actions">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {strategicPlan?.id && !isPreviewing && (
                <DropdownMenuItem
                  onClick={handleSaveVersion}
                  disabled={isSavingVersion}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSavingVersion ? 'Saving...' : 'Create Snapshot'}
                </DropdownMenuItem>
              )}
              {versions && versions.length > 0 && (
                <VersionHistory 
                  versions={versions} 
                  onRestoreVersion={restoreVersion}
                  onViewInline={handleViewInline}
                  isLoading={saveStatus === 'saving'}
                />
              )}
              <DropdownMenuSeparator />
              <div className="px-1 py-1">
                <ExportButton />
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Linear-style tab navigation */}
      {!hideStrategyAndSwot && (
        <div className="sticky top-0 bg-background z-10 flex items-center border-b border-border mb-6">
          <div className="flex">
            <button
              onClick={() => setActiveTab('strategy')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${
                activeTab === 'strategy'
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              Strategy
            </button>
            <button
              onClick={() => setActiveTab('execution')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${
                activeTab === 'execution'
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              Execution
            </button>
            <button
              onClick={() => setActiveTab('swot')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${
                activeTab === 'swot'
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              SWOT
            </button>
          </div>
        </div>
      )}

      {/* Content area with optimistic loading */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'strategy' && (
          <StrategyTab 
            selectedTeamId={selectedTeamId}
            isLeadershipMember={isLeadershipMember}
            hasStrategicPlan={hasStrategicPlan}
            isLeadershipTeam={isLeadershipTeam}
          />
        )}
        {activeTab === 'execution' && (
          <ExecutionTab 
            selectedTeamId={selectedTeamId}
            isLeadershipMember={isLeadershipMember}
            hasStrategicPlan={hasStrategicPlan}
            isLeadershipTeam={isLeadershipTeam}
          />
        )}
        {activeTab === 'swot' && (
          <SwotTab 
            selectedTeamId={selectedTeamId}
            isLeadershipMember={isLeadershipMember}
            hasStrategicPlan={hasStrategicPlan}
            isLeadershipTeam={isLeadershipTeam}
          />
        )}
      </div>
    </div>
  );
};

export const Strategy = ({ initialTab, hideStrategyAndSwot = false }: { initialTab?: 'strategy' | 'execution' | 'swot'; hideStrategyAndSwot?: boolean } = {}) => {
  const navigate = useNavigate();
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [previewVersion, setPreviewVersion] = useState<any>(null);
  const [isSwitchingTeam, setIsSwitchingTeam] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [showVersionBanner, setShowVersionBanner] = useState(false);
  const { teams, loading: teamsLoading } = useStrategyTeams();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { currentCompany } = useMultiCompanyAccess();

  // Version check
  useEffect(() => {
    const checkVersion = async () => {
      const { data } = await supabase
        .from('system_settings')
        .select('system_version')
        .eq('setting_key', 'app_version')
        .single();
      
      if (data?.system_version && data.system_version !== "1.2") {
        setShowVersionBanner(true);
      }
    };
    checkVersion();
  }, []);

  // Auto-select team based on database preference or first available team
  useEffect(() => {
    if (teams.length > 0 && !selectedTeamId) {
      logger.log('🎯 Strategy: Auto-selecting team from', teams.length, 'available teams with strategic plans');
      
      const loadTeamPreference = async () => {
        try {
          // Try to get last selected team from database
          const { data: preference } = await supabase.rpc('get_user_strategy_team_preference');
          
          if (preference && teams.find(t => t.id === preference)) {
            logger.log('✅ Strategy: Using database preference:', preference);
            setSelectedTeamId(preference);
          } else {
            // Fallback to localStorage for backward compatibility
            const lastSelectedTeam = safeStorage.getItem('strategy-selected-team');
            
            if (lastSelectedTeam && teams.find(t => t.id === lastSelectedTeam)) {
              logger.log('✅ Strategy: Using localStorage preference:', lastSelectedTeam);
              setSelectedTeamId(lastSelectedTeam);
              // Save to database for future use
              await supabase.rpc('update_user_strategy_team_preference', { p_team_id: lastSelectedTeam });
              // Clear localStorage since we're now using database
              safeStorage.removeItem('strategy-selected-team');
            } else {
              // Select first available team
              const firstTeam = teams[0];
              logger.log('✅ Strategy: Auto-selecting first team:', firstTeam.name, firstTeam.id);
              setSelectedTeamId(firstTeam.id);
              // Save the default selection to database
              try {
                await supabase.rpc('update_user_strategy_team_preference', { p_team_id: firstTeam.id });
              } catch (saveError) {
                logger.error('Error saving team preference:', saveError);
              }
            }
          }
        } catch (error) {
          logger.error('Error loading team preference:', error);
          // Fallback to first team if database fails
          if (teams.length > 0) {
            logger.log('🔄 Strategy: Fallback to first team due to error:', teams[0].name);
            setSelectedTeamId(teams[0].id);
          }
        }
      };
      
      loadTeamPreference();
    }
  }, [teams, selectedTeamId]);

  // Simplified team switching - let data hooks handle the loading
  const handleTeamChange = (teamId: string) => {
    if (teamId === selectedTeamId) return;
    
    // Clear preview when switching teams
    setPreviewVersion(null);
    
    // Update team selection immediately
    setSelectedTeamId(teamId);
    
    // Save preference asynchronously (fire-and-forget)
    (async () => {
      try {
        await supabase.rpc('update_user_strategy_team_preference', { p_team_id: teamId });
      } catch {
        // Fallback to localStorage if database fails
        safeStorage.setItem('strategy-selected-team', teamId);
      }
    })();
  };
  // Show skeleton while loading teams
  if (teamsLoading) {
    return <StrategyPageSkeleton />;
  }

  // Show empty state when no strategy teams are available
  if (teams.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="max-w-md text-center space-y-4">
          <div className="rounded-full bg-muted/50 w-16 h-16 flex items-center justify-center mx-auto">
            <Building className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">No Strategic Teams Available</h3>
            <p className="text-sm text-muted-foreground">
              To access strategic planning, you need teams with the "Has its own strategic plan" option enabled.
            </p>
          </div>
          <Button 
            onClick={() => navigate('/people#teams')}
            className="mt-4"
          >
            Manage Teams
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Version Banner - Small Popup */}
      {showVersionBanner && (
        <div className="fixed top-4 right-4 z-50 bg-card border border-border rounded-[6px] shadow-sm p-4 max-w-sm animate-in slide-in-from-top-2">
          <div className="flex items-start gap-3">
            <RefreshCw className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <p className="text-[13px] font-medium text-foreground">
                New version available
              </p>
              <p className="text-[11px] text-muted-foreground">
                Please refresh to get the latest updates.
              </p>
              <Button 
                onClick={() => window.location.reload()}
                size="sm"
                className="w-full"
              >
                Refresh Now
              </Button>
            </div>
          </div>
        </div>
      )}
      
      <SimpleStrategyProvider 
        teamId={selectedTeamId}
        previewActive={!!previewVersion}
        previewData={previewVersion?.plan_data}
      >
        <StrategyContentWithTeam
          selectedTeamId={selectedTeamId}
          setSelectedTeamId={handleTeamChange}
          previewVersion={previewVersion}
          setPreviewVersion={setPreviewVersion}
          isSwitchingTeam={isSwitchingTeam || isPending}
          initialTab={initialTab}
          hideStrategyAndSwot={hideStrategyAndSwot}
        />
      </SimpleStrategyProvider>
    </>
  );
};

export default Strategy;