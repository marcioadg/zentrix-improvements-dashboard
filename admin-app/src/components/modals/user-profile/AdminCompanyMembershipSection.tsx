import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building, AlertCircle, Crown, Plus, Save, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UnifiedUser } from '@/hooks/useUserManagement';
import { logger } from '@/utils/logger';

interface Company {
  id: string;
  name: string;
  slug: string;
}

interface CompanyMembership {
  company_id: string;
  permission_level: string;
  selected: boolean;
}

interface AdminCompanyMembershipSectionProps {
  user: UnifiedUser;
  onMembershipUpdated?: () => void;
}

export const AdminCompanyMembershipSection: React.FC<AdminCompanyMembershipSectionProps> = ({
  user,
  onMembershipUpdated
}) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [memberships, setMemberships] = useState<CompanyMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadCompaniesAndMemberships();
  }, [user.id]);

  const loadCompaniesAndMemberships = async () => {
    if (!user.user_id) return;
    
    try {
      setLoading(true);
      
      // Load all companies
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('id, name, slug')
        .order('name');

      if (companiesError) throw companiesError;

      // Load user's current company memberships
      const { data: membershipsData, error: membershipsError } = await supabase
        .from('company_members')
        .select(`
          company_id,
          permission_level,
          companies!inner(id, name)
        `)
        .eq('user_id', user.user_id)
        .eq('status', 'active');

      if (membershipsError) throw membershipsError;

      logger.log('🏢 AdminCompanyMembershipSection: Loaded data:', {
        userName: user.full_name,
        companiesCount: companiesData?.length || 0,
        membershipsCount: membershipsData?.length || 0,
        userMemberships: membershipsData
      });

      // Combine data into membership objects
      const membershipData: CompanyMembership[] = (companiesData || []).map(company => {
        const membership = membershipsData?.find(m => {
          // Handle both array and single object cases for companies relationship
          const companyData = Array.isArray(m.companies) ? m.companies[0] : m.companies;
          return companyData?.id === company.id;
        });

        return {
          company_id: company.id,
          permission_level: membership?.permission_level || 'member',
          selected: !!membership
        };
      });

      setCompanies(companiesData || []);
      setMemberships(membershipData);

    } catch (error) {
      logger.error('🚨 AdminCompanyMembershipSection: Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load company data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMembershipToggle = (companyId: string) => {
    setMemberships(prev =>
      prev.map(membership =>
        membership.company_id === companyId
          ? { ...membership, selected: !membership.selected }
          : membership
      )
    );
  };

  const handlePermissionLevelChange = (companyId: string, permissionLevel: string) => {
    setMemberships(prev =>
      prev.map(membership =>
        membership.company_id === companyId
          ? { ...membership, permission_level: permissionLevel }
          : membership
      )
    );
  };

  const handleSave = async () => {
    if (!user.user_id) return;

    setSaving(true);
    try {
      const selectedMemberships = memberships.filter(m => m.selected);
      
      // Remove all existing memberships for this user
      const { error: deleteError } = await supabase
        .from('company_members')
        .delete()
        .eq('user_id', user.user_id);

      if (deleteError) throw deleteError;

      // Add new memberships
      if (selectedMemberships.length > 0) {
        const { error: insertError } = await supabase
          .from('company_members')
          .insert(
            selectedMemberships.map(membership => ({
              user_id: user.user_id,
              company_id: membership.company_id,
              permission_level: membership.permission_level,
              status: 'active',
              joined_at: new Date().toISOString()
            }))
          );

        if (insertError) throw insertError;
      }

      toast({
        title: "Success",
        description: "Company memberships updated successfully",
      });

      setIsEditing(false);
      await loadCompaniesAndMemberships();
      onMembershipUpdated?.();
    } catch (error) {
      logger.error('Error saving company memberships:', error);
      toast({
        title: "Error",
        description: "Failed to save company memberships",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    loadCompaniesAndMemberships(); // Reload to reset changes
  };

  const selectedCount = memberships.filter(m => m.selected).length;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building className="h-4 w-4" />
            Company Memberships
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Company Memberships
            <Badge variant="outline" className="ml-2">
              {selectedCount} {selectedCount === 1 ? 'company' : 'companies'}
            </Badge>
          </CardTitle>
          {!isEditing ? (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              <Settings className="h-4 w-4 mr-1" />
              Edit Memberships
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleCancel}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button 
                size="sm"
                onClick={handleSave}
                disabled={saving}
              >
                <Save className="h-4 w-4 mr-1" />
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          )}
        </div>
        <CardDescription>
          Manage which companies this user is a member of and their permission levels.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Select companies this user should have access to and set their permission level.
            </div>
            <div className="space-y-3">
              {memberships.map((membership) => {
                const company = companies.find(c => c.id === membership.company_id);
                return (
                  <div 
                    key={membership.company_id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        checked={membership.selected}
                        onCheckedChange={() => handleMembershipToggle(membership.company_id)}
                      />
                      <div>
                        <div className="font-medium">{company?.name || 'Unknown Company'}</div>
                        <div className="text-sm text-muted-foreground">
                          {membership.company_id}
                        </div>
                      </div>
                    </div>
                    
                    {membership.selected && (
                      <Select 
                        value={membership.permission_level}
                        onValueChange={(value) => handlePermissionLevelChange(membership.company_id, value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="director">Director</SelectItem>
                          <SelectItem value="super_admin">Super Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {memberships.filter(m => m.selected).length === 0 ? (
              <div className="text-center p-4 text-muted-foreground">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm">No company memberships</p>
              </div>
            ) : (
              memberships
                .filter(m => m.selected)
                .map((membership) => {
                  const company = companies.find(c => c.id === membership.company_id);
                  return (
                    <div 
                      key={membership.company_id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{company?.name || 'Unknown Company'}</div>
                          <div className="text-sm text-muted-foreground">
                            {membership.company_id}
                          </div>
                        </div>
                      </div>
                      <Badge variant="secondary">
                        {membership.permission_level}
                      </Badge>
                    </div>
                  );
                })
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};