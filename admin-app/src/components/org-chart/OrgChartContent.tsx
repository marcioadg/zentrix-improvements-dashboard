
import React, { useCallback, useRef, useEffect } from 'react';
import { DndContext, useSensors, useSensor, PointerSensor } from '@dnd-kit/core';
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers';
import { Building, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OrgRoleCard } from './OrgRoleCard';
import { HorizontalReorderIndicator } from './HorizontalReorderIndicator';
import { OrgChartSkeleton } from './OrgChartSkeleton';
import { OrgChartConnections } from './OrgChartConnections';
import { useOrgChartUtils, shouldRenderHorizontally } from '@/utils/orgChartUtils';
import { useDragToScroll } from '@/hooks/useDragToScroll';
import { logger } from '@/utils/logger';

interface OrgChartContentProps {
  roles: any[];
  isLoading: boolean;
  currentCompany: any;
  zoom: number;
  searchTerm: string;
  collapsedRoles: Set<string>;
  activeDragRoleId: string | null;
  targetSiblingInfo: { roleId: string, direction: 'left'|'right' } | null;
  canDrop: (draggedId: string, targetId: string) => boolean;
  toggleCollapse: (roleId: string) => void;
  handleEditRole: (roleId: string) => Promise<boolean>;
  handleAddChild: (parentId: string) => Promise<boolean>;
  handleCreateRole: () => Promise<boolean>;
  handleDragStart: (event: any) => void;
  handleDragEnd: (event: any) => void;
  handleDragOver: (event: any) => void;
  showResponsibilities?: boolean;
}

export const OrgChartContent: React.FC<OrgChartContentProps> = ({
  roles,
  isLoading,
  currentCompany,
  zoom,
  searchTerm,
  collapsedRoles,
  activeDragRoleId,
  targetSiblingInfo,
  canDrop,
  toggleCollapse,
  handleEditRole,
  handleAddChild,
  handleCreateRole,
  handleDragStart,
  handleDragEnd,
  handleDragOver,
  showResponsibilities = true
}) => {
  const { filteredRoles, rootRoles, getSortedSiblings } = useOrgChartUtils(roles, searchTerm);
  const innerContainerRef = useRef<HTMLDivElement>(null);
  const dragScrollRef = useDragToScroll({ 
    enabled: true,
    cursor: 'grab',
    activeCursor: 'grabbing'
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Position org chart with top-level card at top and horizontally centered
  useEffect(() => {
    const el = dragScrollRef.current;
    if (el && roles.length > 0) {
      // Wait for the DOM to update
      setTimeout(() => {
        const scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
        const scrollTop = 0; // Align to top instead of center
        
        el.scrollTo({
          left: Math.max(0, scrollLeft),
          top: scrollTop,
          behavior: 'smooth'
        });
        
        logger.log('OrgChartContent: positioned chart at top-center', {
          scrollHeight: el.scrollHeight,
          clientHeight: el.clientHeight,
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth,
          scrollLeft,
          scrollTop
        });
      }, 100);
    }
  }, [roles.length]); // Only trigger when roles count changes

  useEffect(() => {
    const el = dragScrollRef.current;
    if (el) {
      logger.log('OrgChartContent: scroll container sizes', {
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
      });
    }
  }, [zoom, roles.length]);
  const onEditRole = useCallback(async (roleId: string) => {
    logger.log('🎯 OrgChartContent: onEditRole called for role:', roleId);
    await handleEditRole(roleId);
  }, [handleEditRole]);

  const onAddChild = useCallback(async (parentId: string) => {
    logger.log('🎯 OrgChartContent: onAddChild called for parent:', parentId);
    await handleAddChild(parentId);
  }, [handleAddChild]);

  const onCreateRole = useCallback(async () => {
    logger.log('🎯 OrgChartContent: onCreateRole called, delegating to handleCreateRole...');
    await handleCreateRole();
  }, [handleCreateRole]);

  const renderRoleHierarchy = useCallback((role: any, level = 0): React.ReactNode => {
    if (!role) return null;

    const children = getSortedSiblings(filteredRoles.filter(r => r.reports_to_role_id === role.id));
    const isCollapsed = collapsedRoles.has(role.id);
    const hasChildren = children.length > 0;
    // Always render horizontally when there are children
    const shouldRenderHorizontal = hasChildren;

    // Debug logging for CEO's children positioning
    if (role.title === 'Founder and CEO' && children.length > 0) {
      logger.log('🔍 CEO children order:', children.map(c => ({ 
        title: c.title, 
        position_x: c.position_x 
      })));
      logger.log('🔍 shouldRenderHorizontal for CEO children:', shouldRenderHorizontal);
      logger.log('🔍 CSS classes for CEO children container:', shouldRenderHorizontal ?
        "flex justify-center items-start gap-2 sm:gap-6 mb-2 flex-wrap" :
        "ml-2 sm:ml-6 space-y-2");
    }

    let isOverDropTarget = false;
    let isDropDisabled = false;

    if (activeDragRoleId) {
      isOverDropTarget = activeDragRoleId !== role.id && canDrop(activeDragRoleId, role.id);
      isDropDisabled = activeDragRoleId === role.id || !canDrop(activeDragRoleId, role.id);
    }

    return (
      <div key={role.id} className="relative">
        <div className="flex flex-col">
          <div className="mb-6 flex justify-center" id={`role-card-${role.id}`}>
            <OrgRoleCard
              role={role}
              level={level}
              hasChildren={hasChildren}
              isCollapsed={isCollapsed}
              onToggleCollapse={() => toggleCollapse(role.id)}
              onClick={() => onEditRole(role.id)}
              onAddChild={() => onAddChild(role.id)}
              isOverDropTarget={activeDragRoleId ? isOverDropTarget : false}
              isDropDisabled={activeDragRoleId ? isDropDisabled : false}
              showLeftIndicator={targetSiblingInfo?.roleId === role.id && targetSiblingInfo.direction === 'left'}
              showRightIndicator={targetSiblingInfo?.roleId === role.id && targetSiblingInfo.direction === 'right'}
              showResponsibilities={showResponsibilities}
            />
          </div>
          {targetSiblingInfo?.roleId === role.id && (
            <HorizontalReorderIndicator direction={targetSiblingInfo.direction} />
          )}
          {hasChildren && !isCollapsed && (
            <div className={shouldRenderHorizontal ?
              "flex justify-center items-start gap-2 sm:gap-6 mb-1" :
              "flex flex-col items-center space-y-2"
            }>
              {children.map(child => renderRoleHierarchy(child, level + 1))}
            </div>
          )}
        </div>
      </div>
    );
  }, [filteredRoles, collapsedRoles, activeDragRoleId, targetSiblingInfo, canDrop, getSortedSiblings, toggleCollapse, onEditRole, onAddChild, showResponsibilities]);

  // Show progressive loading instead of blocking spinner
  const isInitialLoading = isLoading && roles.length === 0;
  const showSkeleton = isInitialLoading && currentCompany;

  return (
    <div 
      ref={dragScrollRef}
      className="w-full h-[70vh] overflow-auto p-2 sm:p-4 relative outline-none focus:outline-none" 
      data-org-chart-content
    >
      {/* Connection lines positioned as overlay outside the scaled container */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        modifiers={[restrictToHorizontalAxis]}
      >
        <div className="relative min-w-[1600px] min-h-0">
        <div
          ref={innerContainerRef}
          className="min-w-fit min-h-fit w-full flex justify-center relative"
          data-org-chart-inner
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top center',
            transition: 'transform 0.20s cubic-bezier(0.42,0,0.58,1)',
          }}
        >
          {/* Connection lines positioned inside the scaled container so they scale together */}
          <OrgChartConnections
            roles={filteredRoles}
            zoom={zoom}
            collapsedRoles={collapsedRoles}
            containerRef={innerContainerRef}
            searchTerm={searchTerm}
          />
          {showSkeleton ? (
            <OrgChartSkeleton rolesCount={6} />
          ) : rootRoles.length === 0 ? (
            <div className="h-full flex items-center justify-center px-4">
              <div className="text-center max-w-md">
                <Building className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-base sm:text-lg font-medium text-foreground mb-2">
                  {currentCompany ? 'No organizational structure yet' : 'Select a company first'}
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground mb-4">
                  {currentCompany 
                    ? 'Create your first role to start building your org chart'
                    : 'Choose a company from the switcher to view org chart'
                  }
                </p>
                {currentCompany && (
                  <Button onClick={onCreateRole} size="sm" className="w-full sm:w-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Role
                  </Button>
                )}
              </div>
            </div>
          ) : searchTerm ? (
            <div className="flex flex-wrap justify-center items-start gap-6 p-8 min-w-full">
              {getSortedSiblings(filteredRoles).map(role => (
                <div key={role.id} id={`role-card-${role.id}`}>
                  <OrgRoleCard
                    role={role}
                    level={0}
                    hasChildren={false}
                    isCollapsed={false}
                    onToggleCollapse={() => {}}
                    onClick={() => onEditRole(role.id)}
                    onAddChild={() => onAddChild(role.id)}
                    showResponsibilities={showResponsibilities}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="inline-flex justify-center items-start gap-2 sm:gap-6 flex-wrap min-w-fit">
              {getSortedSiblings(rootRoles).map(role => renderRoleHierarchy(role))}
            </div>
          )}
        </div>
        </div>
      </DndContext>
    </div>
  );
};
