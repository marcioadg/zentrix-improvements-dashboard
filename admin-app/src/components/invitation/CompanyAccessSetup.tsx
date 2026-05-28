
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';

interface InvitationData {
  email: string;
  fullName: string;
  companyName: string;
  invitedBy: string;
}

interface CompanyAccessSetupProps {
  invitationData: InvitationData;
}

export const CompanyAccessSetup: React.FC<CompanyAccessSetupProps> = ({
  invitationData,
}) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);

  const companyId = searchParams.get('company_id');
  const userId = searchParams.get('user_id');
  const teamIdsParam = searchParams.get('team_ids');

  useEffect(() => {
    // Auto-setup company access when component mounts
    if (user && companyId && userId && user.id === userId) {
      handleSetupAccess();
    }
  }, [user, companyId, userId]);

  const handleSetupAccess = async () => {
    if (!user || !companyId) {
      toast({
        title: "Error",
        description: "Missing required information for company access setup.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      logger.debug('Setting up company access for authenticated user');
      
      // Parse team IDs from URL parameter
      const teamIds = teamIdsParam ? teamIdsParam.split(',').filter(id => id.trim()) : [];
      logger.debug('Team assignments parsed', { count: teamIds.length });
      
      // Check if user already has a profile
      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        logger.error('Error checking existing profile:', profileError);
        throw new Error('Failed to check existing profile');
      }

      // Update or create profile with new company access
      if (!existingProfile) {
        // Create profile for existing user if they don't have one
        const { error: createProfileError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: invitationData.email,
            full_name: invitationData.fullName,
            role: 'member'
          });

        if (createProfileError) {
          logger.error('Error creating profile for existing user:', createProfileError);
          throw new Error('Failed to create profile for existing user');
        }
      }

      // Check if user is already a member of this company
      const { data: existingMembership, error: membershipCheckError } = await supabase
        .from('company_members')
        .select('id')
        .eq('user_id', user.id)
        .eq('company_id', companyId)
        .single();

      if (membershipCheckError && membershipCheckError.code !== 'PGRST116') {
        logger.error('Error checking company membership:', membershipCheckError);
        throw new Error('Failed to check company membership');
      }

      // Add user to company_members if not already a member
      if (!existingMembership) {
        logger.debug('Adding user to company members');
        const { error: companyMemberError } = await supabase
          .from('company_members')
          .insert({
            user_id: user.id,
            company_id: companyId,
            permission_level: 'member',
            status: 'active',
            joined_at: new Date().toISOString()
          });

        if (companyMemberError) {
          logger.error('Error adding user to company_members:', companyMemberError);
          throw new Error('Failed to add user to company');
        }
      }

      // Handle team assignments
      if (teamIds.length > 0) {
        logger.debug('Processing team assignments', { count: teamIds.length });
        
        // Validate that the teams exist and belong to the company
        const { data: validTeams, error: teamsError } = await supabase
          .from('teams')
          .select('id, name')
          .eq('company_id', companyId)
          .in('id', teamIds);

        if (teamsError) {
          logger.error('Error validating teams:', teamsError);
          throw new Error('Failed to validate teams');
        }

        if (validTeams && validTeams.length > 0) {
          logger.debug('Adding user to validated teams', { count: validTeams.length });
          
          // Simply add user to the invited teams - no removal logic needed
          const teamMemberships = validTeams.map(team => ({
            team_id: team.id,
            user_id: user.id
          }));

          // Use upsert to handle cases where user might already be in some teams
          const { error: membershipError } = await supabase
            .from('team_members')
            .upsert(teamMemberships, {
              onConflict: 'user_id,team_id',
              ignoreDuplicates: true
            });

          if (membershipError) {
            logger.error('Error adding user to teams:', membershipError);
            throw new Error('Failed to add user to teams');
          }

          logger.debug('Successfully added user to teams');
        }
      } else {
        // No specific teams provided; skip team assignment and rely on company membership only
        logger.debug('No specific teams provided; skipping team assignment');
      }

      setSetupComplete(true);

      toast({
        title: "Welcome!",
        description: `You now have access to ${invitationData.companyName}! Redirecting to dashboard...`,
      });

      // Navigate to dashboard after a short delay to show the success message
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);

    } catch (error) {
      logger.error('Error setting up company access:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred setting up company access",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (setupComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-8 animate-fade-in">
        <div className="w-full max-w-md animate-scale-in">
          <Card className="p-12">
            <CardHeader className="text-center p-0 mb-8">
              <CardTitle className="text-3xl font-semibold tracking-tight mb-2 text-success">
                Welcome to {invitationData.companyName}!
              </CardTitle>
              <CardDescription className="text-lg">
                Your company access has been set up successfully.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 text-center">
              <div className="mb-6 p-4 bg-success/5 rounded-lg border border-green-200">
                <p className="text-sm text-success mb-1">✓ Company access granted</p>
                <p className="font-medium text-green-800">{invitationData.fullName}</p>
                <p className="text-sm text-success">{invitationData.email}</p>
              </div>
              <p className="text-muted-foreground">
                Redirecting to your dashboard...
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-8 animate-fade-in">
      <div className="w-full max-w-md animate-scale-in">
        <Card className="p-12">
          <CardHeader className="text-center p-0 mb-8">
            <CardTitle className="text-3xl font-semibold tracking-tight mb-2">
              Complete Company Access
            </CardTitle>
            <CardDescription className="text-lg">
              Setting up your access to {invitationData.companyName}...
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="mb-6 p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Setting up access for:</p>
              <p className="font-medium">{invitationData.fullName}</p>
              <p className="text-sm text-muted-foreground">{invitationData.email}</p>
              <p className="text-sm text-primary mt-2">Company: {invitationData.companyName}</p>
            </div>

            {loading ? (
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto mb-4"></div>
                <p className="text-muted-foreground">Setting up your company access...</p>
              </div>
            ) : (
              <Button
                onClick={handleSetupAccess}
                className="w-full h-14 text-base font-bold"
              >
                Complete Access Setup
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
