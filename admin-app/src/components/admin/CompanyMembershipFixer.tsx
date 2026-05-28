import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { logger } from '@/lib/logger';

interface MembershipIssue {
  user_id: string;
  email: string;
  full_name: string;
  profile_company_id: string | null;
  company_member_exists: boolean;
  company_name: string | null;
}

export const CompanyMembershipFixer = () => {
  const [issues, setIssues] = useState<MembershipIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [fixing, setFixing] = useState<string | null>(null);
  const { user } = useAuth();
  const { currentCompany } = useMultiCompanyAccess();
  const { toast } = useToast();

  const checkMembershipConsistency = async () => {
    if (!user || !currentCompany) return;

    setLoading(true);
    try {
      logger.debug('Checking membership consistency for selected company');
      
      // Since company_id no longer exists in profiles table, this component needs to be redesigned
      // For now, we'll check for users in company_members without corresponding profiles
      const { data: membersWithoutProfiles, error: membersError } = await supabase
        .from('company_members')
        .select(`
          id,
          user_id,
          email,
          permission_level,
          company_id,
          profiles!left(id, email, full_name)
        `)
        .eq('company_id', currentCompany?.id)
        .is('profiles.id', null); // Users without profiles

      if (membersError) {
        logger.error('Error checking members:', membersError);
        throw membersError;
      }

      // Convert to our issue format
      const issuesFound: MembershipIssue[] = (membersWithoutProfiles || []).map(member => ({
        user_id: member.user_id || member.id,
        email: member.email || 'Unknown',
        full_name: 'Missing Profile',
        profile_company_id: member.company_id,
        company_member_exists: true,
        company_name: currentCompany?.name
      }));

      logger.debug('Membership consistency check completed', { issuesFound: issuesFound.length });
      setIssues(issuesFound);
      
      toast({
        title: "Scan Complete",
        description: `Found ${issuesFound.length} membership inconsistencies`,
      });
    } catch (error) {
      logger.error('Error checking membership consistency:', error);
      toast({
        title: "Error",
        description: "Failed to check membership consistency",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fixMembership = async (issue: MembershipIssue) => {
    if (!user || !issue.profile_company_id) return;

    setFixing(issue.user_id);
    try {
      logger.debug('Fixing membership for user');
      
      // Create the missing company_members entry
      const { error } = await supabase
        .from('company_members')
        .insert({
          user_id: issue.user_id,
          company_id: issue.profile_company_id,
          permission_level: 'member',
          joined_at: new Date().toISOString()
        });

      if (error) throw error;

      // Remove from issues list
      setIssues(prev => prev.filter(i => i.user_id !== issue.user_id));
      
      toast({
        title: "Fixed",
        description: `Created company membership for ${issue.full_name}`,
      });
    } catch (error) {
      logger.error('Error fixing membership:', error);
      toast({
        title: "Error",
        description: "Failed to fix membership",
        variant: "destructive",
      });
    } finally {
      setFixing(null);
    }
  };

  const fixAllMemberships = async () => {
    if (!user) return;

    setLoading(true);
    try {
      for (const issue of issues) {
        if (issue.profile_company_id) {
          await supabase
            .from('company_members')
            .insert({
              user_id: issue.user_id,
              company_id: issue.profile_company_id,
              permission_level: 'member',
              joined_at: new Date().toISOString()
            });
        }
      }

      setIssues([]);
      toast({
        title: "All Fixed",
        description: `Fixed ${issues.length} membership issues`,
      });
    } catch (error) {
      logger.error('Error fixing all memberships:', error);
      toast({
        title: "Error",
        description: "Failed to fix all memberships",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Company Membership Fixer
        </CardTitle>
        <CardDescription>
          Detect and fix inconsistencies between profiles and company memberships
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={checkMembershipConsistency}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Scan for Issues
          </Button>
          
          {issues.length > 0 && (
            <Button 
              onClick={fixAllMemberships}
              disabled={loading}
              variant="destructive"
            >
              Fix All ({issues.length})
            </Button>
          )}
        </div>

        {issues.length === 0 && !loading && (
          <div className="flex items-center gap-2 text-success">
            <CheckCircle className="h-4 w-4" />
            <span>No membership issues found</span>
          </div>
        )}

        {issues.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Found {issues.length} issue(s):</h4>
            {issues.map((issue) => (
              <div key={issue.user_id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{issue.full_name}</div>
                  <div className="text-sm text-muted-foreground">{issue.email}</div>
                  <div className="text-sm text-muted-foreground">Company: {issue.company_name}</div>
                </div>
                <Button
                  size="sm"
                  onClick={() => fixMembership(issue)}
                  disabled={fixing === issue.user_id}
                >
                  {fixing === issue.user_id ? 'Fixing...' : 'Fix'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
