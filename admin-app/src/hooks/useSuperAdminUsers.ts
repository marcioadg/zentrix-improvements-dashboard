
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

export interface UserAttribution {
  gclid?: string | null;
  fbclid?: string | null;
  li_fat_id?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_adset?: string | null;
  utm_ad?: string | null;
  referral_source?: string | null;
  landing_page_url?: string | null;
}

export interface LeadProfiling {
  is_disqualified: boolean;
  is_mql: boolean;
}

export interface SuperAdminUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  avatar_url?: string;
  created_at: string;
  last_login_at?: string;
  primary_company_id?: string;
  primary_company_name?: string;
  status?: string; // inactive, active, etc.
  attribution?: UserAttribution | null;
  lead_profiling?: LeadProfiling | null;
  company_memberships: {
    company_id: string;
    company_name: string;
    role: string;
    joined_at: string;
    status?: string;
    subscription_tier?: string;
    trial_end?: string | null;
    subscribed?: boolean;
  }[];
  team_memberships: {
    team_id: string;
    team_name: string;
    company_id: string;
    company_name: string;
  }[];
}

export const useSuperAdminUsers = () => {
  const [users, setUsers] = useState<SuperAdminUser[]>([]);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchUsers = async () => {
    try {
      setLoading(true);
      logger.log('useSuperAdminUsers: Fetching all users via secure RPC');

      // Use the secure RPC function that checks permissions server-side
      const { data, error } = await supabase
        .rpc('get_all_users_for_super_admin');

      if (error) {
        logger.error('Error fetching users:', error);
        
        // Show user-friendly error message
        if (error.message.includes('Only super admins')) {
          toast({
            title: "Access Denied",
            description: "Only super admins can view all users across companies",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error Loading Users",
            description: error.message,
            variant: "destructive",
          });
        }
        
        throw error;
      }

      if (!data) {
        logger.log('No data returned from RPC');
        setUsers([]);
        setLoading(false);
        return;
      }

      // Map the RPC response to SuperAdminUser format
      const processedUsers: SuperAdminUser[] = data.map((row: any) => {
        // Parse the company_memberships JSONB array
        const companyMemberships = (row.company_memberships || []).map((m: any) => ({
          company_id: m.company_id,
          company_name: m.company_name,
          role: m.permission_level,
          joined_at: m.joined_at,
          status: m.status
        }));

        // Parse the team_memberships JSONB array
        const teamMemberships = (row.team_memberships || []).map((t: any) => ({
          team_id: t.team_id,
          team_name: t.team_name,
          company_id: t.company_id,
          company_name: t.company_name
        }));

        return {
          id: row.id,
          email: row.email,
          full_name: row.full_name,
          role: row.role,
          avatar_url: row.avatar_url,
          created_at: row.created_at,
          last_login_at: row.last_login_at,
          primary_company_id: row.primary_company_id,
          primary_company_name: row.primary_company_name,
          status: row.status,
          company_memberships: companyMemberships,
          team_memberships: teamMemberships
        };
      });

      // Fetch attribution data, lead profiling, and subscription data in parallel
      const [attributionResult, profilingResult, subscriptionResult] = await Promise.all([
        supabase
          .from('user_attributions')
          .select('user_id, gclid, fbclid, li_fat_id, utm_source, utm_medium, utm_campaign, utm_adset, utm_ad, referral_source, landing_page_url'),
        supabase
          .from('lead_profiling')
          .select('user_id, is_disqualified, is_mql'),
        supabase
          .from('company_subscriptions')
          .select('company_id, subscription_tier, trial_end, extended_trial_end, subscribed, subscription_end')
      ]);

      const attributionMap = new Map<string, UserAttribution>();
      if (attributionResult.data) {
        for (const attr of attributionResult.data) {
          attributionMap.set(attr.user_id, attr);
        }
      }

      const profilingMap = new Map<string, LeadProfiling>();
      if (profilingResult.data) {
        for (const p of profilingResult.data) {
          profilingMap.set(p.user_id, { is_disqualified: p.is_disqualified, is_mql: p.is_mql });
        }
      }

      // Build subscription map by company_id
      const subscriptionMap = new Map<string, { tier: string; trial_end: string | null; subscribed: boolean; subscription_end: string | null }>();
      if (subscriptionResult.data) {
        for (const sub of subscriptionResult.data) {
          subscriptionMap.set(sub.company_id, {
            tier: sub.subscription_tier || 'Free',
            trial_end: sub.extended_trial_end || sub.trial_end,
            subscribed: sub.subscribed || false,
            subscription_end: sub.subscription_end
          });
        }
      }

      // Merge attribution, profiling, and subscription into users
      const usersWithAttribution = processedUsers.map(u => ({
        ...u,
        attribution: attributionMap.get(u.id) || null,
        lead_profiling: profilingMap.get(u.id) || null,
        company_memberships: u.company_memberships.map(cm => {
          const sub = subscriptionMap.get(cm.company_id);
          return {
            ...cm,
            subscription_tier: sub?.tier || 'Free',
            trial_end: sub?.trial_end || null,
            subscribed: sub?.subscribed || false,
          };
        }),
      }));

      logger.log(`✅ Loaded ${usersWithAttribution.length} users from secure RPC`);
      setUsers(usersWithAttribution);
      setLoading(false);
    } catch (error: any) {
      logger.error('Failed to fetch users:', error);
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setCompanies(data || []);
    } catch (error: any) {
      logger.error('Failed to fetch companies:', error);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchCompanies();
  }, []);

  const refetch = () => {
    fetchUsers();
    fetchCompanies();
  };

  const updateUserCompanyMemberships = async (userId: string, companyIds: string[]) => {
    try {
      logger.log(`Updating company memberships for user ${userId}`);
      
      // Get current memberships
      const { data: currentMemberships, error: fetchError } = await supabase
        .from('company_members')
        .select('company_id, id')
        .eq('user_id', userId);

      if (fetchError) throw fetchError;

      const currentCompanyIds = currentMemberships?.map(m => m.company_id) || [];
      
      // Companies to add
      const toAdd = companyIds.filter(id => !currentCompanyIds.includes(id));
      
      // Companies to remove
      const toRemove = currentCompanyIds.filter(id => !companyIds.includes(id));

      // Add new memberships
      if (toAdd.length > 0) {
        const newMemberships = toAdd.map(companyId => ({
          user_id: userId,
          company_id: companyId,
          permission_level: 'member', // Default permission level
          status: 'active',
          joined_at: new Date().toISOString()
        }));

        const { error: insertError } = await supabase
          .from('company_members')
          .insert(newMemberships);

        if (insertError) throw insertError;
      }

      // Remove old memberships
      if (toRemove.length > 0) {
        const membershipIds = currentMemberships
          ?.filter(m => toRemove.includes(m.company_id))
          .map(m => m.id) || [];

        const { error: deleteError } = await supabase
          .from('company_members')
          .delete()
          .in('id', membershipIds);

        if (deleteError) throw deleteError;
      }

      toast({
        title: "Success",
        description: "Company memberships updated successfully",
      });

      // Refresh user list
      await fetchUsers();
      
      return true;
    } catch (error: any) {
      logger.error('Error updating company memberships:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update company memberships",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    users,
    companies,
    loading,
    refetch,
    updateUserCompanyMemberships
  };
};
