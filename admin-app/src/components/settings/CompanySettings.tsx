import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Save, Loader2, Trash2 } from 'lucide-react';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { CompanyDeletionModal } from '@/components/modals/CompanyDeletionModal';
import { useCompanyManagement } from '@/hooks/useCompanyManagement';
import { logger } from '@/utils/logger';

export const CompanySettings: React.FC = () => {
  const { currentCompany, refreshCompanies } = useMultiCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [canEditCompany, setCanEditCompany] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Optimistic state for switches
  const [zentrixSupportAccess, setZentrixSupportAccess] = useState(false);
  const [autoCreateOverdueIssues, setAutoCreateOverdueIssues] = useState(false);
  const [requireTaskBeforeSolve, setRequireTaskBeforeSolve] = useState(true);
  const [autoSolveOnTaskCreate, setAutoSolveOnTaskCreate] = useState(true);
  const [aiMeetingTranscription, setAiMeetingTranscription] = useState(false);
  
  const { deleteCompany } = useCompanyManagement();

  useEffect(() => {
    if (currentCompany?.name) {
      setCompanyName(currentCompany?.name);
    }
    // Initialize optimistic states from current company data
    if (currentCompany) {
      setZentrixSupportAccess(currentCompany?.zentrix_support_access || false);
      setAutoCreateOverdueIssues(currentCompany?.auto_create_overdue_issues || false);
      // Default to true if not set (new column)
      setRequireTaskBeforeSolve(currentCompany?.require_task_before_solve ?? true);
      setAutoSolveOnTaskCreate(currentCompany?.auto_solve_on_task_create ?? true);
      setAiMeetingTranscription(currentCompany?.ai_meeting_transcription || false);
    }
  }, [currentCompany?.id, currentCompany?.name, currentCompany?.zentrix_support_access, currentCompany?.auto_create_overdue_issues, currentCompany?.require_task_before_solve, currentCompany?.auto_solve_on_task_create, currentCompany?.ai_meeting_transcription]);

  useEffect(() => {
    checkEditPermissions();
  }, [user?.id, currentCompany?.id]);

  const checkEditPermissions = async () => {
    if (!user?.id || !currentCompany?.id) {
      setCanEditCompany(false);
      return;
    }

    try {
      // Check if user is company owner/admin from company_members table
      const { data: membershipData, error: membershipError } = await supabase
        .from('company_members')
        .select('permission_level')
        .eq('user_id', user.id)
        .eq('company_id', currentCompany?.id)
        .maybeSingle();

      // Check if user is super admin from profiles table (fallback)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      const isSuperAdmin = profileData?.role === 'super_admin';
      const hasCompanyEditPermission = membershipData && 
        ['director', 'admin', 'owner', 'super_admin'].includes(membershipData.permission_level);

      setCanEditCompany(isSuperAdmin || hasCompanyEditPermission);
    } catch (error) {
      logger.error('Error checking permissions:', error);
      setCanEditCompany(false);
    }
  };

  const handleZentrixSupportAccessChange = async (checked: boolean) => {
    if (!canEditCompany || !currentCompany) return;

    // Optimistic update
    setZentrixSupportAccess(checked);

    try {
      setIsUpdating(true);
      
      const { error } = await supabase
        .from('companies')
        .update({ zentrix_support_access: checked })
        .eq('id', currentCompany?.id);
      
      if (error) {
        throw error;
      } else {
        toast({
          title: "Support Access Updated",
          description: checked 
            ? "Zentrix OS Support can now access your account for support"
            : "Zentrix OS Support access has been disabled",
        });
        
        // Track company settings update
        import('@/lib/statsigAnalytics').then(({ trackCompanySettingsUpdated }) => {
          trackCompanySettingsUpdated({
            user_id: user?.id,
            company_id: currentCompany?.id,
            settings_changed: ['zentrix_support_access'],
          });
        });
      }
    } catch (error) {
      logger.error('Error updating zentrix_support_access:', error);
      // Revert optimistic update on error
      setZentrixSupportAccess(!checked);
      toast({
        title: "Error",
        description: "Failed to update support access setting",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAutoCreateOverdueIssuesChange = async (checked: boolean) => {
    if (!canEditCompany || !currentCompany) return;

    // Optimistic update
    setAutoCreateOverdueIssues(checked);

    try {
      setIsUpdating(true);
      
      const { error } = await supabase
        .from('companies')
        .update({ auto_create_overdue_issues: checked })
        .eq('id', currentCompany?.id);
      
      if (error) {
        throw error;
      } else {
        toast({
          title: "Setting Updated",
          description: "Auto-create overdue issues setting updated",
        });
        
        // Track company settings update
        import('@/lib/statsigAnalytics').then(({ trackCompanySettingsUpdated }) => {
          trackCompanySettingsUpdated({
            user_id: user?.id,
            company_id: currentCompany?.id,
            settings_changed: ['auto_create_overdue_issues'],
          });
        });
      }
    } catch (error) {
      logger.error('Error updating auto_create_overdue_issues:', error);
      // Revert optimistic update on error
      setAutoCreateOverdueIssues(!checked);
      toast({
        title: "Error",
        description: "Failed to update setting",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRequireTaskBeforeSolveChange = async (checked: boolean) => {
    if (!canEditCompany || !currentCompany) return;

    // Optimistic update
    setRequireTaskBeforeSolve(checked);

    try {
      setIsUpdating(true);
      
      const { error } = await supabase
        .from('companies')
        .update({ require_task_before_solve: checked })
        .eq('id', currentCompany?.id);
      
      if (error) {
        throw error;
      } else {
        toast({
          title: "Setting Updated",
          description: checked 
            ? "Confirmation will be shown when solving issues without tasks"
            : "Issues can be solved without task confirmation",
        });
        
        // Track company settings update
        import('@/lib/statsigAnalytics').then(({ trackCompanySettingsUpdated }) => {
          trackCompanySettingsUpdated({
            user_id: user?.id,
            company_id: currentCompany?.id,
            settings_changed: ['require_task_before_solve'],
          });
        });
      }
    } catch (error) {
      logger.error('Error updating require_task_before_solve:', error);
      // Revert optimistic update on error
      setRequireTaskBeforeSolve(!checked);
      toast({
        title: "Error",
        description: "Failed to update setting",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAiMeetingTranscriptionChange = async (checked: boolean) => {
    if (!canEditCompany || !currentCompany) return;

    setAiMeetingTranscription(checked);

    try {
      setIsUpdating(true);
      
      const { error } = await supabase
        .from('companies')
        .update({ ai_meeting_transcription: checked })
        .eq('id', currentCompany?.id);
      
      if (error) {
        throw error;
      } else {
        toast({
          title: "Setting Updated",
          description: checked 
            ? "AI Meeting Transcription has been enabled"
            : "AI Meeting Transcription has been disabled",
        });
        
        import('@/lib/statsigAnalytics').then(({ trackCompanySettingsUpdated }) => {
          trackCompanySettingsUpdated({
            user_id: user?.id,
            company_id: currentCompany?.id,
            settings_changed: ['ai_meeting_transcription'],
          });
        });
      }
    } catch (error) {
      logger.error('Error updating ai_meeting_transcription:', error);
      setAiMeetingTranscription(!checked);
      toast({
        title: "Error",
        description: "Failed to update setting",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAutoSolveOnTaskCreateChange = async (checked: boolean) => {
    if (!canEditCompany || !currentCompany) return;

    setAutoSolveOnTaskCreate(checked);

    try {
      setIsUpdating(true);

      toast({
        title: "Setting Updated",
        description: checked
          ? "Issues will be automatically solved when a task is created"
          : "Issues will not be automatically solved when a task is created",
      });
    } catch (error) {
      logger.error('Error updating auto_solve_on_task_create:', error);
      setAutoSolveOnTaskCreate(!checked);
      toast({
        title: "Error",
        description: "Failed to update setting",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateCompanyName = async () => {
    if (!currentCompany?.id || !companyName.trim() || companyName.trim() === currentCompany?.name) {
      return;
    }

    if (!canEditCompany) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to edit company settings",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);
    try {
      // Update the company name in the database
      const { error: updateError } = await supabase
        .from('companies')
        .update({ 
          name: companyName.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', currentCompany?.id);

      if (updateError) {
        throw updateError;
      }

      // Log the admin action
      const { error: logError } = await supabase
        .from('admin_actions')
        .insert({
          admin_user_id: user?.id,
          action_type: 'company_name_update',
          target_type: 'companies',
          target_id: currentCompany?.id,
          description: `Updated company name from "${currentCompany?.name}" to "${companyName.trim()}"`,
          details: {
            old_name: currentCompany?.name,
            new_name: companyName.trim(),
            company_id: currentCompany?.id
          }
        });

      if (logError) {
        logger.warn('Failed to log admin action:', logError);
      }

      toast({
        title: "Company Name Updated",
        description: `Company name has been changed to "${companyName.trim()}"`,
      });

      // Track company settings update
      import('@/lib/statsigAnalytics').then(({ trackCompanySettingsUpdated }) => {
        trackCompanySettingsUpdated({
          user_id: user?.id,
          company_id: currentCompany?.id,
          settings_changed: ['company_name'],
        });
      });
    } catch (error) {
      logger.error('Error updating company name:', error);
      toast({
        title: "Error",
        description: "Failed to update company name. Please try again.",
        variant: "destructive",
      });
      
      // Reset to original name on error
      setCompanyName(currentCompany?.name || '');
    } finally {
      setIsUpdating(false);
    }
  };

  const hasChanges = companyName.trim() !== currentCompany?.name && companyName.trim() !== '';

  const handleDeleteCompany = async () => {
    if (!currentCompany?.id) return;
    
    try {
      await deleteCompany(currentCompany?.id);
      
      // Refresh company state to clear cache and update UI before navigation
      try {
        await refreshCompanies();
      } catch (refreshError) {
        // Log but don't block navigation - the refresh is just to update local state
        // The next page load will fetch fresh data from the database
        logger.warn('Error refreshing companies after deletion (non-blocking):', refreshError);
      }
      
      toast({
        title: "Company Deleted",
        description: "Company and all associated data have been permanently deleted",
      });
      navigate('/');
    } catch (error) {
      logger.error('Error deleting company:', error);
      toast({
        title: "Error",
        description: "Failed to delete company. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Convert currentCompany to CompanyWithStats format for modal
  const companyWithStats = currentCompany ? {
    ...currentCompany,
    user_count: 0, // These will be fetched by the modal
    team_count: 0,
    metrics_count: 0,
    status: 'Free' as const,
    last_login: null,
    directors: [],
    created_at: new Date().toISOString() // Default since Company type doesn't have created_at
  } : null;

  if (!currentCompany) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-[16px] font-semibold">Company</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your company information and settings.
          </p>
        </div>
        <Separator />
        <div className="rounded-lg border border-border bg-muted/30 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-medium">You're not a member of any company yet</p>
              <p className="text-sm text-muted-foreground">Create your first company to unlock all features.</p>
            </div>
            <Button onClick={() => navigate('/new-company')}>
              Create company
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div>
        <h2 className="text-[16px] font-semibold">Company</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your company information and settings.
        </p>
      </div>

      <Separator />

      {/* Company Name Section */}
      <div className="space-y-3">
        <Label htmlFor="companyName" className="text-sm font-medium">Company Name</Label>
        <div className="flex gap-3 max-w-md">
          <Input
            id="companyName"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Enter company name"
            disabled={!canEditCompany || isUpdating}
            className="h-9"
          />
          <Button 
            onClick={handleUpdateCompanyName}
            disabled={!hasChanges || !canEditCompany || isUpdating}
            size="sm"
            className="h-9 shrink-0"
          >
            {isUpdating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isUpdating ? 'Updating...' : 'Update'}
          </Button>
        </div>
        {!canEditCompany && (
          <p className="text-xs text-muted-foreground">
            Only directors and admins can edit company settings
          </p>
        )}
      </div>

      {/* Support Access Setting */}
      <div className="space-y-3">
        <div className="flex items-center justify-between max-w-md">
          <div className="space-y-1">
            <Label className="text-sm font-medium">Support Access</Label>
            <p className="text-xs text-muted-foreground">
              Allow Zentrix OS Support to access your account for troubleshooting
            </p>
          </div>
          <Switch
            checked={zentrixSupportAccess}
            onCheckedChange={handleZentrixSupportAccessChange}
            disabled={!canEditCompany || isUpdating}
          />
        </div>
      </div>

      {/* Auto-create Issues Setting */}
      <div className="space-y-3">
        <div className="flex items-center justify-between max-w-md">
          <div className="space-y-1">
            <Label className="text-sm font-medium">Auto-create Issues</Label>
            <p className="text-xs text-muted-foreground">
              Automatically create issues for overdue items when starting meetings
            </p>
          </div>
          <Switch
            checked={autoCreateOverdueIssues}
            onCheckedChange={handleAutoCreateOverdueIssuesChange}
            disabled={!canEditCompany || isUpdating}
          />
        </div>
      </div>

      {/* Require Task Before Solve Setting */}
      <div className="space-y-3">
        <div className="flex items-center justify-between max-w-md">
          <div className="space-y-1">
            <Label className="text-sm font-medium">Task Confirmation</Label>
            <p className="text-xs text-muted-foreground">
              Show a warning when solving issues without creating a task first
            </p>
          </div>
          <Switch
            checked={requireTaskBeforeSolve}
            onCheckedChange={handleRequireTaskBeforeSolveChange}
            disabled={!canEditCompany || isUpdating}
          />
        </div>
      </div>

      {/* Auto-Solve on Task Creation Setting */}
      <div className="space-y-3">
        <div className="flex items-center justify-between max-w-md">
          <div className="space-y-1">
            <Label className="text-sm font-medium">Auto-Solve on Task Creation</Label>
            <p className="text-xs text-muted-foreground">
              Automatically mark an issue as resolved when a task is created from it during a meeting
            </p>
          </div>
          <Switch
            checked={autoSolveOnTaskCreate}
            onCheckedChange={handleAutoSolveOnTaskCreateChange}
            disabled={!canEditCompany || isUpdating}
          />
        </div>
      </div>

      {/* AI Meeting Transcription Setting - Hidden until feature is fully implemented */}
      {/* <div className="space-y-3">
        <div className="flex items-center justify-between max-w-md">
          <div className="space-y-1">
            <Label className="text-sm font-medium">AI Meeting Transcription</Label>
            <p className="text-xs text-muted-foreground">
              Enable AI-powered transcription during meetings to auto-detect and create issues
            </p>
          </div>
          <Switch
            checked={aiMeetingTranscription}
            onCheckedChange={handleAiMeetingTranscriptionChange}
            disabled={!canEditCompany || isUpdating}
          />
        </div>
      </div> */}

      {/* Danger Zone */}
      {canEditCompany && (
        <>
          <Separator className="my-8" />
          <div className="space-y-4">
            <div>
              <h3 className="text-[16px] font-semibold text-destructive">Danger Zone</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Permanently delete this company and all associated data. This action cannot be undone.
              </p>
            </div>
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-destructive">Delete Company</p>
                  <p className="text-sm text-muted-foreground">
                    This will permanently delete the company, all users, teams, tasks, and all associated data.
                  </p>
                </div>
                <Button 
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteModal(true)}
                  className="shrink-0"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Company
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      <CompanyDeletionModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        onConfirm={handleDeleteCompany}
        company={companyWithStats}
      />
    </div>
  );
};