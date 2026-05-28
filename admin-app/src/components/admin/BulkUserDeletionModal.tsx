
import React, { useState } from 'react';
import { BaseModal } from '@/components/modals/BaseModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, Users, Trash2, ArrowRight } from 'lucide-react';
import { UserAvatar } from '@/components/UserAvatar';
import { SuperAdminUser } from '@/hooks/useSuperAdminUsers';

interface BulkUserDeletionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedUsers: SuperAdminUser[];
  allUsers: SuperAdminUser[];
  onConfirm: (userIds: string[], transferToUserId?: string, options?: { deleteData: boolean }) => Promise<void>;
  loading?: boolean;
}

export const BulkUserDeletionModal: React.FC<BulkUserDeletionModalProps> = ({
  open,
  onOpenChange,
  selectedUsers,
  allUsers,
  onConfirm,
  loading = false,
}) => {
  const [transferToUserId, setTransferToUserId] = useState<string>('');
  const [deleteData, setDeleteData] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  // Filter out selected users and super admins from transfer options
  const transferOptions = allUsers.filter(user => 
    !selectedUsers.some(selected => selected.id === user.id) &&
    user.role !== 'super_admin'
  );

  const hasDataToTransfer = selectedUsers.some(user => 
    user.company_memberships.length > 0
  );

  const confirmationText = `DELETE ${selectedUsers.length} USERS`;
  const isConfirmValid = confirmText === confirmationText;

  const handleConfirm = async () => {
    if (!isConfirmValid) return;
    
    const userIds = selectedUsers.map(user => user.id);
    await onConfirm(userIds, transferToUserId || undefined, { deleteData });
    
    // Reset form
    setTransferToUserId('');
    setDeleteData(false);
    setConfirmText('');
  };

  return (
    <BaseModal
      open={open}
      onOpenChange={onOpenChange}
      title="Bulk Delete Users"
      description={`You are about to permanently delete ${selectedUsers.length} user accounts. This action cannot be undone.`}
      onSubmit={handleConfirm}
      submitText={loading ? "Deleting..." : "Delete Users"}
      submitDisabled={loading || !isConfirmValid}
      loading={loading}
    >
      <div className="space-y-6">
        {/* Warning */}
        <div className="flex items-start gap-3 p-4 bg-destructive/5 border border-red-200 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-red-800 mb-1">
              This action will permanently delete {selectedUsers.length} user accounts
            </p>
            <p className="text-red-700">
              • All user data will be removed from the system
              • Users will lose access to all companies and teams
              • This action cannot be undone
            </p>
          </div>
        </div>

        {/* Selected Users List */}
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users to Delete ({selectedUsers.length})
          </Label>
          <div className="max-h-48 overflow-y-auto border rounded-lg">
            {selectedUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-3 border-b last:border-b-0">
                <div className="flex items-center gap-3">
                  <UserAvatar 
                    fullName={user.full_name}
                    email={user.email}
                    size="sm"
                  />
                  <div>
                    <p className="font-medium text-sm">{user.full_name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {user.role === 'super_admin' && (
                    <Badge variant="destructive">Super Admin</Badge>
                  )}
                  <Badge variant="outline">
                    {user.company_memberships.length} companies
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Data Transfer Option */}
        {hasDataToTransfer && !deleteData && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              Transfer User Data (Optional)
            </Label>
            <Select value={transferToUserId} onValueChange={setTransferToUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Select user to receive transferred data" />
              </SelectTrigger>
              <SelectContent>
                {transferOptions.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex items-center gap-2">
                      <UserAvatar 
                        fullName={user.full_name}
                        email={user.email}
                        size="sm"
                      />
                      <span>{user.full_name} ({user.email})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {transferToUserId && (
              <div className="text-xs text-muted-foreground">
                Tasks, metrics, and other transferable data will be assigned to the selected user.
              </div>
            )}
          </div>
        )}

        {/* Delete Data Option */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="deleteData"
            checked={deleteData}
            onCheckedChange={(checked) => setDeleteData(!!checked)}
          />
          <Label htmlFor="deleteData" className="text-sm">
            Delete all user data (tasks, metrics, etc.) instead of transferring
          </Label>
        </div>

        {/* Confirmation Input */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Type "{confirmationText}" to confirm deletion:
          </Label>
          <Input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={confirmationText}
            disabled={loading}
          />
        </div>

        {/* Summary */}
        <div className="p-3 bg-muted rounded-lg text-sm">
          <p className="font-medium mb-1">Action Summary:</p>
          <ul className="text-muted-foreground space-y-1">
            <li>• {selectedUsers.length} users will be permanently deleted</li>
            {transferToUserId && !deleteData && (
              <li>• User data will be transferred to the selected user</li>
            )}
            {deleteData && (
              <li>• All user data will be permanently deleted</li>
            )}
            {!transferToUserId && !deleteData && (
              <li>• User data will be set to unassigned/ownerless</li>
            )}
          </ul>
        </div>
      </div>
    </BaseModal>
  );
};
