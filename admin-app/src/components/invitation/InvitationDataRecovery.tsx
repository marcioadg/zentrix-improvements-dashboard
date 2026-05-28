
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, RefreshCw, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

interface RecoveryStatus {
  profile: boolean;
  companyMembership: boolean;
  userSettings: boolean;
  isRecovering: boolean;
}

export const InvitationDataRecovery = () => {
  const navigate = useNavigate();
  const [recoveryStatus, setRecoveryStatus] = useState<RecoveryStatus>({
    profile: false,
    companyMembership: false,
    userSettings: false,
    isRecovering: false
  });
  const [needsRecovery, setNeedsRecovery] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkDataIntegrity();
  }, []);

  const checkDataIntegrity = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      logger.log('🔍 Checking data integrity for user:', user.id);

      // Check profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      // Check company membership
      const { data: membership } = await supabase
        .from('company_members')
        .select('*')
        .eq('user_id', user.id)
        .limit(1);

      // Check user settings
      const { data: settings } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      const status = {
        profile: !!profile,
        companyMembership: !!(membership && membership.length > 0),
        userSettings: !!settings,
        isRecovering: false
      };

      setRecoveryStatus(status);
      
      const missingRecords = !status.profile || !status.companyMembership || !status.userSettings;
      setNeedsRecovery(missingRecords);

      if (missingRecords) {
        logger.log('⚠️ Missing user data detected:', status);
      }
    } catch (error) {
      logger.error('❌ Data integrity check failed:', error);
    }
  };

  const recoverUserData = async () => {
    setRecoveryStatus(prev => ({ ...prev, isRecovering: true }));

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user found');

      logger.log('🔧 Starting data recovery for user:', user.id);

      const metadata = user.user_metadata || {};
      
      // 1. Create/update profile
      if (!recoveryStatus.profile) {
        logger.log('📝 Creating profile record...');
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            full_name: metadata.full_name || user.email?.split('@')[0] || 'User',
            email: user.email || '',
            role: 'member',
            company_id: metadata.company_id || null
          });

        if (profileError) {
          logger.error('❌ Profile creation failed:', profileError);
          throw new Error('Failed to create profile');
        }
        logger.log('✅ Profile created successfully');
      }

      // 2. Create company membership
      if (!recoveryStatus.companyMembership && metadata.company_id) {
        logger.log('🏢 Creating company membership...');
        const { error: membershipError } = await supabase
          .from('company_members')
          .upsert({
            user_id: user.id,
            company_id: metadata.company_id,
            permission_level: 'member'
          });

        if (membershipError) {
          logger.error('❌ Company membership creation failed:', membershipError);
          throw new Error('Failed to create company membership');
        }
        logger.log('✅ Company membership created successfully');

        // Create team memberships if specified
        if (metadata.team_ids) {
          const teamIds = metadata.team_ids.split(',').filter(Boolean);
          if (teamIds.length > 0) {
            logger.log('👥 Creating team memberships...');
            const teamMemberships = teamIds.map(teamId => ({
              user_id: user.id,
              team_id: teamId
            }));

            const { error: teamError } = await supabase
              .from('team_members')
              .upsert(teamMemberships);

            if (teamError) {
              logger.error('❌ Team membership creation failed:', teamError);
            } else {
              logger.log('✅ Team memberships created successfully');
            }
          }
        }
      }

      // 3. Create user settings
      if (!recoveryStatus.userSettings) {
        logger.log('⚙️ Creating user settings...');
        const { error: settingsError } = await supabase
          .from('user_settings')
          .upsert({
            user_id: user.id,
            vote_limit: 3,
            current_company_id: metadata.company_id || null,
            week_start_day: 'monday',
            show_current_week: false,
            highlight_current_week: false,
            metric_name_column_width: 250
          });

        if (settingsError) {
          logger.error('❌ User settings creation failed:', settingsError);
          throw new Error('Failed to create user settings');
        }
        logger.log('✅ User settings created successfully');
      }

      toast({
        title: "Recovery Successful",
        description: "Your workspace data has been restored. Redirecting...",
      });

      logger.log('✅ InvitationDataRecovery: Data recovery completed, redirecting to dashboard');
      // Redirect to dashboard after successful recovery
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);

    } catch (error) {
      logger.error('💥 Data recovery failed:', error);
      toast({
        title: "Recovery Failed",
        description: error instanceof Error ? error.message : "Failed to recover user data",
        variant: "destructive",
      });
    } finally {
      setRecoveryStatus(prev => ({ ...prev, isRecovering: false }));
    }
  };

  if (!needsRecovery) return null;

  return (
    <Card className="w-full max-w-md mx-auto mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-warning">
          <AlertCircle className="h-5 w-5" />
          Workspace Setup Required
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Your account needs some additional setup to access the workspace.
        </p>
        
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            {recoveryStatus.profile ? (
              <CheckCircle className="h-4 w-4 text-success" />
            ) : (
              <AlertCircle className="h-4 w-4 text-warning" />
            )}
            <span>User Profile</span>
          </div>
          <div className="flex items-center gap-2">
            {recoveryStatus.companyMembership ? (
              <CheckCircle className="h-4 w-4 text-success" />
            ) : (
              <AlertCircle className="h-4 w-4 text-warning" />
            )}
            <span>Company Access</span>
          </div>
          <div className="flex items-center gap-2">
            {recoveryStatus.userSettings ? (
              <CheckCircle className="h-4 w-4 text-success" />
            ) : (
              <AlertCircle className="h-4 w-4 text-warning" />
            )}
            <span>User Settings</span>
          </div>
        </div>

        <Button 
          onClick={recoverUserData} 
          disabled={recoveryStatus.isRecovering}
          className="w-full"
        >
          {recoveryStatus.isRecovering ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Setting up workspace...
            </>
          ) : (
            'Complete Setup'
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
