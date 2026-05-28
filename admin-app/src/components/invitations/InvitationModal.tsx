import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Calendar, User, Mail, RefreshCw } from "lucide-react";
import { usePendingInvitations } from '@/hooks/usePendingInvitations';

interface InvitationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvitationAccepted?: () => void;
}

export const InvitationModal = ({ open, onOpenChange, onInvitationAccepted }: InvitationModalProps) => {
  const { invitations, acceptInvitation, declineInvitation, refetch, loading } = usePendingInvitations();
  const [processing, setProcessing] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleAccept = async (companyId: string) => {
    setProcessing(companyId);
    const success = await acceptInvitation(companyId, onInvitationAccepted);
    if (success) {
      onOpenChange(false);
    }
    setProcessing(null);
  };

  const handleDecline = async (companyId: string) => {
    setProcessing(companyId);
    await declineInvitation(companyId);
    setProcessing(null);
  };

  // Don't show modal if closed, but allow it to open even with no invitations
  if (!open) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader className="relative">
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Company Invitations
          </DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="absolute top-0 right-0 h-8 w-8 p-0"
            title="Refresh invitations"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          <DialogDescription>
            {invitations.length > 0 
              ? "You have pending invitations to join the following companies."
              : "You currently have no pending company invitations."
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {invitations.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <Mail className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">No pending invitations at this time.</p>
              <p className="text-sm text-muted-foreground mt-2">
                When someone invites you to join their company, it will appear here.
              </p>
            </div>
          ) : (
            invitations.map((invitation) => (
            <div
              key={invitation.company_id}
              className="border rounded-lg p-4 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h4 className="font-semibold text-lg">{invitation.company_name}</h4>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    Invited by {invitation.inviter_name}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {new Date(invitation.invited_at).toLocaleDateString()}
                  </div>
                </div>
                <Badge variant="secondary">
                  {invitation.permission_level}
                </Badge>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => handleAccept(invitation.company_id)}
                  disabled={processing === invitation.company_id}
                  className="flex-1"
                >
                  {processing === invitation.company_id ? "Processing..." : "Accept"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleDecline(invitation.company_id)}
                  disabled={processing === invitation.company_id}
                  className="flex-1"
                >
                  Decline
                </Button>
              </div>
            </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};