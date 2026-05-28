import { logger } from '@/utils/logger';

interface DatabaseError extends Error {
  code?: string;
  details?: string;
  hint?: string;
}

export const getUserErrorMessage = (error: any, operation: string): { title: string; description: string; variant?: "destructive" } => {
  logger.log('🔍 getUserErrorMessage: Processing error for operation:', operation, error);
  
  if (error instanceof Error) {
    if (error.message === 'SELF_DEACTIVATION') {
      return {
        title: "Cannot Deactivate Yourself",
        description: "You cannot deactivate your own account. Ask another manager or owner to do this for you.",
        variant: "destructive",
      };
    }
    
    if (error.message === 'SELF_DELETION') {
      return {
        title: "Cannot Delete Yourself",
        description: "You cannot delete your own account. Ask another manager or owner to do this for you.",
        variant: "destructive",
      };
    }

    if (error.message.includes('Insufficient permissions')) {
      return {
        title: "Permission Denied",
        description: error.message,
        variant: "destructive",
      };
    }

    if (error.message.includes('Target user not found')) {
      return {
        title: "User Not Found",
        description: "The user you're trying to manage could not be found or may have been deleted already.",
        variant: "destructive",
      };
    }

    if (error.message.includes('Failed to verify permissions')) {
      return {
        title: "Permission Verification Failed",
        description: "Unable to verify your permissions. Please try signing out and back in.",
        variant: "destructive",
      };
    }

    if (error.message.includes('row-level security') || error.message.includes('insufficient_privilege')) {
      return {
        title: "Access Denied",
        description: `You don't have permission to ${operation}. Only managers and owners can ${operation} users in their company.`,
        variant: "destructive",
      };
    }

    const dbError = error as DatabaseError;
    
    if (dbError.code === '42501') {
      return {
        title: "Insufficient Database Permissions",
        description: "Your current role doesn't allow you to manage users. Contact an owner or administrator.",
        variant: "destructive",
      };
    }

    if (dbError.code === '23503') {
      if (operation.includes('delete')) {
        return {
          title: "Cannot Delete User",
          description: "This user has associated data that prevents deletion. The system tried to clean up related data but some constraints remain. Try again or contact support.",
          variant: "destructive",
        };
      } else {
        return {
          title: "Cannot Deactivate User",
          description: "This user has associated data that prevents deactivation. Remove or reassign their data first.",
          variant: "destructive",
        };
      }
    }

    if (error.message.includes('no rows') && error.message.includes('updated')) {
      return {
        title: "Update Failed",
        description: "No changes were made. The user may not exist or you may not have permission to modify them.",
        variant: "destructive",
      };
    }

    if (error.message.includes('no rows') && error.message.includes('deleted')) {
      return {
        title: "Deletion Failed",
        description: "No user was deleted. The user may not exist or you may not have permission to delete them.",
        variant: "destructive",
      };
    }

    if (error.message.includes('network') || error.message.includes('fetch')) {
      return {
        title: "Network Error",
        description: "Unable to connect to the server. Please check your internet connection and try again.",
        variant: "destructive",
      };
    }

    return {
      title: "Error",
      description: `Failed to ${operation}: ${error.message}`,
      variant: "destructive",
    };
  }

  return {
    title: "Unknown Error",
    description: `An unexpected error occurred while trying to ${operation}. Please try again or contact support.`,
    variant: "destructive",
  };
};
