
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

interface InvitationData {
  email: string;
  fullName: string;
  companyName: string;
  invitedBy: string;
}

interface PasswordSetupFormProps {
  invitationData: InvitationData;
}

export const PasswordSetupForm: React.FC<PasswordSetupFormProps> = ({
  invitationData,
}) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleResendInvitation = async () => {
    toast({
      title: "Resend Not Available",
      description: "Please contact your administrator to resend the invitation link.",
      variant: "default",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      logger.debug('Setting password for invited user');
      
      // MANDATORY SESSION WAIT BEFORE ANY updateUser CALL
      logger.debug('Waiting for session before updateUser');
      let sessionReady = false;
      for (let i = 0; i < 15; i++) {
        const { data: sessionCheck } = await supabase.auth.getSession();
        logger.debug(`Session attempt ${i + 1}:`, { hasSession: !!sessionCheck.session, hasUser: !!sessionCheck.session?.user?.id });
        if (sessionCheck.session && sessionCheck.session.user) {
          sessionReady = true;
          logger.debug('Session confirmed with authenticated user');
          break;
        }
        await new Promise(r => setTimeout(r, 500));
      }

      if (!sessionReady) {
        logger.error('Session not ready after 7.5 seconds');
        toast({
          title: "Session Error",
          description: "Your session is not ready. Please try the invitation link again.",
          variant: "destructive",
        });
        return;
      }

      logger.debug('Session confirmed, calling updateUser');
      
      // Update the user's password
      const { error } = await supabase.auth.updateUser({
        password: formData.password
      });

      if (error) {
        logger.error('Error updating password:', error);
        
        if (error.message.includes('Auth session missing')) {
          toast({
            title: "Session Expired",
            description: "Your invitation session has expired. Please click the invitation link in your email again.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive",
          });
        }
        return;
      }

      logger.debug('Password updated successfully in PasswordSetupForm');
      
      logger.log('✅ PasswordSetupForm: Account setup completed, redirecting to dashboard');
      toast({
        title: "Welcome!",
        description: `Your account has been set up successfully! Welcome to ${invitationData.companyName}!`,
      });

      // Navigate to dashboard after a short delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);

    } catch (error) {
      logger.error('Error completing invitation:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-8 animate-fade-in">
      <div className="w-full max-w-md animate-scale-in">
        <Card className="p-12">
          <CardHeader className="text-center p-0 mb-8">
            <CardTitle className="text-3xl font-semibold tracking-tight mb-2">
              Set Your Password
            </CardTitle>
            <CardDescription className="text-lg">
              Complete your invitation to {invitationData.companyName} by setting your password.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="mb-6 p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Setting up account for:</p>
              <p className="font-medium">{invitationData.fullName}</p>
              <p className="text-sm text-muted-foreground">{invitationData.email}</p>
              <p className="text-xs text-success mt-2">✓ Email verified</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="password" className="text-sm font-semibold tracking-tight">
                  Set Password
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  required
                  className="h-14 text-base"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="confirmPassword" className="text-sm font-semibold tracking-tight">
                  Confirm Password
                </Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm your password"
                  required
                  className="h-14 text-base"
                />
              </div>
              <Button
                type="submit"
                className="w-full h-14 text-base font-bold"
                disabled={loading}
              >
                {loading 
                  ? "Setting up..." 
                  : `Join ${invitationData.companyName}`
                }
              </Button>
            </form>

            <div className="mt-8 text-center">
              <div className="text-sm text-muted-foreground">
                Having trouble?{" "}
                <Link to="/login" className="text-foreground font-semibold hover:underline">
                  Try signing in instead
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
