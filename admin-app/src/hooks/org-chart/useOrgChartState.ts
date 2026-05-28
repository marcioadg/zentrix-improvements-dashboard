
import { useState, useCallback } from 'react';

export const useOrgChartState = (roleHierarchy: any) => {
  const [zoom, setZoom] = useState(0.7);
  const [searchTerm, setSearchTerm] = useState('');
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [parentRoleId, setParentRoleId] = useState<string | null>(null);
  const [collapsedRoles, setCollapsedRoles] = useState<Set<string>>(new Set());
  const [showResponsibilities, setShowResponsibilities] = useState(true);

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

  const handleCollapseAll = useCallback(() => {
    setCollapsedRoles(roleHierarchy.rolesWithChildren);
  }, [roleHierarchy.rolesWithChildren]);

  const handleExpandAll = useCallback(() => {
    setCollapsedRoles(new Set());
  }, []);

  const toggleResponsibilities = useCallback(() => {
    setShowResponsibilities(prev => !prev);
  }, []);

  const allAreCollapsed = roleHierarchy.rolesWithChildren.size > 0 && [...roleHierarchy.rolesWithChildren].every(id => collapsedRoles.has(id));
  const allAreExpanded = [...roleHierarchy.rolesWithChildren].every(id => !collapsedRoles.has(id));

  return {
    zoom,
    searchTerm,
    setSearchTerm,
    isRoleModalOpen,
    setIsRoleModalOpen,
    selectedRole,
    setSelectedRole,
    parentRoleId,
    setParentRoleId,
    collapsedRoles,
    handleZoomIn,
    handleZoomOut,
    toggleCollapse,
    handleCollapseAll,
    handleExpandAll,
    allAreCollapsed,
    allAreExpanded,
    showResponsibilities,
    toggleResponsibilities
  };
};
