
import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const InvitationErrorScreen: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-8">
      <Card className="w-full max-w-md p-8">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-destructive">Invitation Issue</CardTitle>
          <CardDescription>
            There was an issue processing your invitation link.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              This could happen if:
            </p>
            <ul className="text-xs text-muted-foreground text-left space-y-1">
              <li>• The invitation link has expired (after 24 hours)</li>
              <li>• The link was already used</li>
              <li>• There was a temporary connection issue</li>
              <li>• You didn't verify your email within the time limit</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm font-medium">What you can try:</p>
            <div className="flex flex-col gap-2">
              <Button asChild variant="default" className="w-full">
                <Link to="/login">Try Signing In</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to="/">Go to Home</Link>
              </Button>
            </div>
          </div>
          
          <div className="pt-4 border-t space-y-2">
            <p className="text-xs text-muted-foreground font-medium">
              Need a new invitation?
            </p>
            <p className="text-xs text-muted-foreground">
              Contact your administrator to resend the invitation. Make sure to click the email verification link within 24 hours of receiving the new invitation.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
