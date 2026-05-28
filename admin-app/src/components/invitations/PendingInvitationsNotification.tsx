import React from 'react';
import { usePendingInvitations } from '@/hooks/usePendingInvitations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Calendar, UserCheck } from 'lucide-react';
import { format } from 'date-fns';

export const PendingInvitationsNotification = () => {
  const { invitations, loading, acceptInvitation, declineInvitation } = usePendingInvitations();

  if (loading || invitations.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 mb-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-foreground">
          You have pending company invitations
        </h3>
        <p className="text-sm text-muted-foreground">
          Review and respond to your pending invitations below
        </p>
      </div>
      
      {invitations.map((invitation) => (
        <Card key={`${invitation.company_id}-${invitation.invited_at}`} className="border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">{invitation.company_name}</CardTitle>
              </div>
              <Badge variant="outline" className="text-xs">
                {invitation.permission_level}
              </Badge>
            </div>
            <CardDescription className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1">
                <UserCheck className="h-4 w-4" />
                Invited by {invitation.inviter_name}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {format(new Date(invitation.invited_at), 'MMM d, yyyy')}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex gap-3">
              <Button 
                onClick={() => acceptInvitation(invitation.company_id)}
                className="flex-1"
                size="sm"
              >
                Accept Invitation
              </Button>
              <Button 
                onClick={() => declineInvitation(invitation.company_id)}
                variant="outline"
                className="flex-1"
                size="sm"
              >
                Decline
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};