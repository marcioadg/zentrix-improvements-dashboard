import React, { useState, useCallback, useEffect } from 'react';
import { DndContext, DragEndEvent, useSensor, useSensors, PointerSensor, DragStartEvent, Over } from '@dnd-kit/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ZoomIn, ZoomOut, Download, Search, Plus, Building, ListCollapse, ListEnd, AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { OrgRoleCard } from './OrgRoleCard';
import { RoleConfigModal } from './RoleConfigModal';
import { OrgChartDebugPanel } from './OrgChartDebugPanel';
import { RealtimeConnectionStatus } from '@/components/shared/RealtimeConnectionStatus';
import { useOrgChart } from '@/hooks/useOrgChart';
import { useProfile } from '@/hooks/useProfile';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { useToast } from '@/hooks/use-toast';
import { HorizontalReorderIndicator } from './HorizontalReorderIndicator';
import { logger } from '@/utils/logger';

export const OrgChartBuilder: React.FC = () => {
  const [zoom, setZoom] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [parentRoleId, setParentRoleId] = useState<string | null>(null);
  const [collapsedRoles, setCollapsedRoles] = useState<Set<string>>(new Set());
  const [activeDragRoleId, setActiveDragRoleId] = useState<string | null>(null);
  const [targetSiblingInfo, setTargetSiblingInfo] = useState<{ roleId: string, direction: 'left'|'right' } | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const { profile } = useProfile();
  const { currentCompany } = useMultiCompanyAccess();
  const { toast } = useToast();
  const { 
    roles, 
    profiles,
    isLoading, 
    profilesLoading,
    realtimeConnected,
    fetchError,
    moveRole, 
    createRole,
    updateRole,
    deleteRole,
    isSuperAdmin,
    checkUserPermissions
  } = useOrgChart();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    // Track initial loading state
    if (!isLoading && !profilesLoading) {
      setIsInitialLoading(false);
    }
  }, [isLoading, profilesLoading]);

  const findDescendantIds = useCallback((roleId: string, rolesList = roles): string[] => {
    const children = rolesList.filter(r => r.reports_to_role_id === roleId);
    let descendants: string[] = [];
    for (const child of children) {
      descendants.push(child.id);
      descendants = descendants.concat(findDescendantIds(child.id, rolesList));
    }
    return descendants;
  }, [roles]);

  const canDrop = useCallback((draggedId: string, targetId: string): boolean => {
    if (draggedId === targetId) return false;
    const descendants = findDescendantIds(draggedId);
    if (descendants.includes(targetId)) return false;
    return true;
  }, [findDescendantIds]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragRoleId(event.active.id as string);
  }, []);

  const getSortedSiblings = useCallback((siblings: any[]) => {
    return [...siblings].sort((a, b) => {
      if ((a.position_x ?? 0) !== (b.position_x ?? 0)) {
        return (a.position_x ?? 0) - (b.position_x ?? 0);
      }
      return a.title.localeCompare(b.title);
    });
  }, []);

  const handleDragOver = useCallback((event: any) => {
    if (!event.over) return;
    const active = roles.find(r => r.id === event.active.id);
    const over = roles.find(r => r.id === event.over.id);
    if (active && over && active.reports_to_role_id === over.reports_to_role_id) {
      const rect = document.getElementById(`role-card-${over.id}`)?.getBoundingClientRect();
      if (rect && event.activatorEvent && event.activatorEvent.clientX !== undefined) {
        const x = event.activatorEvent.clientX;
        const leftZone = rect.left + (rect.width * 0.34);
        const rightZone = rect.right - (rect.width * 0.34);
        if (x < leftZone) setTargetSiblingInfo({ roleId: over.id, direction: 'left' });
        else if (x > rightZone) setTargetSiblingInfo({ roleId: over.id, direction: 'right' });
        else setTargetSiblingInfo(null);
      }
    } else {
      setTargetSiblingInfo(null);
    }
  }, [roles]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragRoleId(null);

    if (targetSiblingInfo && active.id !== targetSiblingInfo.roleId) {
      const sibling = roles.find(r => r.id === targetSiblingInfo.roleId);
      if (!sibling) return;
      await moveRole(
        active.id as string,
        sibling.reports_to_role_id || null
      );
      setTargetSiblingInfo(null);
      return;
    }
    setTargetSiblingInfo(null);

    if (over && active.id !== over.id && canDrop(active.id as string, over.id as string)) {
      try {
        await moveRole(active.id as string, over.id as string);
      } catch (error) {
        logger.error('Failed to move role:', error);
        toast({
          title: "Failed to Move Role",
          description: error instanceof Error ? error.message : 'An unexpected error occurred while moving the role.',
          variant: "destructive"
        });
      }
    }
  }, [moveRole, toast, canDrop, roles, targetSiblingInfo]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5));

  const toggleCollapse = useCallback((roleId: string) => {
    setCollapsedRoles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(roleId)) {
        newSet.delete(roleId);
      } else {
        newSet.add(roleId);
      }
      return newSet;
    });
  }, []);

  const validatePermissions = useCallback(async () => {
    if (!currentCompany) {
      toast({
        title: "No Company Selected",
        description: "Please select a company before managing organizational roles.",
        variant: "destructive"
      });
      return false;
    }

    try {
      const permissionCheck = await checkUserPermissions();
      if (!permissionCheck.canManage) {
        toast({
          title: "Permission Denied",
          description: `You need owner, admin, or manager permissions in ${currentCompany?.name} to manage organizational roles. Current reason: ${permissionCheck.reason}`,
          variant: "destructive"
        });
        return false;
      }
      return true;
    } catch (error) {
      logger.error('Permission check failed:', error);
      toast({
        title: "Permission Check Failed",
        description: "Unable to verify your permissions. Please try again.",
        variant: "destructive"
      });
      return false;
    }
  }, [currentCompany, checkUserPermissions, toast]);

  const handleCreateRole = useCallback(async () => {
    const hasPermission = await validatePermissions();
    if (!hasPermission) return;
    setSelectedRole(null);
    setParentRoleId(null);
    setIsRoleModalOpen(true);
  }, [validatePermissions]);

  const handleEditRole = useCallback(async (roleId: string) => {
    const hasPermission = await validatePermissions();
    if (!hasPermission) return;
    setSelectedRole(roleId);
    setParentRoleId(null);
    setIsRoleModalOpen(true);
  }, [validatePermissions]);

  const handleAddChild = useCallback(async (parentId: string) => {
    const hasPermission = await validatePermissions();
    if (!hasPermission) return;
    setSelectedRole(null);
    setParentRoleId(parentId);
    setIsRoleModalOpen(true);
  }, [validatePermissions]);

  const handleSaveRole = useCallback(async (roleData: any) => {
    try {
      if (selectedRole) {
        await updateRole(selectedRole, roleData);
        toast({
          title: "Success",
          description: "Role updated successfully."
        });
      } else {
        await createRole(roleData);
        toast({
          title: "Success", 
          description: "Role created successfully."
        });
      }
      setIsRoleModalOpen(false);
      setSelectedRole(null);
      setParentRoleId(null);
    } catch (error) {
      logger.error('Failed to save role:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred while saving the role.';
      
      let displayMessage = errorMessage;
      if (errorMessage.includes('Permission denied') || errorMessage.includes('Insufficient permissions')) {
        displayMessage = `You don't have permission to manage roles in ${currentCompany?.name || 'this company'}. You need owner, admin, or manager permissions.`;
      } else if (errorMessage.includes('company_id')) {
        displayMessage = `Role operation failed. Please ensure you're in the correct company context.`;
      } else if (errorMessage.includes('not available for assignment')) {
        displayMessage = 'The selected user is not available for assignment to this role.';
      }

      toast({
        title: selectedRole ? "Failed to Update Role" : "Failed to Create Role",
        description: displayMessage,
        variant: "destructive"
      });
    }
  }, [selectedRole, createRole, updateRole, currentCompany, toast]);

  const handleDeleteRole = useCallback(async (roleId: string) => {
    const hasPermission = await validatePermissions();
    if (!hasPermission) return;

    try {
      await deleteRole(roleId);
      toast({
        title: "Success",
        description: "Role deleted successfully."
      });
    } catch (error) {
      logger.error('Failed to delete role:', error);
      toast({
        title: "Failed to Delete Role",
        description: error instanceof Error ? error.message : 'An unexpected error occurred while deleting the role.',
        variant: "destructive"
      });
    }
  }, [validatePermissions, deleteRole, toast]);

  const filteredRoles = roles.filter(role => 
    role.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const rootRoles = filteredRoles.filter(role => !role.reports_to_role_id);

  const getRolesWithChildren = useCallback(() => {
    const rolesWithChildren = new Set<string>();
    roles.forEach(role => {
      if (roles.some(r => r.reports_to_role_id === role.id)) {
        rolesWithChildren.add(role.id);
      }
    });
    return rolesWithChildren;
  }, [roles]);

  const handleCollapseAll = useCallback(() => {
    setCollapsedRoles(getRolesWithChildren());
  }, [getRolesWithChildren]);

  const handleExpandAll = useCallback(() => {
    setCollapsedRoles(new Set());
  }, []);

  const rolesWithChildren = getRolesWithChildren();
  const allAreCollapsed = rolesWithChildren.size > 0 && [...rolesWithChildren].every(id => collapsedRoles.has(id));
  const allAreExpanded = [...rolesWithChildren].every(id => !collapsedRoles.has(id));

  const renderRoleHierarchy = (role: any, level = 0): React.ReactNode => {
    if (!role) {
      return null;
    }

    const children = getSortedSiblings(filteredRoles.filter(r => r.reports_to_role_id === role.id));
    const isCollapsed = collapsedRoles.has(role.id);
    const hasChildren = children.length > 0;
    const shouldRenderHorizontally = children.length > 0 && children.length <= 20;

    let isOverDropTarget = false;
    let isDropDisabled = false;

    if (activeDragRoleId) {
      isOverDropTarget = activeDragRoleId !== role.id && canDrop(activeDragRoleId, role.id);
      isDropDisabled = activeDragRoleId === role.id || !canDrop(activeDragRoleId, role.id);
    }

    return (
      <div key={role.id} className="relative">
        <div className="mb-2 flex justify-center" id={`role-card-${role.id}`}>
          <OrgRoleCard
            role={role}
            level={level}
            hasChildren={hasChildren}
            isCollapsed={isCollapsed}
            onToggleCollapse={() => toggleCollapse(role.id)}
            onClick={() => handleEditRole(role.id)}
            onAddChild={() => handleAddChild(role.id)}
            isOverDropTarget={activeDragRoleId ? isOverDropTarget : false}
            isDropDisabled={activeDragRoleId ? isDropDisabled : false}
            showLeftIndicator={targetSiblingInfo?.roleId === role.id && targetSiblingInfo.direction === 'left'}
            showRightIndicator={targetSiblingInfo?.roleId === role.id && targetSiblingInfo.direction === 'right'}
          />
        </div>
        {targetSiblingInfo?.roleId === role.id && (
          <HorizontalReorderIndicator direction={targetSiblingInfo.direction} />
        )}
        {hasChildren && !isCollapsed && (
          <div className={shouldRenderHorizontally ?
            "flex justify-center items-start gap-2 sm:gap-6 mb-2 flex-wrap" :
            "ml-6 space-y-2"
          }>
            {children.map(child => {
              return renderRoleHierarchy(child, level + 1);
            })}
          </div>
        )}
      </div>
    );
  };

  const debugInfo = isSuperAdmin && profile && currentCompany ? {
    currentUser: {
      id: profile.id,
      company_id: currentCompany?.id,
      role: 'member' // Legacy field removed - check company_members for actual permission
    },
    profiles: profiles.map(p => ({
      id: p.id,
      full_name: p.full_name,
      email: p.email,
      company_id: currentCompany?.id,
      role: 'member' // Legacy field removed - check company_members for actual permission
    })),
    roles: roles,
    companyMismatch: []
  } : null;

  useEffect(() => {
    logger.log("OrgChartBuilder loaded");
  }, []);

  // Show loading state with better visual feedback
  if (isInitialLoading || (!currentCompany && isLoading)) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin h-8 w-8 text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading organization chart...</p>
          {currentCompany && (
            <p className="text-sm text-muted-foreground mt-2">
              Loading {currentCompany?.name} org chart
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Error Display */}
      {fetchError && (
        <Alert variant="destructive" className="mx-4 mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load org chart data: {fetchError}
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-2"
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Company Context Warning */}
      {!currentCompany && (
        <Alert className="mx-4 mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please select a company from the company switcher to view and manage organizational roles.
          </AlertDescription>
        </Alert>
      )}

      {/* Real-time Connection Status */}
      <RealtimeConnectionStatus 
        connected={realtimeConnected} 
        className="fixed bottom-4 right-4 z-50"
      />

      {/* Super Admin Debug Panel */}
      {isSuperAdmin && debugInfo && (
        <OrgChartDebugPanel debugInfo={debugInfo} />
      )}

      {/* Controls */}
      <div className="p-4 border-b border-border bg-background flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search roles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          <div className="flex gap-2 ml-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCollapseAll}
              disabled={rolesWithChildren.size === 0 || allAreCollapsed}
              title="Collapse All"
            >
              <ListCollapse className="h-4 w-4" />
              <span className="sr-only">Collapse All</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExpandAll}
              disabled={rolesWithChildren.size === 0 || allAreExpanded}
              title="Expand All"
            >
              <ListEnd className="h-4 w-4" />
              <span className="sr-only">Expand All</span>
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground min-w-[60px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button variant="outline" size="sm" onClick={handleZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button 
            size="sm" 
            onClick={handleCreateRole}
            disabled={!currentCompany}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Role
          </Button>
        </div>
      </div>

      {/* Chart Area - Centered */}
      <div className="flex-1 overflow-auto p-4 bg-background flex justify-center items-start">
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
        >
          <div
            className="min-h-full flex justify-center items-start"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'center',
              transition: 'transform 0.20s cubic-bezier(0.42,0,0.58,1)'
            }}
          >
            {rootRoles.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <Building className="h-16 w-16 text-muted-foreground/40 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    {currentCompany ? 'No organizational structure yet' : 'Select a company first'}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {currentCompany 
                      ? 'Create your first role to start building your org chart'
                      : 'Choose a company from the switcher to view org chart'
                    }
                  </p>
                  {currentCompany && (
                    <Button onClick={handleCreateRole}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Role
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {getSortedSiblings(rootRoles).map(role => renderRoleHierarchy(role))}
              </div>
            )}
          </div>
        </DndContext>
      </div>

      {/* Role Configuration Modal */}
      <RoleConfigModal
        isOpen={isRoleModalOpen}
        onClose={() => {
          setIsRoleModalOpen(false);
          setSelectedRole(null);
          setParentRoleId(null);
        }}
        roleId={selectedRole}
        parentRoleId={parentRoleId}
        roles={roles}
        onSave={handleSaveRole}
        onDelete={handleDeleteRole}
      />
    </div>
  );
};
