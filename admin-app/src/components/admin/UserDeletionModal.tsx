
import React, { useState } from 'react';
import { AlertTriangle, User, Trash2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { SuperAdminUser } from '@/hooks/useSuperAdminUsers';
import { deleteUser } from '@/services/userDeletionService';
import { MultiUserSelector } from '@/components/shared/MultiUserSelector';
import { logger } from '@/lib/logger';

interface UserDeletionModalProps {
  user: SuperAdminUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserDeleted: () => void;
}

export const UserDeletionModal: React.FC<UserDeletionModalProps> = ({
  user,
  open,
  onOpenChange,
  onUserDeleted,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [enableTransfer, setEnableTransfer] = useState(false);
  const [selectedTransferUsers, setSelectedTransferUsers] = useState<string[]>([]);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const { toast } = useToast();

  // Load available users for transfer when transfer is enabled
  React.useEffect(() => {
    if (enableTransfer && user && open) {
      loadAvailableUsers();
    }
  }, [enableTransfer, user, open]);

  const loadAvailableUsers = async () => {
    if (!user) return;
    
    setLoadingUsers(true);
    try {
      // Get users from the same companies as the user being deleted
      const companyIds = user.company_memberships.map(cm => cm.company_id);
      
      if (companyIds.length === 0) {
        setAvailableUsers([]);
        return;
      }

      const { data: users, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, role')
        .in('company_id', companyIds)
        .neq('id', user.id) // Exclude the user being deleted
        .neq('role', 'inactive') // Exclude inactive users
        .order('full_name');

      if (error) {
        logger.error('Error loading users for transfer:', error);
        toast({
          title: "Error",
          description: "Failed to load available users for transfer",
          variant: "destructive",
        });
        setAvailableUsers([]);
      } else {
        setAvailableUsers(users || []);
      }
    } catch (error) {
      logger.error('Error loading users for transfer:', error);
      setAvailableUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  // ENHANCED: Verify deletion and trigger immediate refresh
  const verifyDeletionAndRefresh = async (userId: string) => {
    try {
      // Verify deletion worked
      const { data: verifyUser, error: verifyError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();
      
      if (!verifyError && verifyUser) {
        throw new Error('User still exists after deletion attempt');
      }
      
      logger.debug('User deletion verified successfully');
      
      // IMMEDIATE: Trigger onUserDeleted callback for immediate refresh
      onUserDeleted();
      
      return true;
    } catch (error) {
      logger.error('Deletion verification failed:', error);
      throw error;
    }
  };

  const handleDeleteUser = async () => {
    if (!user) return;

    // Validate transfer selection if transfer is enabled
    if (enableTransfer) {
      if (selectedTransferUsers.length === 0) {
        toast({
          title: "Transfer User Required",
          description: "Please select a user to transfer the data to",
          variant: "destructive",
        });
        return;
      }
      
      if (selectedTransferUsers.length > 1) {
        toast({
          title: "Single User Required",
          description: "Please select only one user to transfer the data to",
          variant: "destructive",
        });
        return;
      }
    }

    setIsDeleting(true);
    try {
      logger.debug('Starting admin user deletion process');

      // Get current user ID for permission checking
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        throw new Error('You must be logged in to perform this action');
      }

      const transferToUserId = enableTransfer ? selectedTransferUsers[0] : undefined;
      
      await deleteUser(user.id, currentUser.id, transferToUserId);

      const transferUser = transferToUserId ? availableUsers.find(u => u.id === transferToUserId) : null;
      const successMessage = enableTransfer && transferUser
        ? `${user.full_name} has been deleted and their data transferred to ${transferUser.full_name}.`
        : `${user.full_name} has been permanently deleted from the system.`;

      toast({
        title: "User Deleted",
        description: successMessage,
      });

      // ENHANCED: Verify deletion and trigger immediate refresh
      await verifyDeletionAndRefresh(user.id);
      
      onOpenChange(false);
    } catch (error) {
      logger.error('Admin user deletion failed:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete user",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const transferUser = selectedTransferUsers.length > 0 
    ? availableUsers.find(u => u.id === selectedTransferUsers[0])
    : null;

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete User Account
          </DialogTitle>
          <DialogDescription>
            This action will permanently delete the user and associated data. Choose whether to transfer their data to another user or delete it completely.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* User Info */}
          <div className="p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-3 mb-3">
              <User className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="font-medium">{user.full_name}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Role:</span>
                <Badge variant={user.role === 'super_admin' ? 'destructive' : 'outline'}>
                  {user.role}
                </Badge>
              </div>
              
              <div className="text-sm">
                <span className="font-medium">Company Access:</span> {user.company_memberships.length} companies
              </div>
              
              <div className="text-sm">
                <span className="font-medium">Team Memberships:</span> {user.team_memberships.length} teams
              </div>
            </div>
          </div>

          {/* Transfer Option */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="enable-transfer"
                checked={enableTransfer}
                onCheckedChange={setEnableTransfer}
              />
              <Label htmlFor="enable-transfer" className="text-sm font-medium">
                Transfer user data to another user instead of deleting it
              </Label>
            </div>

            {enableTransfer && (
              <div className="space-y-3 p-4 border rounded-lg bg-primary/5">
                <Label className="text-sm font-medium">
                  Select user to transfer data to:
                </Label>
                
                {loadingUsers ? (
                  <div className="text-sm text-muted-foreground">Loading available users...</div>
                ) : (
                  <MultiUserSelector
                    users={availableUsers}
                    selectedUserIds={selectedTransferUsers}
                    onSelectionChange={setSelectedTransferUsers}
                    placeholder="Select a user to receive the transferred data..."
                    headerInfo={{
                      title: "Available Users",
                      description: "Select one user from the same company to transfer data to"
                    }}
                  />
                )}

                {transferUser && (
                  <div className="flex items-center gap-2 text-sm text-primary">
                    <ArrowRight className="h-4 w-4" />
                    Data will be transferred to: <strong>{transferUser.full_name}</strong>
                  </div>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* What will happen */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">What will happen:</h4>
            
            {enableTransfer ? (
              <div className="space-y-2 text-sm">
                <div className="text-success">
                  <strong>Transferred to {transferUser?.full_name || 'selected user'}:</strong>
                  <ul className="mt-1 ml-4 list-disc space-y-1">
                    <li>Personal goals and tasks</li>
                    <li>Team goals ownership</li>
                    <li>Team tasks assignments</li>
                    <li>Kanban tasks and ownership</li>
                    <li>Metrics ownership</li>
                    <li>Issues ownership</li>
                  </ul>
                </div>
                
                <div className="text-red-700">
                  <strong>Permanently deleted:</strong>
                  <ul className="mt-1 ml-4 list-disc space-y-1">
                    <li>User account and profile</li>
                    <li>Team and company memberships</li>
                    <li>User settings and preferences</li>
                    <li>Voting history and ratings</li>
                    <li>Training progress and assignments</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-destructive/5 border border-red-200 rounded-md">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-red-800">Warning: This will permanently delete:</p>
                    <ul className="mt-1 text-red-700 list-disc list-inside space-y-1">
                      <li>User account and profile</li>
                      <li>All company and team memberships</li>
                      <li>All personal tasks, goals, and data</li>
                      <li>Team goals ownership (will become ownerless)</li>
                      <li>Team tasks assignments (will become unassigned)</li>
                      <li>Metrics ownership (will become ownerless)</li>
                      <li>All voting history and ratings</li>
                      <li>Training progress and assignments</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteUser}
            disabled={isDeleting || (enableTransfer && selectedTransferUsers.length !== 1)}
            className="flex items-center gap-2"
          >
            {isDeleting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                {enableTransfer ? 'Transferring & Deleting...' : 'Deleting...'}
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                {enableTransfer ? 'Transfer & Delete User' : 'Delete User'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
