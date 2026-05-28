
import React, { useMemo, useState } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { useOrgChartOptimized } from '@/hooks/useOrgChartOptimized';
import { useOrgChartDragDrop } from '@/hooks/org-chart/useOrgChartDragDrop';
import { useOrgChartState } from '@/hooks/org-chart/useOrgChartState';
import { useOrgChartActions } from '@/hooks/org-chart/useOrgChartActions';
import { useOrgChartTemplates } from '@/hooks/useOrgChartTemplates';
import { OrgChartHeader } from './OrgChartHeader';
import { OrgChartControls, OrgChartViewMode } from './OrgChartControls';
import { OrgChartContent } from './OrgChartContent';
import { OrgChartListView } from './OrgChartListView';
import { RoleConfigModal } from './RoleConfigModal';
import { OrgChartContentSkeleton } from './OrgChartPageSkeleton';
import { TemplateConfirmDialog } from './TemplateConfirmDialog';
import { TemplatePreview } from './TemplatePreview';
import { ConfirmDeleteModal } from '@/components/modals/ConfirmDeleteModal';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

export const OrgChartBuilderOptimized: React.FC = () => {
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
    roleHierarchy,
    fetchRoles,
    moveRole, 
    reorderSiblings,
    createRole,
    updateRole,
    deleteRole,
    deleteAllRoles,
    isSuperAdmin,
    checkUserPermissions
  } = useOrgChartOptimized();

  const {
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
  } = useOrgChartState(roleHierarchy);

  const {
    activeDragRoleId,
    targetSiblingInfo,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    canDrop
  } = useOrgChartDragDrop(roles, moveRole, reorderSiblings);

  const {
    handleCreateRole,
    handleEditRole,
    handleAddChild,
    handleSaveRole,
    handleDeleteRole
  } = useOrgChartActions(
    currentCompany, 
    checkUserPermissions, 
    createRole, 
    updateRole, 
    deleteRole,
    setIsRoleModalOpen,
    setSelectedRole,
    setParentRoleId
  );

  // View mode (chart vs list)
  const [viewMode, setViewMode] = useState<OrgChartViewMode>('chart');

  // Template system
  const { templates, loading: templatesLoading, loadTemplate } = useOrgChartTemplates(currentCompany?.id || null);
  const [templatePreviewOpen, setTemplatePreviewOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [isTemplateLoading, setIsTemplateLoading] = useState(false);
  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  // Clear all roles system
  const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setTemplatePreviewOpen(true);
  };

  const handleUseTemplateFromPreview = () => {
    setTemplatePreviewOpen(false);
    setTemplateDialogOpen(true);
  };

  const handleClosePreview = () => {
    setTemplatePreviewOpen(false);
    setSelectedTemplateId(null);
  };

  const handleTemplateConfirm = async (mode: 'replace' | 'append') => {
    if (!selectedTemplateId) return;
    setIsTemplateLoading(true);
    setTemplateDialogOpen(false);
    
    await loadTemplate(selectedTemplateId, mode, async () => {
      // Template loaded - now manually refetch the data
      logger.log('🔄 Template loaded, manually fetching fresh data...');
      await fetchRoles();
      logger.log('✅ Fresh data loaded, hiding loading state');
      
      setIsTemplateLoading(false);
      setSelectedTemplateId(null);
    });
  };

  const debugInfo = useMemo(() => {
    return isSuperAdmin && profile && currentCompany ? {
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
  }, [isSuperAdmin, profile, currentCompany, profiles, roles]);

  const handleClearAllRoles = async () => {
    const { canManage } = await checkUserPermissions();
    
    if (!canManage) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to manage the org chart",
        variant: "destructive",
      });
      return;
    }

    setClearAllDialogOpen(true);
  };

  const handleConfirmClearAll = async () => {
    setIsClearing(true);
    
    try {
      await deleteAllRoles();
      
      toast({
        title: "Org Chart Cleared",
        description: `Successfully deleted ${roles.length} role${roles.length !== 1 ? 's' : ''}`,
      });
      
      setClearAllDialogOpen(false);
    } catch (error) {
      logger.error('Error clearing org chart:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to clear org chart",
        variant: "destructive",
      });
    } finally {
      setIsClearing(false);
    }
  };

  const handleSaveRoleWrapper = async (roleData: any) => {
    const success = await handleSaveRole(roleData, selectedRole);
    if (success) {
      setIsRoleModalOpen(false);
      setSelectedRole(null);
      setParentRoleId(null);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <OrgChartHeader
        fetchError={fetchError}
        currentCompany={currentCompany}
        realtimeConnected={realtimeConnected}
        isSuperAdmin={isSuperAdmin}
        debugInfo={debugInfo}
        isLoading={isLoading}
      />

      <OrgChartControls
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        zoom={zoom}
        handleZoomIn={handleZoomIn}
        handleZoomOut={handleZoomOut}
        handleCollapseAll={handleCollapseAll}
        handleExpandAll={handleExpandAll}
        handleCreateRole={handleCreateRole}
        handleClearAllRoles={handleClearAllRoles}
        allAreCollapsed={allAreCollapsed}
        allAreExpanded={allAreExpanded}
        rolesWithChildrenCount={roleHierarchy.rolesWithChildren.size}
        currentCompany={currentCompany}
        roles={roles}
        templates={templates}
        onTemplateSelect={handleTemplateSelect}
        templatesLoading={templatesLoading}
        showResponsibilities={showResponsibilities}
        onToggleResponsibilities={toggleResponsibilities}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {isLoading && roles.length === 0 ? (
        <div className="flex-1">
          <OrgChartContentSkeleton 
            rolesCount={6} 
            variant="desktop"
          />
        </div>
      ) : isTemplateLoading ? (
        <div className="flex-1">
          <OrgChartContentSkeleton 
            rolesCount={8} 
            variant="desktop"
          />
        </div>
      ) : templatePreviewOpen && selectedTemplate ? (
        <TemplatePreview
          template={selectedTemplate}
          onUseTemplate={handleUseTemplateFromPreview}
          onBack={handleClosePreview}
          zoom={zoom}
        />
      ) : viewMode === 'list' ? (
        <OrgChartListView
          roles={roles}
          searchTerm={searchTerm}
          onEditRole={handleEditRole}
        />
      ) : (
        <OrgChartContent
          roles={roles}
          isLoading={isLoading}
          currentCompany={currentCompany}
          zoom={zoom}
          searchTerm={searchTerm}
          collapsedRoles={collapsedRoles}
          activeDragRoleId={activeDragRoleId}
          targetSiblingInfo={targetSiblingInfo}
          canDrop={canDrop}
          toggleCollapse={toggleCollapse}
          handleEditRole={handleEditRole}
          handleAddChild={handleAddChild}
          handleCreateRole={handleCreateRole}
          handleDragStart={handleDragStart}
          handleDragEnd={handleDragEnd}
          handleDragOver={handleDragOver}
          showResponsibilities={showResponsibilities}
        />
      )}

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
        onSave={handleSaveRoleWrapper}
        onDelete={handleDeleteRole}
      />

      <TemplateConfirmDialog
        open={templateDialogOpen}
        onOpenChange={setTemplateDialogOpen}
        templateName={selectedTemplate?.name || ''}
        onConfirm={handleTemplateConfirm}
        hasExistingRoles={roles.length > 0}
      />

      <ConfirmDeleteModal
        open={clearAllDialogOpen}
        onOpenChange={setClearAllDialogOpen}
        onConfirm={handleConfirmClearAll}
        title="Clear Entire Org Chart?"
        description="This will permanently delete all roles and their relationships from your organization chart."
        itemCount={roles.length}
        warningText="This action cannot be undone. All role data, assignments, and hierarchy will be permanently deleted."
        isLoading={isClearing}
        actionText="Clear All Roles"
      />
    </div>
  );
};
