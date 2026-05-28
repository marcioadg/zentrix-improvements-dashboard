
import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

export const useOrgChartActions = (
  currentCompany: any,
  checkUserPermissions: any,
  createRole: any,
  updateRole: any,
  deleteRole: any,
  setIsRoleModalOpen?: (open: boolean) => void,
  setSelectedRole?: (roleId: string | null) => void,
  setParentRoleId?: (parentId: string | null) => void
) => {
  const { toast } = useToast();

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
    logger.log('🔧 handleCreateRole: Starting role creation flow...');
    const hasPermission = await validatePermissions();
    if (!hasPermission) {
      logger.log('❌ handleCreateRole: Permission check failed');
      return false;
    }
    
    logger.log('✅ handleCreateRole: Permission check passed, opening modal...');
    if (setSelectedRole) setSelectedRole(null);
    if (setParentRoleId) setParentRoleId(null);
    if (setIsRoleModalOpen) setIsRoleModalOpen(true);
    
    return true;
  }, [validatePermissions, setIsRoleModalOpen, setSelectedRole, setParentRoleId]);

  const handleEditRole = useCallback(async (roleId: string) => {
    logger.log('🔧 handleEditRole: Starting role edit for:', roleId);
    const hasPermission = await validatePermissions();
    if (!hasPermission) {
      logger.log('❌ handleEditRole: Permission check failed');
      return false;
    }
    
    logger.log('✅ handleEditRole: Permission check passed, opening modal...');
    if (setSelectedRole) setSelectedRole(roleId);
    if (setParentRoleId) setParentRoleId(null);
    if (setIsRoleModalOpen) setIsRoleModalOpen(true);
    
    return true;
  }, [validatePermissions, setIsRoleModalOpen, setSelectedRole, setParentRoleId]);

  const handleAddChild = useCallback(async (parentId: string) => {
    logger.log('🔧 handleAddChild: Starting child role creation for parent:', parentId);
    const hasPermission = await validatePermissions();
    if (!hasPermission) {
      logger.log('❌ handleAddChild: Permission check failed');
      return false;
    }
    
    logger.log('✅ handleAddChild: Permission check passed, opening modal...');
    if (setSelectedRole) setSelectedRole(null);
    if (setParentRoleId) setParentRoleId(parentId);
    if (setIsRoleModalOpen) setIsRoleModalOpen(true);
    
    return true;
  }, [validatePermissions, setIsRoleModalOpen, setSelectedRole, setParentRoleId]);

  const handleSaveRole = useCallback(async (roleData: any, selectedRole: string | null) => {
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
      return true;
    } catch (error) {
      logger.error('Failed to save role:', error);
      const errorMessage = (error as any)?.message || 'An unexpected error occurred while saving the role.';
      
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
      return false;
    }
  }, [createRole, updateRole, currentCompany, toast]);

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

  return {
    handleCreateRole,
    handleEditRole,
    handleAddChild,
    handleSaveRole,
    handleDeleteRole
  };
};
