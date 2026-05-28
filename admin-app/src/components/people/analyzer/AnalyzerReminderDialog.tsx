import React, { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Users } from 'lucide-react';
import { logger } from '@/utils/logger';

interface EligibleUser {
  id: string;
  full_name: string;
  email: string;
}

interface AnalyzerReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  senderName: string;
  companyId: string;
}

export const AnalyzerReminderDialog: React.FC<AnalyzerReminderDialogProps> = ({
  open,
  onOpenChange,
  senderName,
  companyId,
}) => {
  const { toast } = useToast();
  const [sending, setSending] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [eligibleUsers, setEligibleUsers] = useState<EligibleUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Fetch ALL users who have subordinates (people reporting to them) - company-wide
  useEffect(() => {
    if (!open || !companyId) return;

    const fetchEligibleUsers = async () => {
      setLoadingUsers(true);
      try {
        // Get all org roles for the company
        const { data: orgRoles } = await supabase
          .from('org_roles')
          .select('id, reports_to_role_id')
          .eq('company_id', companyId);

        if (!orgRoles || orgRoles.length === 0) {
          setEligibleUsers([]);
          setLoadingUsers(false);
          return;
        }

        // Find roles that have at least one role reporting to them
        const rolesWithReports = new Set<string>();
        for (const role of orgRoles) {
          if (role.reports_to_role_id) {
            rolesWithReports.add(role.reports_to_role_id);
          }
        }

        if (rolesWithReports.size === 0) {
          setEligibleUsers([]);
          setLoadingUsers(false);
          return;
        }

        // Get users assigned to these roles
        const { data: roleAssignments } = await supabase
          .from('role_assignments')
          .select('user_id, role_id')
          .in('role_id', Array.from(rolesWithReports));

        if (!roleAssignments || roleAssignments.length === 0) {
          setEligibleUsers([]);
          setLoadingUsers(false);
          return;
        }

        const userIdsWithSubordinates = roleAssignments.map(ra => ra.user_id);

        // Fetch user details for these users from company_members + profiles
        const { data: companyMembers } = await supabase
          .from('company_members')
          .select(`
            user_id,
            status,
            profiles:user_id (
              id,
              full_name,
              email
            )
          `)
          .eq('company_id', companyId)
          .in('user_id', userIdsWithSubordinates)
          .not('status', 'eq', 'inactive')
          .not('status', 'eq', 'pending');

        if (companyMembers) {
          const users: EligibleUser[] = companyMembers
            .filter(cm => cm.profiles && (cm.profiles as any).email)
            .map(cm => ({
              id: (cm.profiles as any).id,
              full_name: (cm.profiles as any).full_name || 'Unknown',
              email: (cm.profiles as any).email,
            }))
            .sort((a, b) => a.full_name.localeCompare(b.full_name));
          
          setEligibleUsers(users);
        }
      } catch (error) {
        logger.error('Error fetching eligible users:', error);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchEligibleUsers();
  }, [open, companyId]);

  // Initialize selection with eligible users when they are loaded
  useEffect(() => {
    if (open && !loadingUsers && eligibleUsers.length > 0) {
      setSelectedUserIds(new Set(eligibleUsers.map(u => u.id)));
    }
  }, [open, loadingUsers, eligibleUsers]);

  const handleToggleUser = (userId: string) => {
    setSelectedUserIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedUserIds.size === eligibleUsers.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(eligibleUsers.map(u => u.id)));
    }
  };

  const handleSendReminders = async () => {
    if (selectedUserIds.size === 0) {
      toast({
        title: 'No users selected',
        description: 'Please select at least one user to send the reminder.',
        variant: 'destructive',
      });
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-analyzer-reminder', {
        body: {
          userIds: Array.from(selectedUserIds),
          companyId,
          senderName,
        },
      });

      if (error) {
        throw error;
      }

      toast({
        title: 'Reminders sent',
        description: `Successfully sent ${data.sent} reminder${data.sent === 1 ? '' : 's'}.${data.failed > 0 ? ` ${data.failed} failed.` : ''}`,
      });

      onOpenChange(false);
    } catch (error) {
      logger.error('Failed to send reminders:', error);
      toast({
        title: 'Failed to send reminders',
        description: 'An error occurred while sending the reminder emails.',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Evaluation Reminder
          </DialogTitle>
          <DialogDescription>
            Select managers to notify. Only users with team members to evaluate are shown.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {loadingUsers ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading eligible users...</span>
            </div>
          ) : (
            <>
              {/* Select All */}
              <div className="flex items-center justify-between mb-3 pb-2 border-b">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {selectedUserIds.size} of {eligibleUsers.length} selected
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                  disabled={eligibleUsers.length === 0}
                >
                  {selectedUserIds.size === eligibleUsers.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>

              {/* User List */}
              <ScrollArea className="h-[280px] pr-4">
                <div className="space-y-2">
                  {eligibleUsers.map(user => (
                    <label
                      key={user.id}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedUserIds.has(user.id)}
                        onCheckedChange={() => handleToggleUser(user.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {user.full_name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </p>
                      </div>
                    </label>
                  ))}
                  {eligibleUsers.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No users with team members to evaluate.
                    </p>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSendReminders} disabled={sending || selectedUserIds.size === 0}>
            {sending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Send to {selectedUserIds.size} {selectedUserIds.size === 1 ? 'person' : 'people'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
