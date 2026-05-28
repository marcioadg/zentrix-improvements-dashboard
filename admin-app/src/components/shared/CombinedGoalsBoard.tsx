import React, { useMemo, useRef, useState, useCallback, Suspense } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Building2, Target, Archive, Loader2, AlertTriangle } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  rectIntersection,
  getFirstCollision,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  CollisionDetection,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { useCompanyGoals } from '@/hooks/useCompanyGoals';
import { useTeamGoals, TeamGoal } from '@/hooks/useTeamGoals';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useProfilesByIds } from '@/hooks/useProfilesByIds';
import { useLeadershipAccess } from '@/hooks/useLeadershipAccess';
import { useLoadingDelay } from '@/hooks/useLoadingDelay';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useOptimisticOwnership } from '@/hooks/useOptimisticOwnership';
import { useGlobalReorderLock } from '@/hooks/useGlobalReorderLock';
import { useBulkArchiveGoals } from '@/hooks/useBulkArchiveGoals';
import { useBulkCreateIssuesForGoals } from '@/hooks/useBulkCreateIssuesForGoals';
import { CreateIssuesConfirmDialog } from '@/components/modals/CreateIssuesConfirmDialog';
import { celebrate } from '@/lib/celebration';
import { DraggableCompanyGoalItem } from '@/components/dashboard/goals/DraggableCompanyGoalItem';
import { DraggableGoalItem } from '@/components/dashboard/goals/DraggableGoalItem';
import { CompanyGoalItem } from '@/components/dashboard/goals/CompanyGoalItem';
import { GoalItem } from '@/components/dashboard/goals/GoalItem';
import { UserAvatar } from '@/components/UserAvatar';
import { AddGoalItem } from '@/components/dashboard/goals/AddGoalItem';
import { GoalsCardSkeleton } from '@/components/skeletons/GoalsCardSkeleton';
import { Button } from '@/components/ui/button';
import { logger } from '@/utils/logger';
import { useGoalReorderBroadcast } from '@/hooks/meeting/useGoalReorderBroadcast';

// Lazy load EditGoalModal for better performance
const EditGoalModal = React.lazy(() => 
  import('@/components/modals/EditGoalModal').then(module => ({ default: module.EditGoalModal }))
);

// ============================================================================
// EXTRACTED DROP CONTAINERS - Defined at module scope to prevent remounting
// during frequent re-renders (e.g., meeting timer updates every second)
// ============================================================================

// Background drop container to ensure continuous drop zone coverage
const BackgroundDropContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { setNodeRef } = useDroppable({ 
    id: 'background-drop-zone', 
    data: { type: 'background_container' } 
  });
  
  return (
    <div ref={setNodeRef} className="min-h-full">
      {children}
    </div>
  );
};

// Company drop container registered inside DndContext
interface CompanyDropContainerProps {
  children: React.ReactNode;
  baseClassName?: string;
  activeClassName?: string;
  overClassName?: string;
  activeId: string | null;
}

const CompanyDropContainer: React.FC<CompanyDropContainerProps> = ({ 
  children, 
  baseClassName = '', 
  activeClassName = '', 
  overClassName = '',
  activeId 
}) => {
  const { setNodeRef, isOver } = useDroppable({ 
    id: 'company-goals-container', 
    data: { type: 'company_container' } 
  });
  const isDragging = !!activeId;
  const className = isOver
    ? overClassName || baseClassName
    : isDragging
      ? activeClassName || baseClassName
      : baseClassName;

  return (
    <div ref={setNodeRef} className={className}>
      {children}
    </div>
  );
};

// Person drop container with visual feedback for drag-and-drop
interface PersonDropContainerProps {
  personId: string;
  children: React.ReactNode;
  activeId: string | null;
  activeGoal: TeamGoal | null;
}

const PersonDropContainer: React.FC<PersonDropContainerProps> = ({ 
  personId, 
  children, 
  activeId, 
  activeGoal 
}) => {
  const { setNodeRef, isOver } = useDroppable({ 
    id: `person-${personId}`, 
    data: { type: 'person_container', personId } 
  });
  
  const isDragging = !!activeId;
  const isHovering = isOver && isDragging;
  const canAcceptDrop = isDragging && activeGoal && (activeGoal.is_company_goal || activeGoal.owner_id !== personId);
  
  return (
    <div
      ref={setNodeRef}
      className={`relative rounded-[6px] transition-all duration-300 ease-out transform ${
        isHovering && canAcceptDrop
          ? 'border border-primary/70 bg-primary/8 shadow-lg ring-2 ring-primary/40 scale-[1.02] p-4'
          : isDragging && canAcceptDrop
            ? 'border border-primary/40 bg-primary/4 shadow-md p-4'
            : ''
      }`}
    >
      {children}
    </div>
  );
};

// ============================================================================

interface CombinedGoalsBoardProps {
  teams: any[];
  teamId: string;
  isInitialLoad?: boolean;
  showBulkActions?: boolean;
  showArchived?: boolean;
  hideEmptyUsers?: boolean;
  hideCompanyGoals?: boolean;
}

const CombinedGoalsBoardComponent: React.FC<CombinedGoalsBoardProps> = ({ teams: rawTeams, teamId, isInitialLoad = false, showBulkActions = false, showArchived = false, hideEmptyUsers = false, hideCompanyGoals = false }) => {
  // Defensive: ensure teams is always a valid array
  const teams = Array.isArray(rawTeams) ? rawTeams : [];
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const { members, loading: membersLoading } = useTeamMembers(teamId);
  const { isLeadershipMember, loading: leadershipLoading } = useLeadershipAccess(teamId);
  const {
    addOptimisticChange,
    confirmOptimisticChange,
    rollbackOptimisticChange,
    getOptimisticOwner
  } = useOptimisticOwnership();
  const { setGlobalReordering } = useGlobalReorderLock();

  // Get current team name for debugging
  const currentTeam = teams.find(t => t.id === teamId);
  logger.debug('🔍 CombinedGoalsBoard: Current team and members:', { 
    teamId, 
    teamName: currentTeam?.name,
    membersCount: members.length,
    memberDetails: members.map(m => ({ 
      id: m.user_id, 
      name: m.profiles?.full_name, 
      email: m.profiles?.email
    }))
  });

  const {
    goals: companyGoals,
    setGoals: setCompanyGoals,
    reorderCompanyGoals,
    updateGoal: updateCompanyGoal,
    updateGoalProgress: updateCompanyGoalProgress,
    refetch: refetchCompanyGoals,
    loading: loadingCompany,
    archiveGoal: archiveCompanyGoal,
    unarchiveGoal: unarchiveCompanyGoal,
    deleteGoal: deleteCompanyGoal,
    setOptimisticUpdating: setCompanyOptimisticUpdating,
  } = useCompanyGoals(teams, undefined, undefined, showArchived);

  const {
    goals: teamGoals,
    setGoals: setTeamGoals,
    reorderGoals,
    updateGoal: updateTeamGoal,
    updateGoalProgress: updateTeamGoalProgress,
    addGoal,
    loading: loadingTeam,
    refetch: refetchTeamGoals,
    archiveGoal: archiveTeamGoal,
    unarchiveGoal: unarchiveTeamGoal,
    deleteGoal: deleteTeamGoal,
    setOptimisticUpdating, // ARCHITECTURAL FIX: Get optimistic state control
  } = useTeamGoals(teamId, showArchived);

  // Handle remote goal reordering from other meeting participants
  const handleRemoteReorder = useCallback((goalIds: string[], isCompanyGoals: boolean) => {
    logger.log('🔄 [REMOTE REORDER] Applying remote reorder:', { goalIds, isCompanyGoals });
    
    if (isCompanyGoals) {
      setCompanyGoals(prev => {
        // Update only affected goals' display_order, keep all others unchanged
        return prev.map(goal => {
          const newIndex = goalIds.indexOf(goal.id);
          if (newIndex !== -1) {
            return { ...goal, display_order: newIndex + 1 };
          }
          return goal;
        });
      });
    } else {
      setTeamGoals(prev => {
        // Update only affected goals' display_order, keep all others unchanged
        return prev.map(goal => {
          const newIndex = goalIds.indexOf(goal.id);
          if (newIndex !== -1) {
            return { ...goal, display_order: newIndex + 1 };
          }
          return goal;
        });
      });
    }
  }, [setCompanyGoals, setTeamGoals]);

  // Handle remote goal owner changes from other meeting participants
  const handleRemoteOwnerChange = useCallback((payload: {
    goalId: string;
    previousOwnerId: string | null;
    newOwnerId: string | null;
    isCompanyGoal: boolean;
    displayOrder?: number;
    goal?: any; // Full goal data for cross-section transfers
  }) => {
    logger.log('🔄 [REMOTE OWNER CHANGE] Applying remote owner change:', payload);
    const { goalId, previousOwnerId, newOwnerId, isCompanyGoal, displayOrder, goal } = payload;

    if (isCompanyGoal) {
      // Check if this is just an owner change on a company goal (previousOwnerId is not null)
      if (previousOwnerId !== null && newOwnerId !== null) {
        // Owner changed but goal stays as company goal - just update the owner_id
        setCompanyGoals(prev => prev.map(g => 
          g.id === goalId ? { ...g, owner_id: newOwnerId } : g
        ));
        return;
      }
      
      // Goal became a company goal - remove from team goals, add to company goals
      setTeamGoals(prev => prev.filter(g => g.id !== goalId));
      setCompanyGoals(prev => {
        // Check if already exists in company goals
        const exists = prev.find(g => g.id === goalId);
        if (exists) {
          return prev.map(g => g.id === goalId 
            ? { ...g, is_company_goal: true, display_order: displayOrder || g.display_order }
            : g
          );
        }
        // Add goal using broadcast data if provided (fixes instant sync for team→company transfers)
        if (goal) {
          const typedGoal: TeamGoal = { 
            ...goal, 
            is_company_goal: true, 
            display_order: displayOrder || goal.display_order,
            status: goal.status as 'on_track' | 'off_track' | 'complete' | 'canceled'
          };
          return [...prev, typedGoal];
        }
        return prev;
      });
    } else {
      // Goal became a team goal or changed owner
      if (previousOwnerId === null) {
        // Was a company goal, now team goal - remove from company goals
        setCompanyGoals(prev => prev.filter(g => g.id !== goalId));
      }
      
      // Update or add in team goals with new owner
      setTeamGoals(prev => {
        const existingGoal = prev.find(g => g.id === goalId);
        if (existingGoal) {
          return prev.map(g => g.id === goalId
            ? { ...g, owner_id: newOwnerId!, is_company_goal: false, display_order: displayOrder || g.display_order }
            : g
          );
        }
        // Add goal using broadcast data if provided (fixes instant sync for company→team transfers)
        if (goal) {
          const typedGoal: TeamGoal = { 
            ...goal, 
            owner_id: newOwnerId!, 
            is_company_goal: false,
            status: goal.status as 'on_track' | 'off_track' | 'complete' | 'canceled'
          };
          return [...prev, typedGoal];
        }
        return prev;
      });
    }
  }, [setTeamGoals, setCompanyGoals]);

  // Handle remote goal creation from other meeting participants
  const handleRemoteGoalCreated = useCallback((goal: {
    id: string;
    title: string;
    description?: string;
    status: string;
    target_date?: string;
    team_id: string;
    owner_id: string;
    is_company_goal: boolean;
    display_order: number;
    archived: boolean;
    created_at: string;
    updated_at: string;
  }) => {
    logger.log('🔄 [REMOTE GOAL CREATED] Processing remote goal creation:', goal);
    
    // Type-cast the goal to match TeamGoal interface
    const typedGoal: TeamGoal = {
      ...goal,
      status: goal.status as 'on_track' | 'off_track' | 'complete' | 'canceled',
    };
    
    // Check for duplicates before adding
    if (goal.is_company_goal) {
      setCompanyGoals(prev => {
        if (prev.some(g => g.id === goal.id)) {
          logger.log('⚠️ Goal already exists in company goals, skipping');
          return prev;
        }
        return [...prev, typedGoal];
      });
    } else {
      setTeamGoals(prev => {
        if (prev.some(g => g.id === goal.id)) {
          logger.log('⚠️ Goal already exists in team goals, skipping');
          return prev;
        }
        return [...prev, typedGoal];
      });
    }
  }, [setTeamGoals, setCompanyGoals]);

  // Handle remote goal archiving from other meeting participants
  const handleRemoteGoalArchived = useCallback((goalId: string, isCompanyGoal: boolean) => {
    logger.log('🗑️ [REMOTE GOAL ARCHIVED] Removing archived goal:', { goalId, isCompanyGoal });
    
    if (isCompanyGoal) {
      setCompanyGoals(prev => prev.filter(g => g.id !== goalId));
    } else {
      setTeamGoals(prev => prev.filter(g => g.id !== goalId));
    }
  }, [setTeamGoals, setCompanyGoals]);

  // Handle remote goal updates from other meeting participants
  const handleRemoteGoalUpdated = useCallback((
    goalId: string, 
    updates: any, 
    wasCompanyGoal: boolean, 
    isCompanyGoal: boolean
  ) => {
    logger.log('✏️ [REMOTE GOAL UPDATED] Applying goal update:', { goalId, updates, wasCompanyGoal, isCompanyGoal });
    
    // Handle is_company_goal transitions
    if (wasCompanyGoal && !isCompanyGoal) {
      // Company goal → Team goal: remove from company, add to team
      setCompanyGoals(prev => prev.filter(g => g.id !== goalId));
      setTeamGoals(prev => {
        const existingGoal = prev.find(g => g.id === goalId);
        if (existingGoal) {
          return prev.map(g => g.id === goalId ? { ...g, ...updates, updated_at: new Date().toISOString() } : g);
        } else {
          // Find the goal from company goals to move it
          const goalToMove = companyGoals.find(g => g.id === goalId);
          if (goalToMove) {
            return [...prev, { ...goalToMove, ...updates, updated_at: new Date().toISOString() }];
          }
          return prev;
        }
      });
    } else if (!wasCompanyGoal && isCompanyGoal) {
      // Team goal → Company goal: remove from team, add to company
      setTeamGoals(prev => prev.filter(g => g.id !== goalId));
      setCompanyGoals(prev => {
        const existingGoal = prev.find(g => g.id === goalId);
        if (existingGoal) {
          return prev.map(g => g.id === goalId ? { ...g, ...updates, updated_at: new Date().toISOString() } : g);
        } else {
          // Find the goal from team goals to move it
          const goalToMove = teamGoals.find(g => g.id === goalId);
          if (goalToMove) {
            return [...prev, { ...goalToMove, ...updates, updated_at: new Date().toISOString() }];
          }
          return prev;
        }
      });
    } else {
      // No is_company_goal change: update in place
      if (isCompanyGoal) {
        setCompanyGoals(prev => 
          prev.map(g => g.id === goalId ? { ...g, ...updates, updated_at: new Date().toISOString() } : g)
        );
      } else {
        setTeamGoals(prev => 
          prev.map(g => g.id === goalId ? { ...g, ...updates, updated_at: new Date().toISOString() } : g)
        );
      }
    }
  }, [setTeamGoals, setCompanyGoals, companyGoals, teamGoals]);

  // Handle remote milestone changes via broadcast
  const handleRemoteMilestoneChanged = useCallback((
    goalId: string,
    action: 'created' | 'updated' | 'deleted',
    milestoneId?: string
  ) => {
    logger.log('📡 [REMOTE] Milestone changed:', { goalId, action, milestoneId });
    // Invalidate React Query cache to trigger refetch
    queryClient.invalidateQueries({ queryKey: ['goal-milestones', goalId] });
  }, [queryClient]);

  // Setup broadcast channel for real-time goal reordering and owner change sync
  const { publishReorder, publishOwnerChange, publishGoalCreated, publishGoalArchived, publishGoalUpdated, publishMilestoneChanged } = useGoalReorderBroadcast(
    teamId, 
    handleRemoteReorder,
    handleRemoteOwnerChange,
    handleRemoteGoalCreated,
    handleRemoteGoalArchived,
    handleRemoteGoalUpdated,
    handleRemoteMilestoneChanged
  );

  // Handle company goal owner change from avatar click (User → DB → Realtime → Users)
  const handleCompanyGoalOwnerChange = useCallback((
    goalId: string, 
    previousOwnerId: string, 
    newOwnerId: string
  ) => {
    // 1. Update local state immediately (for the editing user)
    setCompanyGoals(prev => prev.map(g => 
      g.id === goalId ? { ...g, owner_id: newOwnerId } : g
    ));
    
    // 2. Broadcast to other users (goal stays as company goal, just owner changes)
    publishOwnerChange(goalId, previousOwnerId, newOwnerId, true);
  }, [setCompanyGoals, publishOwnerChange]);

  // Bulk archive hook - uses the SAME refetch functions as the goals being displayed
  const { archiveAllCompleted, isArchiving } = useBulkArchiveGoals({
    teamId,
    companyId: teams[0]?.company_id || '',
    refetchTeamGoals,
    refetchCompanyGoals
  });

  // Bulk issue creation hook for off-track goals
  const { createIssuesForOffTrackGoals, isCreating } = useBulkCreateIssuesForGoals(
    teamId,
    teams[0]?.company_id || '',
    undefined,
    () => {
      refetchTeamGoals();
      refetchCompanyGoals();
    }
  );

  // Dialog state for issue creation confirmation
  const [showCreateIssuesDialog, setShowCreateIssuesDialog] = useState(false);
  const [offTrackGoalsCount, setOffTrackGoalsCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Store previous user IDs to prevent profile blinking during team switches
  const previousUserIdsRef = useRef<string[]>([]);
  
  // Store previous goals to prevent flickering during archive toggle
  const previousCompanyGoalsRef = useRef(companyGoals);
  const previousTeamGoalsRef = useRef(teamGoals);

  // Get all unique user IDs that we need profiles for
  const allUserIds = useMemo(() => {
    const memberIds = members.map(m => m.user_id).filter(Boolean);
    const companyGoalOwnerIds = companyGoals.map(g => g.owner_id).filter(Boolean);
    const teamGoalOwnerIds = teamGoals.map(g => g.owner_id).filter(Boolean);
    const newIds = Array.from(new Set([...memberIds, ...companyGoalOwnerIds, ...teamGoalOwnerIds]));
    
    // Keep previous IDs during loading to prevent profile blinking
    if (newIds.length > 0) {
      previousUserIdsRef.current = newIds;
      return newIds;
    }
    return previousUserIdsRef.current;
  }, [members, companyGoals, teamGoals]);

  // Use optimized profiles hook that only fetches needed profiles
  const { profiles, isLoading: profilesLoading, getProfileName, getProfile } = useProfilesByIds(allUserIds);

  // Listen for goal creation events from AddGoalItem component
  React.useEffect(() => {
    const handleGoalCreatedEvent = (event: CustomEvent) => {
      const goal = event.detail?.goal;
      if (goal && publishGoalCreated) {
        logger.log('🎯 [CombinedGoalsBoard] Goal created via AddGoalItem, broadcasting:', goal);
        publishGoalCreated(goal);
      }
    };

    window.addEventListener('goal-created', handleGoalCreatedEvent as EventListener);
    return () => {
      window.removeEventListener('goal-created', handleGoalCreatedEvent as EventListener);
    };
  }, [publishGoalCreated]);

  // Combine all loading states and apply delay to prevent flash
  const combinedLoading = loadingTeam || membersLoading || loadingCompany || leadershipLoading || profilesLoading;
  const showLoading = useLoadingDelay(combinedLoading, 200);

  // Use previous goals while loading to prevent flickering during archive toggle
  const displayCompanyGoals = combinedLoading ? previousCompanyGoalsRef.current : companyGoals;
  const displayTeamGoals = combinedLoading ? previousTeamGoalsRef.current : teamGoals;

  // Sort company goals by display_order to ensure remote reorders are reflected visually
  // This matches the sorting pattern used for team goals in personGroups useMemo
  const sortedCompanyGoals = useMemo(() => {
    return [...displayCompanyGoals].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
  }, [displayCompanyGoals]);

  // Update refs when loading completes
  React.useEffect(() => {
    if (!combinedLoading) {
      previousCompanyGoalsRef.current = companyGoals;
      previousTeamGoalsRef.current = teamGoals;
    }
  }, [combinedLoading, companyGoals, teamGoals]);

  // Performance logging in development
  if (process.env.NODE_ENV === 'development') {
    logger.debug('📊 CombinedGoalsBoard Performance Optimizations Active:', {
      teamId: teamId,
      step1_profileOptimization: `✅ Fetching ${allUserIds.length} profiles (vs all company profiles)`,
      step2_databaseIndexes: '✅ 6 performance indexes active',
      step3_realtimeDebouncing: '✅ 250ms debounced real-time updates',
      step4_lazyModals: '✅ EditGoalModal lazy-loaded',
      profileIds: allUserIds,
      companyGoalsCount: displayCompanyGoals.length,
      teamGoalsCount: displayTeamGoals.length,
      membersCount: members.length,
      profilesLoading: profilesLoading
    });
  }

  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingGoal, setEditingGoal] = useState<TeamGoal | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeGoal, setActiveGoal] = useState<TeamGoal | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5, delay: 50 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Add component mount logging to verify it's working
  React.useEffect(() => {
    logger.log('🏗️ CombinedGoalsBoard mounted with:', {
      teamId,
      companyGoalsCount: displayCompanyGoals.length,
      teamGoalsCount: displayTeamGoals.length,
      hasTeams: teams.length > 0
    });
  }, [teamId, displayCompanyGoals.length, displayTeamGoals.length, teams.length]);


  // Profile helper functions are now provided by useProfilesByIds hook

  const validMembers = members.filter(m => m.user_id && m.user_id.trim() !== '');
  
  logger.debug('🔍 CombinedGoalsBoard: validMembers data:', validMembers.map(m => ({ 
    id: m.user_id, 
    name: getProfileName(m.user_id)
  })));

  const personGroups = useMemo(() => {
    const map = new Map<string, { 
      personId: string; 
      personName: string; 
      personProfile: { fullName: string; email: string; avatarUrl: string | null }; 
      goals: TeamGoal[] 
    }>();
    
    // First, add all actual team members with pre-computed profile data
    validMembers.forEach(m => {
      const profile = getProfile(m.user_id);
      const fullName = profile?.full_name || profile?.email || 'Unknown User';
      map.set(m.user_id, { 
        personId: m.user_id, 
        personName: fullName, 
        personProfile: {
          fullName: fullName,
          email: profile?.email || '',
          avatarUrl: profile?.avatar_url || null
        },
        goals: [] 
      });
    });
    
    // Then, only add goals to existing team members (ignore goals owned by non-members)
    displayTeamGoals.forEach(g => {
      const key = g.owner_id;
      // Only add goals if the owner is actually a team member
      if (map.has(key)) {
        map.get(key)!.goals.push(g);
      }
      // Note: Goals owned by non-members (like super admins/directors) are intentionally ignored
      // to avoid showing non-members as "people" on the team goals page
    });
    
    // CRITICAL FIX: Sort goals within each person's group by display_order
    // This ensures drag-and-drop reordering works optimistically
    map.forEach(group => {
      group.goals.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    });
    
    return Array.from(map.values()).sort((a, b) => {
      // Primary sort: People with goals first
      const aHasGoals = a.goals.length > 0;
      const bHasGoals = b.goals.length > 0;
      
      if (aHasGoals && !bHasGoals) return -1;  // a has goals, b doesn't
      if (!aHasGoals && bHasGoals) return 1;   // b has goals, a doesn't
      
      // Secondary sort: Alphabetical by name within each group
      return a.personName.localeCompare(b.personName);
    });
  }, [displayTeamGoals, validMembers, getProfileName, getProfile]);

  // Filter personGroups based on hideEmptyUsers toggle
  const filteredPersonGroups = useMemo(() => {
    if (!hideEmptyUsers) return personGroups;
    return personGroups.filter(group => group.goals.length > 0);
  }, [personGroups, hideEmptyUsers]);

  const findCompanyIndex = (id: string) => sortedCompanyGoals.findIndex(g => g.id === id);
  const findTeamGoal = (id: string) => displayTeamGoals.find(g => g.id === id);

  const handleDragStart = (e: DragStartEvent) => {
    logger.log('🚀 DRAG START - Goal reordering begins:', e.active.id);
    logger.log('🔍 Drag start event object:', e);
    setActiveId(String(e.active.id));
    // Use scoped locking - only block the specific team being dragged
    const draggedGoal = [...displayCompanyGoals, ...displayTeamGoals].find(g => g.id === String(e.active.id));
    const sectionId = draggedGoal?.is_company_goal ? 'company' : `team-${draggedGoal?.owner_id || teamId}`;
    logger.log(`🔒 SETTING SCOPED REORDER LOCK for section: ${sectionId}`);
    setGlobalReordering(true, sectionId);
    const goal = [...displayCompanyGoals, ...displayTeamGoals].find(g => g.id === String(e.active.id));
    setActiveGoal(goal || null);
    logger.log('🎯 Active goal set:', goal?.title);
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveId(null);
    setActiveGoal(null);
    
    // CRITICAL: Block real-time updates immediately to prevent race condition
    const draggedGoal = [...displayCompanyGoals, ...displayTeamGoals].find(g => g.id === String(e.active.id));
    if (draggedGoal && !draggedGoal.is_company_goal) {
      // For team goals, we need to access the justReorderedRef from useTeamGoals
      // This will be handled inside reorderGoals, but we set global lock here
      logger.log('🚫 Setting blocking flag for team goal reorder');
    }
    
    // Safety timeout to prevent permanent lock (5 second max)
    const lockTimeout = setTimeout(() => {
      logger.warn('🔒 Global reorder lock timeout - forcefully releasing');
      setGlobalReordering(false);
    }, 5000);
    
    const releaseLock = () => {
      clearTimeout(lockTimeout);
      const draggedGoal = [...displayCompanyGoals, ...displayTeamGoals].find(g => g.id === String(e.active.id));
      const sectionId = draggedGoal?.is_company_goal ? 'company' : `team-${draggedGoal?.owner_id || teamId}`;
      logger.log(`🔓 RELEASING SCOPED REORDER LOCK for section: ${sectionId}`);
      setGlobalReordering(false, sectionId);
    };
    
    if (!over) {
      releaseLock();
      return;
    }

    const activeData = active.data.current as any;
    const overData = over.data.current as any;
    const overId = String(over.id);

    // 1) Reorder within company goals
    if (findCompanyIndex(String(active.id)) !== -1 && findCompanyIndex(overId) !== -1) {
      const oldIndex = findCompanyIndex(String(active.id));
      const newIndex = findCompanyIndex(overId);
      const newOrder = arrayMove(sortedCompanyGoals, oldIndex, newIndex).map(g => g.id);
      try {
        await reorderCompanyGoals(newOrder);
        // Broadcast company goal reorder to other meeting participants
        publishReorder(newOrder, true);
      } finally {
        releaseLock();
      }
      return;
    }

    // 2) Reorder within same owner's team goals
    const activeTeamGoal = findTeamGoal(String(active.id));
    const overTeamGoal = findTeamGoal(overId);
    if (activeTeamGoal && overTeamGoal && activeTeamGoal.owner_id === overTeamGoal.owner_id) {
      logger.log('🔄 SAME-SECTION REORDER - Using optimistic update pattern');
      
      const ownerId = activeTeamGoal.owner_id;
      const ownerGoals = displayTeamGoals
        .filter(g => g.owner_id === ownerId)
        .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
      
      const oldIndex = ownerGoals.findIndex(g => g.id === activeTeamGoal.id);
      const newIndex = ownerGoals.findIndex(g => g.id === overTeamGoal.id);
      const reordered = arrayMove(ownerGoals, oldIndex, newIndex);
      const reorderedIds = reordered.map(g => g.id);
      
      logger.log('🎯 Reorder details:', {
        ownerId,
        ownerName: getProfileName(ownerId),
        oldIndex,
        newIndex,
        reorderedIds,
        activeGoal: activeTeamGoal.title,
        overGoal: overTeamGoal.title
      });
      
      try {
        // reorderGoals handles both optimistic local state update and DB persistence
        logger.log('🔄 [SAME-SECTION] Starting reorder (optimistic + DB)');
        setOptimisticUpdating(true);
        const startTime = performance.now();
        await reorderGoals(reorderedIds);
        logger.log(`✅ [SAME-SECTION] Reorder completed in ${(performance.now() - startTime).toFixed(2)}ms`);
        
        // Broadcast team goal reorder to other meeting participants
        publishReorder(reorderedIds, false);
      } finally {
        // OPTIMISTIC FIX: Reduced timeout for faster responsiveness
        setTimeout(() => {
          logger.log('🔓 [SAME-SECTION] Releasing optimistic protection and lock');
          setOptimisticUpdating(false);
          releaseLock();
        }, 50);
      }
      return;
    }

    // 3) Move between owners inside team section (drop over another goal)
    if (activeTeamGoal && overTeamGoal && activeTeamGoal.owner_id !== overTeamGoal.owner_id) {
      const newOwnerId = overTeamGoal.owner_id;
      const targetIndex = displayTeamGoals.findIndex(g => g.id === overTeamGoal.id);
      
      // Optimistically update local state first
      const updatedGoals = [...teamGoals];
      const movedGoalIndex = updatedGoals.findIndex(g => g.id === activeTeamGoal.id);
      const [movedGoal] = updatedGoals.splice(movedGoalIndex, 1);
      
      // Insert before the target goal
      const newTargetIndex = updatedGoals.findIndex(g => g.id === overTeamGoal.id);
      updatedGoals.splice(newTargetIndex, 0, { ...movedGoal, owner_id: newOwnerId });
      
      setTeamGoals(updatedGoals);
      
      try {
        const ok = await updateTeamGoal(activeTeamGoal.id, { owner_id: newOwnerId });
        if (ok) {
          toast({ title: 'Goal reassigned', description: `Assigned to ${getProfileName(newOwnerId)}` });
          
          // Reorder goals for proper positioning
          const newOwnerGoals = updatedGoals.filter(g => g.owner_id === newOwnerId);
          const goalIds = newOwnerGoals.map(g => g.id);
          await reorderGoals(goalIds);
          
          // Broadcast owner change to other meeting participants
          publishOwnerChange(activeTeamGoal.id, activeTeamGoal.owner_id, newOwnerId, false);
        } else {
          // Rollback optimistic update on error by reverting to original team goals
          setTeamGoals(teamGoals);
        }
      } finally {
        releaseLock();
      }
      return;
    }

    // 3b) Team goal dropped over a company goal item -> insert at that position
    if (activeData?.type === 'team_goal' && (overData?.type === 'company_goal' || findCompanyIndex(overId) !== -1)) {
      const goal = activeData.goal as TeamGoal;
      const targetCompanyIndex = findCompanyIndex(overId);
      
      try {
        // Add optimistic company goal immediately
        const optimisticCompanyGoal = { 
          ...goal, 
          is_company_goal: true, 
          display_order: targetCompanyIndex + 1 
        };
        
        const { error } = await supabase.from('team_goals').update({
          is_company_goal: true,
          display_order: targetCompanyIndex + 1,
          updated_at: new Date().toISOString(),
        }).eq('id', goal.id);
        if (error) throw error;
        
        // Update display order for other company goals
        const updates = displayCompanyGoals.slice(targetCompanyIndex).map((g, index) => 
          supabase.from('team_goals').update({
            display_order: targetCompanyIndex + index + 2,
            updated_at: new Date().toISOString()
          }).eq('id', g.id)
        );
        await Promise.all(updates);
        
        // Optimistically remove from team goals since it becomes a company goal
        setTeamGoals(prev => prev.filter(g => g.id !== goal.id));
        
        // Dispatch immediate event to update company goals optimistically
        if (typeof window !== 'undefined') {
          try {
            window.dispatchEvent(new CustomEvent('company-goal-toggled', {
              detail: { goalId: goal.id, is_company_goal: true, optimisticGoal: optimisticCompanyGoal }
            }));
          } catch (e) {
            logger.warn('Failed to dispatch company-goal-toggled event', e);
          }
        }
        
        // Broadcast owner change to other meeting participants (include full goal for instant sync)
        const updatedGoal = { ...goal, is_company_goal: true, display_order: targetCompanyIndex + 1 };
        publishOwnerChange(goal.id, goal.owner_id, null, true, targetCompanyIndex + 1, updatedGoal);
        
        toast({ title: 'Company goal', description: 'Goal marked as company goal.' });
      } catch (err) {
        logger.error('Failed to mark as company goal', err);
        toast({ title: 'Error', description: 'Failed to mark as company goal', variant: 'destructive' });
      } finally {
        releaseLock();
      }
      return;
    }

    // 3c) Company goal dropped over a team goal item -> assign to that goal's owner at that position
    if (activeData?.type === 'company_goal' && overTeamGoal) {
      const goal = activeData.goal as TeamGoal;
      const targetOwnerId = overTeamGoal.owner_id;
      const targetOwnerName = getProfileName(targetOwnerId);
      const targetIndex = displayTeamGoals.findIndex(g => g.id === overTeamGoal.id);
      
      // Add optimistic owner change immediately
      const changeId = addOptimisticChange(
        goal.id,
        goal.owner_id,
        getProfileName(goal.owner_id),
        targetOwnerId,
        targetOwnerName
      );
      
      try {
        const { error } = await supabase.from('team_goals').update({
          is_company_goal: false,
          owner_id: targetOwnerId,
          team_id: teamId,
          updated_at: new Date().toISOString(),
        }).eq('id', goal.id);
        if (error) throw error;

        await supabase.from('goal_team_assignments').delete().eq('goal_id', goal.id);
        await supabase.from('goal_team_assignments').insert({ goal_id: goal.id, team_id: teamId });
        
        // Confirm optimistic change on success
        confirmOptimisticChange(goal.id);
        
        // Dispatch event to update company goals view immediately
        if (typeof window !== 'undefined') {
          try {
            window.dispatchEvent(new CustomEvent('company-goal-toggled', {
              detail: { goalId: goal.id, is_company_goal: false }
            }));
          } catch (e) {
            logger.warn('Failed to dispatch company-goal-toggled event', e);
          }
        }
        // Optimistically update lists: remove from company and add to team at target position
        setTeamGoals(prev => {
          const without = prev.filter(g => g.id !== goal.id);
          const newGoal = { ...goal, is_company_goal: false, owner_id: targetOwnerId, team_id: teamId } as TeamGoal;
          const insertAt = without.findIndex(g => g.id === overTeamGoal.id);
          if (insertAt >= 0) {
            without.splice(insertAt, 0, newGoal);
          } else {
            without.push(newGoal);
          }
          return without;
        });

        // Silent refresh company goals to avoid flicker
        setTimeout(async () => {
          try {
            const newTeamGoals = await supabase
              .from('team_goals')
              .select('*')
              .eq('team_id', teamId)
              .or('is_company_goal.is.null,is_company_goal.eq.false')
              .order('owner_id')
              .order('display_order');

            if (newTeamGoals.data) {
              const ownerGoals = newTeamGoals.data.filter(g => g.owner_id === targetOwnerId);
              const reorderedIds = ownerGoals.map(g => g.id);
              await reorderGoals(reorderedIds);
            }
          } catch (error) {
            logger.error('Failed to refresh goals after owner change:', error);
          }
        }, 100);
        
        // Broadcast owner change to other meeting participants (include full goal for instant sync)
        const updatedGoal = { ...goal, is_company_goal: false, owner_id: targetOwnerId, team_id: teamId };
        publishOwnerChange(goal.id, null, targetOwnerId, false, undefined, updatedGoal);
        
        toast({ title: 'Goal assigned', description: `Assigned to ${targetOwnerName}` });
      } catch (err) {
        logger.error('Failed to assign company goal to user', err);
        rollbackOptimisticChange(goal.id, err as Error);
        toast({ title: 'Error', description: 'Failed to assign goal', variant: 'destructive' });
      } finally {
        releaseLock();
      }
      return;
    }

    // 4) Dropped on a person container 
    if (overData?.type === 'person_container') {
      const targetOwnerId = overData.personId;

      // 4a) From company -> team/person: unmark company, assign owner and team at end of person's goals
      if (activeData?.type === 'company_goal') {
        const goal = activeData.goal as TeamGoal;
        const targetOwnerName = getProfileName(targetOwnerId);
        
        // Add optimistic owner change immediately
        const changeId = addOptimisticChange(
          goal.id,
          goal.owner_id,
          getProfileName(goal.owner_id),
          targetOwnerId,
          targetOwnerName
        );
        
        try {
          // Get current max display order for target owner
          const ownerGoals = displayTeamGoals.filter(g => g.owner_id === targetOwnerId);
          const maxOrder = ownerGoals.length > 0 ? Math.max(...ownerGoals.map(g => g.display_order || 0)) : 0;
          
          const { error } = await supabase.from('team_goals').update({
            is_company_goal: false,
            owner_id: targetOwnerId,
            team_id: teamId,
            display_order: maxOrder + 1,
            updated_at: new Date().toISOString(),
          }).eq('id', goal.id);
          if (error) throw error;

          // Ensure team assignment exists
          await supabase.from('goal_team_assignments').delete().eq('goal_id', goal.id);
          await supabase.from('goal_team_assignments').insert({ goal_id: goal.id, team_id: teamId });

          // Confirm optimistic change on success
          confirmOptimisticChange(goal.id);

          // Dispatch event to update company goals view immediately
          if (typeof window !== 'undefined') {
            try {
              window.dispatchEvent(new CustomEvent('company-goal-toggled', {
                detail: { goalId: goal.id, is_company_goal: false }
              }));
            } catch (e) {
              logger.warn('Failed to dispatch company-goal-toggled event', e);
            }
          }

          // Optimistically move to team goals at end of target owner's list
          setTeamGoals(prev => {
            const without = prev.filter(g => g.id !== goal.id);
            const newGoal = { ...goal, is_company_goal: false, owner_id: targetOwnerId, team_id: teamId } as TeamGoal;
            return [...without, newGoal];
          });

          // Broadcast owner change to other meeting participants (include full goal for instant sync)
          const updatedGoal = { ...goal, is_company_goal: false, owner_id: targetOwnerId, team_id: teamId, display_order: maxOrder + 1 };
          publishOwnerChange(goal.id, null, targetOwnerId, false, maxOrder + 1, updatedGoal);

          toast({ title: 'Goal assigned', description: `Moved to team and assigned to ${targetOwnerName}.` });
        } catch (err) {
          logger.error('Failed to assign company goal to user', err);
          rollbackOptimisticChange(goal.id, err as Error);
          toast({ title: 'Error', description: 'Failed to assign goal', variant: 'destructive' });
        } finally {
          releaseLock();
        }
        return;
      }

      // 4b) From team -> different owner (place at end of target owner's goals)
      if (activeData?.type === 'team_goal') {
        const goal = activeData.goal as TeamGoal;
        if (goal.owner_id !== targetOwnerId) {
          try {
            // Get current max display order for target owner
            const ownerGoals = displayTeamGoals.filter(g => g.owner_id === targetOwnerId);
            const maxOrder = ownerGoals.length > 0 ? Math.max(...ownerGoals.map(g => g.display_order || 0)) : 0;
            
            const ok = await updateTeamGoal(goal.id, { 
              owner_id: targetOwnerId,
              display_order: maxOrder + 1
            });
            if (ok) {
              // Broadcast owner change to other meeting participants
              publishOwnerChange(goal.id, goal.owner_id, targetOwnerId, false, maxOrder + 1);
              
              toast({ title: 'Goal reassigned', description: `Assigned to ${getProfileName(targetOwnerId)}` });
            }
          } finally {
            releaseLock();
          }
        } else {
          releaseLock();
        }
        return;
      }
    }

    // 5) Dropped on company container from team section: mark as company goal at end
    if (overData?.type === 'company_container' && activeData?.type === 'team_goal') {
      const goal = activeData.goal as TeamGoal;
      try {
        // Get current max display order for company goals
        const maxOrder = displayCompanyGoals.length > 0 ? Math.max(...displayCompanyGoals.map(g => g.display_order || 0)) : 0;
        
        const { error } = await supabase.from('team_goals').update({
          is_company_goal: true,
          display_order: maxOrder + 1,
          updated_at: new Date().toISOString(),
        }).eq('id', goal.id);
        if (error) throw error;
        // Optimistically remove from team goals and update local state  
        setTeamGoals(prev => prev.filter(g => g.id !== goal.id));
        
        // Broadcast owner change to other meeting participants (include full goal for instant sync)
        const updatedGoal = { ...goal, is_company_goal: true, display_order: maxOrder + 1 };
        publishOwnerChange(goal.id, goal.owner_id, null, true, maxOrder + 1, updatedGoal);
        
        toast({ title: 'Company goal', description: 'Goal marked as company goal.' });
      } catch (err) {
        logger.error('Failed to mark as company goal', err);
        toast({ title: 'Error', description: 'Failed to mark as company goal', variant: 'destructive' });
      } finally {
        releaseLock();
      }
      return;
    }
    
    // If we reach here without matching any case, release the lock
    releaseLock();
  };

  const handleEditGoal = (goal: TeamGoal) => {
    setEditingGoal(goal);
    setShowEditModal(true);
  };

  const handleOpenCreateIssuesDialog = async () => {
    try {
      // Fetch team-specific off-track goals that aren't archived
      const { data: teamOffTrackGoals, error: teamError } = await supabase
        .from('team_goals')
        .select('id')
        .eq('team_id', teamId)
        .eq('status', 'off_track')
        .eq('is_company_goal', false)
        .or('archived.is.null,archived.eq.false');

      if (teamError) throw teamError;

      // Fetch company off-track goals that aren't archived
      const { data: companyOffTrackGoals, error: companyError } = await supabase
        .from('team_goals')
        .select('id, teams!inner(company_id)')
        .eq('teams.company_id', teams[0]?.company_id || '')
        .eq('status', 'off_track')
        .eq('is_company_goal', true)
        .or('archived.is.null,archived.eq.false');

      if (companyError) throw companyError;

      const count = (teamOffTrackGoals?.length || 0) + (companyOffTrackGoals?.length || 0);
      
      if (count === 0) {
        toast({
          title: "No off-track goals",
          description: "There are no off-track goals to create issues for.",
          variant: "default"
        });
        return;
      }

      setOffTrackGoalsCount(count);
      setShowCreateIssuesDialog(true);
    } catch (error) {
      logger.error('Error fetching off-track goals count:', error);
      toast({
        title: "Error",
        description: "Failed to check off-track goals",
        variant: "destructive"
      });
    }
  };

  const handleConfirmCreateIssues = async (archiveAfter: boolean) => {
    setIsProcessing(true);
    
    try {
      await createIssuesForOffTrackGoals(archiveAfter);
      setShowCreateIssuesDialog(false);
    } catch (error) {
      logger.error('Error creating issues:', error);
      toast({
        title: "Error",
        description: "Failed to create issues",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuickAddCompanyGoal = async (title: string, ownerId?: string, targetDate?: string): Promise<boolean> => {
    logger.log('🏢 handleQuickAddCompanyGoal called with:', { title, ownerId, targetDate });
    
    if (!user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to create goals",
        variant: "destructive",
      });
      return false;
    }

    try {
      // Find the leadership team
      const leadershipTeam = teams.find(team => team.is_leadership);
      
      if (!leadershipTeam) {
        toast({
          title: "Error", 
          description: "No leadership team found",
          variant: "destructive",
        });
        return false;
      }

      // Get current max display order for company goals
      const maxOrder = displayCompanyGoals.length > 0 ? Math.max(...displayCompanyGoals.map(g => g.display_order || 0)) : 0;
      
      // Dispatch optimistic event for onboarding
      logger.log('🎯 CombinedGoalsBoard: Dispatching optimistic goal creation event for onboarding');
      window.dispatchEvent(new CustomEvent('optimistic-goal-creation'));
      
      // Create the company goal
      const { data, error } = await supabase
        .from('team_goals')
        .insert({
          title: title.trim(),
          team_id: leadershipTeam.id,
          owner_id: user.id,
          target_date: targetDate,
          is_company_goal: true,
          display_order: maxOrder + 1,
          status: 'on_track',
          archived: false
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating company goal:', error);
        throw error;
      }

      // Optimistically add the new goal to the local state immediately (like team goals do)
      if (data) {
        const typedNewGoal = {
          ...data,
          status: data.status as 'on_track' | 'off_track' | 'complete' | 'canceled',
          archived: data.archived || false,
          display_order: data.display_order || 0,
          is_company_goal: data.is_company_goal || false
        };
        
        // Add to company goals state immediately - no refresh needed!
        const currentGoals = displayCompanyGoals || [];
        const updatedGoals = [...currentGoals, typedNewGoal].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
        
        // Dispatch event to update company goals optimistically
        window.dispatchEvent(new CustomEvent('company-goal-toggled', {
          detail: { 
            goalId: data.id, 
            is_company_goal: true, 
            optimisticGoal: typedNewGoal 
          }
        }));
        
        // Broadcast the new goal to other meeting participants
        publishGoalCreated(typedNewGoal);
        
        // Track goal_created event for Statsig
        try {
          const { trackGoalCreated } = await import('@/lib/statsigAnalytics');
          trackGoalCreated({
            user_id: user?.id,
            company_id: leadershipTeam.company_id || undefined,
            goal_id: data.id,
            goal_type: 'annual', // Company goals are typically annual
            goal_title: title.trim()
          });
        } catch (e) {
          // Non-blocking
        }
      }
      
      toast({
        title: "Company Goal Created",
        description: `"${title}" has been added as a company goal`,
      });

      return true;
    } catch (error) {
      logger.error('Error creating company goal:', error);
      toast({
        title: "Error",
        description: "Failed to create company goal",
        variant: "destructive",
      });
      return false;
    }
  };

  const handleUpdateGoal = async (goalId: string, updates: Partial<TeamGoal>) => {
    const goal = editingGoal;
    if (!goal) return false;

    // Optimistically update the local state immediately
    if (goal.is_company_goal) {
      const updatedGoal = { ...goal, ...updates, updated_at: new Date().toISOString() };
      
      // CRITICAL FIX: If unmarking company goal, optimistically remove from company list
      if (Object.prototype.hasOwnProperty.call(updates, 'is_company_goal') && updates.is_company_goal === false) {
        // Remove from company goals list immediately
        const filteredCompanyGoals = displayCompanyGoals.filter(g => g.id !== goalId);
        // Don't manually set state here as useCompanyGoals will handle it
        
        // Dispatch event immediately for all other components
        if (typeof window !== 'undefined') {
          try {
            window.dispatchEvent(new CustomEvent('company-goal-toggled', {
              detail: { goalId, is_company_goal: false }
            }));
          } catch (e) {
            logger.warn('Failed to dispatch company-goal-toggled event', e);
          }
        }
      } else {
        // Update company goals list optimistically for other changes
        const currentCompanyGoals = displayCompanyGoals.map(g => 
          g.id === goalId ? updatedGoal : g
        );
      }
      
      // Trigger refetch only after optimistic update
      const success = await updateCompanyGoal(goalId, updates);
      if (success) {
        // Broadcast the update to other participants
        publishGoalUpdated(
          goalId, 
          updates, 
          goal.is_company_goal, 
          updates.is_company_goal ?? goal.is_company_goal
        );
      } else {
        // Only refetch on error
        await refetchCompanyGoals();
      }
      return success;
    } else {
      const updatedGoal = { ...goal, ...updates, updated_at: new Date().toISOString() };
      // Update team goals list optimistically
      const currentTeamGoals = displayTeamGoals.map(g => 
        g.id === goalId ? updatedGoal : g
      );
      setTeamGoals(currentTeamGoals);
      
      const success = await updateTeamGoal(goalId, updates);
      if (success) {
        // Broadcast the update to other participants
        publishGoalUpdated(
          goalId, 
          updates, 
          goal.is_company_goal, 
          updates.is_company_goal ?? goal.is_company_goal
        );
        setShowEditModal(false);
        setEditingGoal(null);
      } else {
        // Only refetch on error to revert optimistic update
        await refetchTeamGoals();
      }
      return success;
    }
  };

  // Only show skeleton if not in initial load state and after delay (prevent flash)
  if (!isInitialLoad && showLoading) {
    return <GoalsCardSkeleton />;
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <BackgroundDropContainer>
          <div className="flex flex-col h-full overflow-hidden">
            {/* STICKY HEADER - Bulk Actions Only */}
            {showBulkActions && (
              <div className="sticky top-0 bg-background z-10 border-b border-border/30 pb-4">
                {/* Bulk Actions - Independent section for all goals */}
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenCreateIssuesDialog}
                    disabled={isCreating || isProcessing}
                    className="gap-2"
                  >
                    {isCreating || isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                    Create Issues for Off-Track
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={archiveAllCompleted}
                    disabled={isArchiving}
                    className="gap-2"
                  >
                    {isArchiving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Archive className="h-4 w-4" />
                    )}
                    Archive Completed
                  </Button>
                </div>
              </div>
            )}

            {/* SCROLLABLE CONTENT - Company Goals List + Team Goals */}
            <div className="flex-1 px-1 pt-6">
              <div className="space-y-6">
                {/* Company Goals List */}
                {isLeadershipMember && !hideCompanyGoals && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h2 className="text-[16px] font-semibold text-foreground">
                        Company Goals
                        {activeId && !activeGoal?.is_company_goal && (
                          <span className="text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded-md">
                            Drop to convert to company goal
                          </span>
                        )}
                      </h2>
                    </div>
            {showLoading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-muted rounded" />
                <div className="h-4 bg-muted rounded" />
                <div className="h-4 bg-muted rounded" />
              </div>
            ) : sortedCompanyGoals.length === 0 ? (
              <CompanyDropContainer
                baseClassName="border-2 border-dashed rounded-[6px] transition-all duration-300 ease-out border-border/50"
                activeClassName="border-2 border-dashed rounded-[6px] transition-all duration-300 ease-out border-primary/40 bg-primary/5"
                overClassName="border-2 border-dashed rounded-[6px] transition-all duration-300 ease-out border-primary/70 bg-primary/10 shadow-lg ring-1 ring-primary/30"
                activeId={activeId}
              >
                <div className="text-center py-6">
                  <Target className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-1">No company goals yet</p>
                  <p className="text-xs text-muted-foreground/60 mb-4">Drag team goals here to mark as company goals</p>
                </div>
                <div className="p-4 pt-0">
                  <AddGoalItem 
                    onAddGoal={async (title, ownerId, targetDate) => {
                      return await handleQuickAddCompanyGoal(title, ownerId, targetDate);
                    }}
                    defaultOwnerId={user?.id}
                  />
                </div>
              </CompanyDropContainer>
            ) : (
              <CompanyDropContainer
                baseClassName="space-y-3 transition-all duration-300 ease-out"
                activeClassName="space-y-3 transition-all duration-300 ease-out bg-primary/3 rounded-[6px] p-1"
                overClassName="space-y-3 transition-all duration-300 ease-out bg-primary/8 rounded-[6px] p-3 shadow-md ring-1 ring-primary/30"
                activeId={activeId}
              >
                <SortableContext items={sortedCompanyGoals.map(g => g.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3">
                    {sortedCompanyGoals.map(goal => (
                      <DraggableCompanyGoalItem
                        key={goal.id}
                        goal={goal}
                        onEdit={handleEditGoal}
                        onDateUpdate={async (goalId, date) => {
                          const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                          await updateCompanyGoal(goalId, { target_date: formattedDate });
                          publishGoalUpdated(goalId, { target_date: formattedDate }, true, true);
                        }}
                        onArchive={async (id) => {
                          await archiveCompanyGoal(id);
                          publishGoalArchived(id, true);
                        }}
                         onUnarchive={async (id) => {
                           await unarchiveCompanyGoal(id);
                         }}
                         onDelete={async (id) => {
                           await deleteCompanyGoal(id);
                         }}
                         onStatusUpdate={async (id, status) => {
                          // Milestone updates are handled by CompanyGoalItem to prevent race conditions
                          // Protect optimistic milestone updates from being overwritten by refetch
                          setCompanyOptimisticUpdating(true);
                          try {
                            await updateCompanyGoal(id, { status });
                            // Build broadcast payload - include progress when marking complete
                            const updates: Record<string, any> = { status };
                            if (status === 'complete') {
                              const goal = companyGoals.find(g => g.id === id);
                              if (goal && goal.progress !== 100) {
                                updates.progress = 100;
                              }
                              // Broadcast milestone update so other participants refetch milestones (now at 100%)
                              publishMilestoneChanged(id, 'updated');
                            }
                            // Broadcast status (and progress if applicable) to other meeting participants
                            publishGoalUpdated(id, updates, true, true);
                          } finally {
                            // Release protection after sufficient delay to ensure:
                            // 1. DB updates complete (goal + all milestones)
                            // 2. React Query cache invalidation + refetch finishes
                            // 3. Real-time debounced reload completes
                            setTimeout(() => setCompanyOptimisticUpdating(false), 500);
                          }
                        }}
                        onProgressUpdate={async (goalId, progress) => {
                          const goal = companyGoals.find(g => g.id === goalId);
                          const success = await updateCompanyGoalProgress(goalId, progress);
                          if (success) {
                            const updates: Record<string, any> = { progress };
                            // Include auto-synced status when progress hits 100% or drops from 100%
                            if (progress === 100 && goal?.status !== 'complete') {
                              updates.status = 'complete';
                            } else if (progress < 100 && goal?.status === 'complete') {
                              updates.status = 'on_track';
                            }
                            publishGoalUpdated(goalId, updates, true, true);
                          }
                          return success;
                        }}
                        onMilestoneChanged={(goalId, action, milestoneId) => {
                          publishMilestoneChanged(goalId, action, milestoneId);
                        }}
                        onOwnerChange={handleCompanyGoalOwnerChange}
                        getProfileName={getProfileName}
                        getProfile={getProfile}
                        showArchived={showArchived}
                      />
                    ))}
                  </div>
                </SortableContext>
                <div className="mt-3">
                  <AddGoalItem 
                    onAddGoal={async (title, ownerId, targetDate) => {
                      return await handleQuickAddCompanyGoal(title, ownerId, targetDate);
                    }}
                    defaultOwnerId={user?.id}
                  />
                </div>
              </CompanyDropContainer>
            )}
                  </div>
                )}

                {/* Team Goals by Person - Show for all teams */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-[16px] font-semibold text-foreground flex items-center gap-2">
              Team Goals
              {activeId && (
                <span className="text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded-md">
                  {activeGoal?.is_company_goal ? "Drop to assign to person" : "Dragging..."}
                </span>
              )}
            </h2>
          </div>
                  {filteredPersonGroups.map(group => (
                    <PersonDropContainer key={group.personId} personId={group.personId} activeId={activeId} activeGoal={activeGoal}>
                      <div className="flex items-center gap-2 mb-3">
                        <UserAvatar
                          userId={group.personId}
                          fullName={group.personProfile.fullName}
                          email={group.personProfile.email}
                          avatarUrl={group.personProfile.avatarUrl}
                          size="sm"
                        />
                        <h3 className="font-medium text-sm">{group.personName}</h3>
                      </div>
                      <SortableContext items={group.goals.map(g => g.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-3">
                           {group.goals.map(goal => (
                             <DraggableGoalItem
                                key={goal.id}
                                goal={goal}
                                 onStatusUpdate={async (id, status) => {
                                   // Milestone updates are handled by CompanyGoalItem to prevent race conditions
                                   // Just update the status - celebration will be triggered automatically in useTeamGoals.updateGoal
                                   await updateTeamGoal(id, { status });
                                   // Build broadcast payload - include progress when marking complete
                                   const updates: Record<string, any> = { status };
                                   if (status === 'complete') {
                                     const goal = teamGoals.find(g => g.id === id);
                                     if (goal && goal.progress !== 100) {
                                       updates.progress = 100;
                                     }
                                     // Broadcast milestone update so other participants refetch milestones (now at 100%)
                                     publishMilestoneChanged(id, 'updated');
                                   }
                                   // Broadcast status (and progress if applicable) to other meeting participants
                                   publishGoalUpdated(id, updates, false, false);
                                 }}
                                onArchive={async (id) => {
                                  // Optimistically remove from UI
                                  const filteredGoals = teamGoals.filter(g => g.id !== id);
                                  setTeamGoals(filteredGoals);
                                  // Update via supabase
                                  await supabase.from('team_goals').update({ archived: true, updated_at: new Date().toISOString() }).eq('id', id);
                                  publishGoalArchived(id, false);
                                }}
                                 onUnarchive={async (id) => {
                                   await unarchiveTeamGoal(id);
                                 }}
                                 onDelete={async (id) => {
                                   await deleteTeamGoal(id);
                                 }}
                                 onEdit={handleEditGoal}
                                onDateUpdate={async (goalId, date) => {
                                  const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                                  await updateTeamGoal(goalId, { target_date: formattedDate });
                                  publishGoalUpdated(goalId, { target_date: formattedDate }, false, false);
                                }}
                                onProgressUpdate={async (goalId, progress) => {
                                  const goal = teamGoals.find(g => g.id === goalId);
                                  const success = await updateTeamGoalProgress(goalId, progress);
                                  if (success) {
                                    const updates: Record<string, any> = { progress };
                                    // Include auto-synced status when progress hits 100% or drops from 100%
                                    if (progress === 100 && goal?.status !== 'complete') {
                                      updates.status = 'complete';
                                    } else if (progress < 100 && goal?.status === 'complete') {
                                      updates.status = 'on_track';
                                    }
                                    publishGoalUpdated(goalId, updates, false, false);
                                  }
                                  return success;
                                }}
                                 onOwnerChange={async (goalId, newOwnerId) => {
                                   const success = await updateTeamGoal(goalId, { owner_id: newOwnerId });
                                   if (success) {
                                     refetchTeamGoals();
                                   }
                                   return success;
                                 }}
                                 onMilestoneChanged={(goalId, action, milestoneId) => {
                                   publishMilestoneChanged(goalId, action, milestoneId);
                                 }}
                                 getProfileName={getProfileName}
                                 getProfile={getProfile}
                                 teamId={teamId}
                                 showArchived={showArchived}
                              />
                           ))}
                        </div>
                      </SortableContext>
                      <div className="mt-3">
                        <AddGoalItem onAddGoal={async (title, ownerId, targetDate) => {
                          const result = await addGoal(title, undefined, group.personId, targetDate);
                          return result !== false;
                        }} />
                      </div>
                    </PersonDropContainer>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* DragOverlay inside DndContext for cross-section dragging */}
          <DragOverlay 
            style={{ 
              cursor: 'grabbing',
              position: 'fixed',
              zIndex: 999999,
              pointerEvents: 'none'
            }}
          >
            {activeId && activeGoal ? (
              <div className="bg-card border border-border rounded-[6px] shadow-xl opacity-95 transform rotate-2 scale-105 max-w-[calc(100vw-2rem)]">
                {activeGoal.is_company_goal ? (
                  <DraggableCompanyGoalItem
                    goal={activeGoal}
                    onEdit={handleEditGoal}
                    onArchive={async (id) => {
                      await archiveCompanyGoal(id);
                      publishGoalArchived(id, true);
                    }}
                    onUnarchive={async (id) => {
                      await unarchiveCompanyGoal(id);
                    }}
                    onDelete={async (id) => {
                      await deleteCompanyGoal(id);
                    }}
                    onStatusUpdate={async (id, status) => {
                      setCompanyOptimisticUpdating(true);
                      try {
                        await updateCompanyGoal(id, { status });
                        const updates: Record<string, any> = { status };
                        if (status === 'complete') {
                          const goal = companyGoals.find(g => g.id === id);
                          if (goal && goal.progress !== 100) {
                            updates.progress = 100;
                          }
                          publishMilestoneChanged(id, 'updated');
                        }
                        publishGoalUpdated(id, updates, true, false);
                      } finally {
                        setCompanyOptimisticUpdating(false);
                      }
                    }}
                    onProgressUpdate={async (goalId, progress) => {
                      const goal = companyGoals.find(g => g.id === goalId);
                      const success = await updateCompanyGoalProgress(goalId, progress);
                      if (success) {
                        const updates: Record<string, any> = { progress };
                        if (progress === 100 && goal?.status !== 'complete') {
                          updates.status = 'complete';
                        } else if (progress < 100 && goal?.status === 'complete') {
                          updates.status = 'on_track';
                        }
                        publishGoalUpdated(goalId, updates, true, false);
                      }
                      return success;
                    }}
                    onMilestoneChanged={(goalId, action, milestoneId) => {
                      publishMilestoneChanged(goalId, action, milestoneId);
                    }}
                    getProfileName={getProfileName}
                    getProfile={getProfile}
                    showArchived={showArchived}
                  />
                ) : (
                  <DraggableGoalItem
                    goal={activeGoal}
                    onStatusUpdate={async (id, status) => {
                      await updateTeamGoal(id, { status });
                      const updates: Record<string, any> = { status };
                      if (status === 'complete') {
                        const goal = teamGoals.find(g => g.id === id);
                        if (goal && goal.progress !== 100) {
                          updates.progress = 100;
                        }
                        publishMilestoneChanged(id, 'updated');
                      }
                      publishGoalUpdated(id, updates, false, false);
                    }}
                    onArchive={async (id) => {
                      const filteredGoals = teamGoals.filter(g => g.id !== id);
                      setTeamGoals(filteredGoals);
                      await supabase.from('team_goals').update({ archived: true, updated_at: new Date().toISOString() }).eq('id', id);
                      publishGoalArchived(id, false);
                    }}
                    onUnarchive={async (id) => {
                      await unarchiveTeamGoal(id);
                    }}
                    onDelete={async (id) => {
                      await deleteTeamGoal(id);
                    }}
                    onEdit={handleEditGoal}
                    onDateUpdate={async (goalId, date) => {
                      const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                      await updateTeamGoal(goalId, { target_date: formattedDate });
                      publishGoalUpdated(goalId, { target_date: formattedDate }, false, false);
                    }}
                    onProgressUpdate={async (goalId, progress) => {
                      const goal = teamGoals.find(g => g.id === goalId);
                      const success = await updateTeamGoalProgress(goalId, progress);
                      if (success) {
                        const updates: Record<string, any> = { progress };
                        if (progress === 100 && goal?.status !== 'complete') {
                          updates.status = 'complete';
                        } else if (progress < 100 && goal?.status === 'complete') {
                          updates.status = 'on_track';
                        }
                        publishGoalUpdated(goalId, updates, false, false);
                      }
                      return success;
                    }}
                    onOwnerChange={async (goalId, newOwnerId) => {
                      const success = await updateTeamGoal(goalId, { owner_id: newOwnerId });
                      if (success) {
                        refetchTeamGoals();
                      }
                      return success;
                    }}
                    onMilestoneChanged={(goalId, action, milestoneId) => {
                      publishMilestoneChanged(goalId, action, milestoneId);
                    }}
                    getProfileName={getProfileName}
                    getProfile={getProfile}
                    teamId={teamId}
                    showArchived={showArchived}
                  />
                )}
              </div>
            ) : null}
          </DragOverlay>
        </BackgroundDropContainer>
      </DndContext>


      <Suspense fallback={null}>
        <EditGoalModal
          open={showEditModal}
          onOpenChange={setShowEditModal}
          goal={editingGoal}
          onUpdate={handleUpdateGoal}
          teamId={teamId}
        />
      </Suspense>

      <CreateIssuesConfirmDialog
        open={showCreateIssuesDialog}
        onOpenChange={setShowCreateIssuesDialog}
        onConfirm={handleConfirmCreateIssues}
        offTrackGoalsCount={offTrackGoalsCount}
        isProcessing={isProcessing || isCreating}
      />
    </>
  );
};

// Memoize to prevent re-renders from meeting timer context
export const CombinedGoalsBoard = React.memo(CombinedGoalsBoardComponent);
