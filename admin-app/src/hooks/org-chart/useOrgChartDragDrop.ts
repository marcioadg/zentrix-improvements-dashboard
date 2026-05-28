
import { useState, useCallback } from 'react';
import { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

export const useOrgChartDragDrop = (
  roles: any[],
  moveRole: (roleId: string, newParentId: string | null, newPositionX?: number) => Promise<void>,
  reorderSiblings: (roleId: string, targetSiblingId: string, direction: 'left' | 'right') => Promise<void>
) => {
  const [activeDragRoleId, setActiveDragRoleId] = useState<string | null>(null);
  const [targetSiblingInfo, setTargetSiblingInfo] = useState<{ roleId: string, direction: 'left'|'right' } | null>(null);
  const { toast } = useToast();

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

  const canReorderSiblings = useCallback((draggedId: string, targetId: string): boolean => {
    const draggedRole = roles.find(r => r.id === draggedId);
    const targetRole = roles.find(r => r.id === targetId);
    
    if (!draggedRole || !targetRole) return false;
    if (draggedId === targetId) return false;
    
    // Only allow reordering between siblings (same parent)
    return draggedRole.reports_to_role_id === targetRole.reports_to_role_id;
  }, [roles]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragRoleId(event.active.id as string);
  }, []);

  const handleDragOver = useCallback((event: any) => {
    if (!event.over) {
      setTargetSiblingInfo(null);
      return;
    }
    
    const active = roles.find(r => r.id === event.active.id);
    const over = roles.find(r => r.id === event.over.id);
    
    // Only show sibling reorder indicators for same-parent roles
    if (active && over && canReorderSiblings(event.active.id, event.over.id)) {
      const rect = document.getElementById(`role-card-${over.id}`)?.getBoundingClientRect();
      if (rect) {
        // Use current mouse position instead of activator event for real-time feedback
        const x = event.delta ? event.activatorEvent.clientX + event.delta.x : event.activatorEvent.clientX;
        
        // More generous drop zones - 50% each side with small overlap in middle
        const leftZone = rect.left + (rect.width * 0.5);
        
        if (x < leftZone) {
          setTargetSiblingInfo({ roleId: over.id, direction: 'left' });
        } else {
          setTargetSiblingInfo({ roleId: over.id, direction: 'right' });
        }
      }
    } else {
      setTargetSiblingInfo(null);
    }
  }, [roles, canReorderSiblings]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragRoleId(null);

    // Handle sibling reordering with improved logic
    if (targetSiblingInfo && active.id !== targetSiblingInfo.roleId) {
      const draggedRole = roles.find(r => r.id === active.id);
      const targetRole = roles.find(r => r.id === targetSiblingInfo.roleId);
      
      // Double-check they're siblings before reordering
      if (draggedRole && targetRole && canReorderSiblings(active.id as string, targetSiblingInfo.roleId)) {
        try {
          await reorderSiblings(
            active.id as string, 
            targetSiblingInfo.roleId, 
            targetSiblingInfo.direction
          );
          toast({
            title: "Role Reordered",
            description: "Role position updated successfully.",
            variant: "default"
          });
        } catch (error) {
          logger.error('Failed to reorder roles:', error);
          toast({
            title: "Failed to Reorder",
            description: error instanceof Error ? error.message : 'Failed to reorder roles.',
            variant: "destructive"
          });
        }
      }
      setTargetSiblingInfo(null);
      return;
    }
    setTargetSiblingInfo(null);

    // Handle hierarchical moves (only if not siblings and not same role)
    if (over && active.id !== over.id && canDrop(active.id as string, over.id as string)) {
      const draggedRole = roles.find(r => r.id === active.id);
      const targetRole = roles.find(r => r.id === over.id);
      
      // Prevent moving to same parent (that would be reordering, handled above)
      if (draggedRole?.reports_to_role_id === over.id) {
        return;
      }
      
      // Don't allow hierarchical moves between siblings (use reordering instead)
      if (canReorderSiblings(active.id as string, over.id as string)) {
        return;
      }
      
      try {
        await moveRole(active.id as string, over.id as string);
        toast({
          title: "Role Moved",
          description: "Role hierarchy updated successfully.",
          variant: "default"
        });
      } catch (error) {
        logger.error('Failed to move role:', error);
        toast({
          title: "Failed to Move Role",
          description: error instanceof Error ? error.message : 'An unexpected error occurred while moving the role.',
          variant: "destructive"
        });
      }
    }
  }, [moveRole, reorderSiblings, toast, canDrop, roles, targetSiblingInfo, canReorderSiblings]);

  return {
    activeDragRoleId,
    targetSiblingInfo,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    canDrop,
    canReorderSiblings
  };
};
