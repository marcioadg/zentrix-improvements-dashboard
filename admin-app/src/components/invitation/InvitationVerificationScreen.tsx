
import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface InvitationData {
  email: string;
  fullName: string;
  companyName: string;
  invitedBy: string;
}

interface InvitationVerificationScreenProps {
  invitationData: InvitationData;
}

export const InvitationVerificationScreen: React.FC<InvitationVerificationScreenProps> = ({
  invitationData,
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-8 animate-fade-in">
      <div className="w-full max-w-md animate-scale-in">
        <Card className="p-12">
          <CardHeader className="text-center p-0 mb-8">
            <CardTitle className="text-3xl font-semibold tracking-tight mb-2">
              Check Your Email
            </CardTitle>
            <CardDescription className="text-lg">
              Please click the verification link in your invitation email to continue setting up your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="mb-6 p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Invitation sent to:</p>
              <p className="font-medium">{invitationData.email}</p>
              <p className="text-sm text-muted-foreground mt-2">
                Company: {invitationData.companyName}
              </p>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Didn't receive the email? Check your spam folder or contact your administrator.
              </p>
              <Link to="/login">
                <Button variant="outline">Go to Login</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
