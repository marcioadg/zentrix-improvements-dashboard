
import React, { useState } from 'react';
import { BaseModal } from './BaseModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Mail, Shield, AlertTriangle, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { useDirectTeams } from '@/hooks/useDirectTeams';
import { sendInvitation } from '@/services/invitationService';
import { PERMISSION_OPTIONS } from '@/utils/permissionMapping';
import { logger } from '@/utils/logger';

interface AddMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMemberAdded?: () => void;
}

// Check if email domain is known to have delivery issues
const isProblematicEmailDomain = (email: string): boolean => {
  const domain = email.split('@')[1]?.toLowerCase();
  const problematicDomains = [
    'hotmail.com', 'hotmail.co.uk', 'hotmail.fr', 'hotmail.de', 'hotmail.es', 'hotmail.it',
    'outlook.com', 'outlook.co.uk', 'outlook.fr', 'outlook.de', 'outlook.es',
    'live.com', 'live.co.uk', 'live.fr',
    'msn.com'
  ];
  return problematicDomains.includes(domain);
};

export const AddMemberModal: React.FC<AddMemberModalProps> = ({
  open,
  onOpenChange,
  onMemberAdded,
}) => {
  const [email, setEmail] = useState('');
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [permissionLevel, setPermissionLevel] = useState('member');
  const [loading, setLoading] = useState(false);
  const [showManualLink, setShowManualLink] = useState(false);
  const [manualInviteLink, setManualInviteLink] = useState('');
  const [invitedEmail, setInvitedEmail] = useState('');
  const [copied, setCopied] = useState(false);
  const [successEmail, setSuccessEmail] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentCompany } = useMultiCompanyAccess();
  const { teams } = useDirectTeams();

  const permissionLevels = [
    { value: 'view-only', label: 'View Only', description: 'Can view teams and tasks but cannot edit' },
    { value: 'member', label: 'Member', description: 'Basic access to teams and tasks' },
    { value: 'manager', label: 'Manager', description: 'Can manage teams and view analytics' },
    { value: 'director', label: 'Director', description: 'Full company access and user management' }
  ];

  const handleTeamToggle = (teamId: string) => {
    setSelectedTeamIds(prev => 
      prev.includes(teamId) 
        ? prev.filter(id => id !== teamId)
        : [...prev, teamId]
    );
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(manualInviteLink);
      setCopied(true);
      toast({
        title: "Link copied!",
        description: "Share this link with the invited user.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Failed to copy",
        description: "Please select and copy the link manually.",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    setShowManualLink(false);
    setManualInviteLink('');
    setInvitedEmail('');
    setCopied(false);
    setEmail('');
    setSelectedTeamIds([]);
    setPermissionLevel('member');
    setSuccessEmail(null);
    onOpenChange(false);
  };

  const resetFormForNextInvite = () => {
    setEmail('');
    setSelectedTeamIds([]);
    setPermissionLevel('member');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim() || !user || !currentCompany) {
      toast({
        title: "Error",
        description: !currentCompany ? "No company selected" : "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    const trimmedEmail = email.trim();
    const isProblematicEmail = isProblematicEmailDomain(trimmedEmail);
    
    logger.log('📧 AddMemberModal: Starting invitation process', {
      email: trimmedEmail,
      companyId: currentCompany?.id,
      invitedBy: user.id,
      teamIds: selectedTeamIds,
      isProblematicEmail,
    });

    // 1. OPTIMISTIC UPDATE - Trigger member list refresh immediately
    if (onMemberAdded) {
      logger.log('🔄 AddMemberModal: Triggering optimistic update');
      onMemberAdded();
    }

    try {
      // Dispatch optimistic event for onboarding
      logger.log('🎯 AddMemberModal: Dispatching optimistic user invitation event for onboarding');
      window.dispatchEvent(new CustomEvent('optimistic-user-invitation'));
      
      // 2. Call invitation service
      logger.log('📧 AddMemberModal: Calling invitation service...');
      const result = await sendInvitation({
        email: trimmedEmail,
        companyId: currentCompany?.id,
        invitedBy: user.id,
        teamIds: selectedTeamIds,
        permissionLevel: permissionLevel
      });

      logger.log('📧 AddMemberModal: Invitation service response:', result);

      if (result.success) {
        logger.log('✅ AddMemberModal: User invitation successful');
        
        // 3. SUCCESS: Trigger another refresh to get real data
        if (onMemberAdded) {
          logger.log('🔄 AddMemberModal: Triggering post-success refresh');
          onMemberAdded();
        }

        // Check if this is a problematic email domain and we have the invite link
        if (isProblematicEmail && result.inviteLink) {
          logger.log('⚠️ AddMemberModal: Problematic email detected, showing manual link');
          setInvitedEmail(trimmedEmail);
          setManualInviteLink(result.inviteLink);
          setShowManualLink(true);
          setLoading(false);
          return; // Don't close modal, show manual link view
        }

        // Show inline success and reset form for next invite
        setSuccessEmail(trimmedEmail);
        resetFormForNextInvite();
      } else {
        throw new Error(result.error || 'Failed to send invitation');
      }

    } catch (error) {
      logger.error('❌ AddMemberModal: Invitation failed:', error);
      
      // ROLLBACK: Trigger refresh to remove optimistic update
      if (onMemberAdded) {
        logger.log('🔄 AddMemberModal: Triggering rollback refresh');
        onMemberAdded();
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to send invitation';
      
      toast({
        title: "Invitation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = () => {
    const form = document.querySelector('form');
    if (form) {
      form.requestSubmit();
    }
  };

  // Get selected team names for preview
  const selectedTeamNames = selectedTeamIds
    .map(id => teams.find(team => team.id === id)?.name)
    .filter(Boolean);

  // Manual link view for problematic email domains
  if (showManualLink) {
    return (
      <BaseModal
        open={open}
        onOpenChange={handleClose}
        title="Important: Share Invitation Link"
        description="Email delivery may be unreliable for this address"
        submitText="Done"
        onSubmit={handleClose}
      >
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-800 dark:text-amber-200">
                <p className="font-medium mb-2">Hotmail/Outlook emails often block invitation emails</p>
                <p>Please copy this link and share it directly with the invited user (e.g., via WhatsApp, SMS, or another messaging app).</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Invitation Link</Label>
            <div className="flex gap-2">
              <Input 
                value={manualInviteLink} 
                readOnly 
                className="text-xs font-mono"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleCopyLink}
                className="flex-shrink-0"
                aria-label="Copy invite link"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="p-3 bg-primary/5 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-2">
              <Mail className="h-4 w-4 text-primary dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-medium mb-1">Important: The user must sign up with this exact email:</p>
                <p className="font-mono text-xs bg-primary/10 dark:bg-blue-900/50 px-2 py-1 rounded inline-block">
                  {invitedEmail}
                </p>
              </div>
            </div>
          </div>
        </div>
      </BaseModal>
    );
  }

  return (
    <BaseModal
      open={open}
      onOpenChange={onOpenChange}
      title="Invite Team Member"
      description={`Send an email invitation to join ${currentCompany?.name || 'your organization'}. The person will receive an email with instructions to create their account.`}
      onSubmit={handleFormSubmit}
      submitText={loading ? "Sending Invitation..." : "Send Invitation"}
      submitDisabled={loading || !currentCompany}
      loading={loading}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {successEmail && (
          <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
              <p className="text-sm text-green-800 dark:text-green-200">
                Invitation sent to <strong>{successEmail}</strong>
              </p>
            </div>
          </div>
        )}

        <div>
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setSuccessEmail(null); }}
            placeholder="Enter email address"
            autoComplete="email"
            inputMode="email"
          />
        </div>


        <div>
          <Label htmlFor="permissionLevel">Permission Level</Label>
          <Select value={permissionLevel} onValueChange={setPermissionLevel}>
            <SelectTrigger>
              <SelectValue placeholder="Select permission level" />
            </SelectTrigger>
            <SelectContent>
              {permissionLevels.map((level) => (
                <SelectItem key={level.value} value={level.value}>
                  <div className="flex items-center gap-2">
                    <Shield className="h-3 w-3" />
                    <div>
                      <div className="font-medium">{level.label}</div>
                      <div className="text-xs text-muted-foreground">{level.description}</div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {teams.length > 0 && (
          <div className="space-y-3">
            <Label>Assign to Teams (Optional)</Label>
            <div className="space-y-2 max-h-32 overflow-y-auto border rounded-md p-3">
              {teams.map((team) => (
                <div key={team.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={team.id}
                    checked={selectedTeamIds.includes(team.id)}
                    onCheckedChange={() => handleTeamToggle(team.id)}
                  />
                  <Label 
                    htmlFor={team.id} 
                    className="text-sm font-normal cursor-pointer flex-1"
                  >
                    {team.name}
                  </Label>
                </div>
              ))}
            </div>
            {selectedTeamIds.length > 0 && (
              <div className="p-2 bg-muted/30 rounded-lg border border-muted">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs font-medium">
                    Selected teams ({selectedTeamIds.length})
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {selectedTeamNames.map((name, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {currentCompany && (
          <div className="p-3 bg-primary/5 rounded-md border border-blue-200">
            <div className="flex items-start gap-2">
              <Mail className="h-4 w-4 text-primary mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Email Invitation</p>
                <p>
                  <strong>{email || 'This person'}</strong> will receive an invitation email to join <strong>{currentCompany?.name}</strong>
                  {selectedTeamIds.length > 0 && (
                    <span> and will be assigned to {selectedTeamIds.length} team{selectedTeamIds.length !== 1 ? 's' : ''} ({selectedTeamNames.join(', ')})</span>
                  )}. They'll use secure email verification to create their account and provide their name during signup.
                </p>
              </div>
            </div>
          </div>
        )}
      </form>
    </BaseModal>
  );
};
