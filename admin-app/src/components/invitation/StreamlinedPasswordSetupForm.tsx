
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
  companyId?: string;
  teamIds?: string[];
}

interface StreamlinedPasswordSetupFormProps {
  invitationData: InvitationData;
  onPasswordSetup?: (password: string, confirmPassword: string) => Promise<void>;
  onComplete?: () => void;
}

export const StreamlinedPasswordSetupForm: React.FC<StreamlinedPasswordSetupFormProps> = ({
  invitationData,
  onPasswordSetup,
  onComplete,
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
      // If custom invitation flow (onPasswordSetup provided)
      if (onPasswordSetup) {
        logger.debug('Using custom invitation password setup');
        await onPasswordSetup(formData.password, formData.confirmPassword);
        return;
      }

      // Legacy invitation flow
      logger.debug('Using legacy invitation password setup');
      
      // Since the user is already authenticated via token verification,
      // we just need to update their password
      const { error: updateError } = await supabase.auth.updateUser({
        password: formData.password,
        data: {
          full_name: invitationData.fullName,
          company_name: invitationData.companyName,
          invitation_completed: true
        }
      });

      if (updateError) {
        logger.error('Error updating user password:', updateError);
        toast({
          title: "Error",
          description: updateError.message,
          variant: "destructive",
        });
        return;
      }

      logger.debug('User password updated successfully');
      
      // Get current user to perform post-setup operations
      const { data: { user } } = await supabase.auth.getUser();
      
      // If we have a user and company ID, add them to company and teams
      if (user && invitationData.companyId) {
        try {
          // Add user to company_members
          const { error: companyError } = await supabase
            .from('company_members')
            .insert({
              user_id: user.id,
              company_id: invitationData.companyId,
              permission_level: 'member',
              joined_at: new Date().toISOString()
            });

          if (companyError) {
            logger.error('Error adding user to company_members:', companyError);
          } else {
            logger.debug('Added user to company_members');
          }

          // Create team memberships if team IDs are provided
          if (invitationData.teamIds && invitationData.teamIds.length > 0) {
            logger.debug('Creating team memberships', { count: invitationData.teamIds.length });
            
            const teamMembers = invitationData.teamIds.map(teamId => ({
              team_id: teamId,
              user_id: user.id
            }));

            const { error: teamError } = await supabase
              .from('team_members')
              .insert(teamMembers);

            if (teamError) {
              logger.error('Error adding user to teams:', teamError);
            } else {
              logger.debug('Added user to teams');
            }
          }
        } catch (error) {
          logger.error('Error during post-signup setup:', error);
          // Don't block the flow for team/company assignment errors
        }
      }
      
      const teamText = invitationData.teamIds && invitationData.teamIds.length > 0 
        ? ` You've been assigned to ${invitationData.teamIds.length} team${invitationData.teamIds.length !== 1 ? 's' : ''}.` 
        : '';
      
      toast({
        title: "Welcome!",
        description: `Your account has been set up successfully! Welcome to ${invitationData.companyName}!${teamText}`,
      });

      // Call onComplete if provided, otherwise navigate to dashboard
      if (onComplete) {
        onComplete();
      } else {
        logger.log('✅ StreamlinedPasswordSetupForm: Password setup completed, redirecting to dashboard');
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      }

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
              Join {invitationData.companyName}
            </CardTitle>
            <CardDescription className="text-lg">
              Complete your invitation by setting your password
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="mb-6 p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">
                Setting up access for:
              </p>
              <p className="font-medium">{invitationData.fullName}</p>
              <p className="text-sm text-muted-foreground">{invitationData.email}</p>
              <p className="text-xs text-primary mt-2">
                ✓ Invitation verified successfully
              </p>
              {invitationData.teamIds && invitationData.teamIds.length > 0 && (
                <p className="text-xs text-success mt-1">
                  ✓ Will be assigned to {invitationData.teamIds.length} team{invitationData.teamIds.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="password" className="text-sm font-semibold tracking-tight">
                  Create Password
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
                  ? "Setting up your account..." 
                  : `Join ${invitationData.companyName}`
                }
              </Button>
            </form>

            <div className="mt-8 text-center">
              <div className="text-sm text-muted-foreground">
                Already have an account with a different email?{" "}
                <Link to="/login" className="text-foreground font-semibold hover:underline">
                  Sign in instead
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
