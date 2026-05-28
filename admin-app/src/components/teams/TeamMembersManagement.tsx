import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { RoleSelector } from '@/components/shared/RoleSelector';
import { Users, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface TeamMember {
  id: string;
  user_id: string;
  team_id: string;
  company_id: string;
  permission_level: string;
  joined_at: string;
  full_name: string;
  email: string;
  team_name: string;
}

interface TeamMembersManagementProps {
  teamId: string;
  teamName: string;
}

export const TeamMembersManagement: React.FC<TeamMembersManagementProps> = ({
  teamId,
  teamName
}) => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchTeamMembers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          id,
          user_id,
          team_id,
          joined_at,
          profiles!inner(full_name, email),
          teams!inner(name, company_id),
          company_members!inner(permission_level)
        `)
        .eq('team_id', teamId);

      if (error) throw error;

      const formattedMembers: TeamMember[] = data.map((member: any) => ({
        id: member.id,
        user_id: member.user_id,
        team_id: member.team_id,
        company_id: member.teams.company_id,
        permission_level: member.company_members[0]?.permission_level || 'member',
        joined_at: member.joined_at,
        full_name: member.profiles.full_name,
        email: member.profiles.email,
        team_name: member.teams.name
      }));

      setTeamMembers(formattedMembers);
    } catch (error) {
      logger.error('Error fetching team members:', error);
      toast({
        title: 'Error',
        description: 'Failed to load team members',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchTeamMembers();
  }, [teamId]);

  const handleRoleChange = async (memberId: string, userId: string, companyId: string, newPermissionLevel: string) => {
    setUpdating(memberId);
    try {
      // Get current user ID for audit logging
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Not authenticated');

      // Route through update_user_permission RPC for validation and audit logging
      const { data, error } = await supabase.rpc('update_user_permission', {
        p_user_id: userId,
        p_company_id: companyId,
        p_field: 'permission_level',
        p_value: newPermissionLevel,
        p_updated_by: currentUser.id,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || 'Permission update failed');
      }

      // Update local state
      setTeamMembers(prev => 
        prev.map(member => 
          member.id === memberId 
            ? { ...member, permission_level: newPermissionLevel }
            : member
        )
      );

      toast({
        title: 'Success',
        description: 'Permission level updated successfully',
      });
    } catch (error) {
      logger.error('Error updating permission level:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update permission level',
        variant: 'destructive',
      });
    } finally {
      setUpdating(null);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {teamName} Members ({teamMembers.length})
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTeamMembers}
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {teamMembers.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground mb-2">No team members found</p>
            <p className="text-sm text-muted-foreground">
              Add members to this team from the People page.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pb-2 border-b text-sm font-medium text-muted-foreground">
              <div>Member</div>
              <div>Email</div>
              <div>Role</div>
              <div>Joined</div>
            </div>

            {/* Members List */}
            {teamMembers.map((member) => (
              <div
                key={member.id}
                className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                {/* Member Info */}
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs font-medium">
                      {getInitials(member.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{member.full_name}</p>
                  </div>
                </div>

                {/* Email */}
                <div className="text-sm text-muted-foreground md:text-left">
                  {member.email}
                </div>

                {/* Role Selector */}
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <RoleSelector
                      selectedRole={member.permission_level}
                      onRoleChange={(newLevel) => handleRoleChange(member.id, member.user_id, member.company_id, newLevel)}
                      disabled={updating === member.id}
                      className="w-40"
                    />
                    {updating === member.id && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Joined Date */}
                <div className="text-sm text-muted-foreground">
                  {new Date(member.joined_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};