
import React from 'react';
import { UserProfileModal } from '@/components/modals/UserProfileModal';
import { AddMemberModal } from '@/components/modals/AddMemberModal';
import { EditUserNameModal } from '@/components/modals/EditUserNameModal';
import { ConfirmDeleteModal } from '@/components/modals/ConfirmDeleteModal';

import { UnifiedUser } from '@/hooks/useUserManagement';
import { logger } from '@/utils/logger';

interface PeopleModalsProps {
  // Modal states
  selectedUser: UnifiedUser | null;
  showUserProfile: boolean;
  showAddMember: boolean;
  showEditName: boolean;
  showDeleteConfirm: boolean;
  userToEdit: UnifiedUser | null;
  deleteAction: 'deactivate' | 'delete' | 'reactivate';
  isDeleting?: boolean;

  // Modal handlers
  onUserProfileChange: (open: boolean) => void;
  onAddMemberChange: (open: boolean) => void;
  onEditNameChange: (open: boolean) => void;
  onDeleteConfirmChange: (open: boolean) => void;

  // Actions
  onSaveName: (newName: string) => Promise<boolean>;
  onConfirmAction: () => Promise<void>;
  onMemberAdded: () => void;
  onUserUpdated?: () => void;
}

export const PeopleModals: React.FC<PeopleModalsProps> = ({
  selectedUser,
  showUserProfile,
  showAddMember,
  showEditName,
  showDeleteConfirm,
  userToEdit,
  deleteAction,
  isDeleting = false,
  onUserProfileChange,
  onAddMemberChange,
  onEditNameChange,
  onDeleteConfirmChange,
  onSaveName,
  onConfirmAction,
  onMemberAdded,
  onUserUpdated
}) => {
  // Enhanced callback to ensure comprehensive data refresh
  const handleUserUpdated = () => {
    logger.log('🔄 PeopleModals: User updated callback triggered');
    if (onUserUpdated) {
      logger.log('🔄 PeopleModals: Calling onUserUpdated callback');
      onUserUpdated();
    } else {
      logger.warn('⚠️ PeopleModals: onUserUpdated callback not provided');
    }
  };

  return (
    <>
      <UserProfileModal
        open={showUserProfile}
        onOpenChange={onUserProfileChange}
        user={selectedUser}
        onUserUpdated={handleUserUpdated}
      />

      <AddMemberModal
        open={showAddMember}
        onOpenChange={onAddMemberChange}
        onMemberAdded={onMemberAdded}
      />

      <EditUserNameModal
        open={showEditName}
        onOpenChange={onEditNameChange}
        currentName={userToEdit?.full_name || ''}
        onSave={onSaveName}
      />

      <ConfirmDeleteModal
        open={showDeleteConfirm}
        onOpenChange={onDeleteConfirmChange}
        onConfirm={onConfirmAction}
        title={
          deleteAction === 'deactivate' ? 'Deactivate User' : 
          deleteAction === 'reactivate' ? 'Reactivate User' : 
          'Remove User from Company'
        }
        description={
          deleteAction === 'deactivate' 
            ? `Are you sure you want to deactivate ${userToEdit?.full_name || userToEdit?.email || 'this user'}? They will immediately lose access to this company and will no longer see it in their company list.`
            : deleteAction === 'reactivate'
            ? `Are you sure you want to reactivate ${userToEdit?.full_name || userToEdit?.email || 'this user'}? They will regain full access to this company and it will appear in their company list again.`
            : `Are you sure you want to remove ${userToEdit?.full_name || userToEdit?.email || 'this user'} from this company? They will lose access to this company but their account will remain active.`
        }
        warningText={
          deleteAction === 'delete' 
            ? 'This will remove the user from this company only. Their account and data in other companies will remain intact.'
            : deleteAction === 'reactivate'
            ? 'The user will be marked as active and regain full access to the company. They will be able to view company data, access all systems, and switch to this company.'
            : 'The user will be marked as inactive and shown with "Inactive" status in the user list. They will not be able to access this company, view company data, or switch to this company. They can be reactivated later to restore full access.'
        }
        actionText={
          deleteAction === 'deactivate' ? 'Deactivate' : 
          deleteAction === 'reactivate' ? 'Reactivate' : 
          'Remove from Company'
        }
        isLoading={isDeleting}
      />
    </>
  );
};
