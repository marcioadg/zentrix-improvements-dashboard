
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface RoleAssignmentResult {
  success: boolean;
  error?: string;
  assignmentId?: string;
}

export class RoleAssignmentService {
  /**
   * Check if user has permission to manage org roles for a company
   */
  static async checkOrgManagementPermission(userId: string, companyId: string): Promise<boolean> {
    try {
      logger.log('🔍 RoleAssignmentService: Checking org management permission:', {
        userId,
        companyId
      });

      const { data, error } = await supabase
        .rpc('check_org_management_permission', {
          p_user_id: userId,
          p_company_id: companyId
        });

      if (error) {
        logger.error('🚨 Permission check failed:', error);
        return false;
      }

      logger.log('✅ Permission check result:', data);
      return data === true;
    } catch (error) {
      logger.error('🚨 Exception checking org management permission:', error);
      return false;
    }
  }

  /**
   * Validate user has access to the company before role operations
   */
  static async validateUserCompanyAccess(userId: string, companyId: string): Promise<boolean> {
    try {
      const { data: userAccess } = await supabase
        .rpc('get_user_company_access', {
          user_id_param: userId,
          company_id_param: companyId
        });

      return userAccess === true;
    } catch (error) {
      logger.error('🚨 Error validating user company access:', error);
      return false;
    }
  }

  /**
   * Safely assign a user to a role with comprehensive permission checks
   */
  static async assignUserToRole(
    roleId: string, 
    userId: string, 
    companyId: string,
    currentUserId: string
  ): Promise<RoleAssignmentResult> {
    try {
      logger.log('🔍 RoleAssignmentService: Starting role assignment:', {
        roleId,
        userId,
        companyId,
        currentUserId
      });

      // Check if current user has permission to manage org roles
      const hasPermission = await this.checkOrgManagementPermission(currentUserId, companyId);
      
      if (!hasPermission) {
        logger.error('🚨 Permission denied for user:', currentUserId);
        return {
          success: false,
          error: 'You do not have permission to assign users to roles in this company. You need owner, admin, or manager permissions.'
        };
      }

      // Validate that the target user has access to the company
      const userHasAccess = await this.validateUserCompanyAccess(userId, companyId);

      if (!userHasAccess) {
        logger.error('🚨 Target user has no access to company:', { userId, companyId });
        return {
          success: false,
          error: 'The selected user does not have access to this company. Please ensure they are a member of the company first.'
        };
      }

      // Clear any existing assignments for this role (only one person per role)
      logger.log('🔍 Clearing existing assignments for role:', roleId);
      const { error: deleteError } = await supabase
        .from('role_assignments')
        .delete()
        .eq('role_id', roleId);

      if (deleteError) {
        logger.error('🚨 Failed to clear existing assignments:', deleteError);
        // Continue anyway - we'll try to create the new assignment
      } else {
        logger.log('✅ Successfully cleared existing assignments');
      }

      // Create the new assignment
      logger.log('🔍 Creating new role assignment');
      const { data: assignment, error: assignError } = await supabase
        .from('role_assignments')
        .insert({
          role_id: roleId,
          user_id: userId
        })
        .select()
        .single();

      if (assignError) {
        logger.error('🚨 Role assignment failed:', assignError);
        
        // Provide user-friendly error messages
        if (assignError.code === '42501' || assignError.message.includes('row-level security')) {
          return {
            success: false,
            error: 'Permission denied. Please check that you have the necessary permissions to assign roles in this company.'
          };
        }
        
        if (assignError.code === '23505') {
          return {
            success: false,
            error: 'This user is already assigned to this role. Please try again.'
          };
        }
        
        return {
          success: false,
          error: `Failed to assign role: ${assignError.message || 'Unknown error occurred'}`
        };
      }

      logger.log('✅ Role assignment successful:', assignment);
      return {
        success: true,
        assignmentId: assignment.id
      };

    } catch (error) {
      logger.error('🚨 Exception in role assignment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred during role assignment'
      };
    }
  }

  /**
   * Remove user assignment from a role
   */
  static async removeUserFromRole(
    roleId: string,
    companyId: string,
    currentUserId: string
  ): Promise<RoleAssignmentResult> {
    try {
      logger.log('🔍 RoleAssignmentService: Removing user from role:', {
        roleId,
        companyId,
        currentUserId
      });

      // Check permissions
      const hasPermission = await this.checkOrgManagementPermission(currentUserId, companyId);
      
      if (!hasPermission) {
        logger.error('🚨 Permission denied for role removal:', currentUserId);
        return {
          success: false,
          error: 'You do not have permission to modify role assignments in this company.'
        };
      }

      const { error } = await supabase
        .from('role_assignments')
        .delete()
        .eq('role_id', roleId);

      if (error) {
        logger.error('🚨 Failed to remove role assignment:', error);
        return {
          success: false,
          error: `Failed to remove assignment: ${error.message || 'Unknown error occurred'}`
        };
      }

      logger.log('✅ Role assignment removed successfully');
      return { success: true };
    } catch (error) {
      logger.error('🚨 Exception removing role assignment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred while removing the assignment'
      };
    }
  }
}
