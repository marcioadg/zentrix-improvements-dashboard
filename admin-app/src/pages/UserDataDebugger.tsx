import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { logger } from '@/utils/logger';
interface UserDataStatus {
  user: any;
  profile: {
    data: any;
    error: any;
  };
  memberships: {
    data: any;
    error: any;
  };
  companies: {
    data: any;
    error: any;
  };
  userSettings: {
    data: any;
    error: any;
  };
  teams: {
    data: any;
    error: any;
  };
}
export const UserDataDebugger = () => {
  const [debugData, setDebugData] = useState<UserDataStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const checkUserData = async () => {
    setLoading(true);
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (user) {
        logger.log('🔍 Debug: Checking user data for:', user.id);

        // Check profile
        const {
          data: profile,
          error: profileError
        } = await supabase.from('profiles').select('*').eq('id', user.id).single();

        // Check company memberships
        const {
          data: memberships,
          error: membershipError
        } = await supabase.from('company_members').select('*, companies(*)').eq('user_id', user.id);

        // Check companies (all companies for reference)
        const {
          data: companies,
          error: companiesError
        } = await supabase.from('companies').select('*').limit(10);

        // Check user settings
        const {
          data: userSettings,
          error: userSettingsError
        } = await supabase.from('user_settings').select('*').eq('user_id', user.id).single();

        // Check team memberships
        const {
          data: teams,
          error: teamsError
        } = await supabase.from('team_members').select('id, user_id, team_id, joined_at, teams(*)').eq('user_id', user.id);
        setDebugData({
          user: {
            id: user.id,
            email: user.email,
            metadata: user.user_metadata,
            app_metadata: user.app_metadata,
            created_at: user.created_at
          },
          profile: {
            data: profile,
            error: profileError
          },
          memberships: {
            data: memberships,
            error: membershipError
          },
          companies: {
            data: companies,
            error: companiesError
          },
          userSettings: {
            data: userSettings,
            error: userSettingsError
          },
          teams: {
            data: teams,
            error: teamsError
          }
        });
        logger.log('🔍 Debug data collected:', {
          hasProfile: !!profile,
          hasMemberships: !!(memberships && memberships.length > 0),
          hasUserSettings: !!userSettings,
          hasTeams: !!(teams && teams.length > 0),
          profileError,
          membershipError,
          userSettingsError,
          teamsError
        });
      }
    } catch (error) {
      logger.error('❌ Debug data collection failed:', error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    checkUserData();
  }, []);
  if (!debugData) {
    return <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            User Data Debug
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={checkUserData} disabled={loading}>
            {loading ? 'Loading...' : 'Check User Data'}
          </Button>
        </CardContent>
      </Card>;
  }
  const getStatusIcon = (hasData: boolean, error: any) => {
    if (error) return <AlertTriangle className="h-4 w-4 text-destructive" />;
    if (hasData) return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
  };
  return <Card className="w-full">
      
      
    </Card>;
};
export default UserDataDebugger;