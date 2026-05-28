import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { createFirstCompany, CreateCompanyRequest, CreateCompanyResponse } from '@/services/onboardingService';
import { trackCompanyCreated } from '@/lib/statsigAnalytics';
import { mapDBRoleToUIPermission } from '@/utils/permissionMapping';
import { createTeamWithMembers } from '@/services/teamOperationsService';
import { sendInvitation } from '@/services/invitationService';
import { useAuth } from '@/contexts/AuthContext';
import { useOnboardingDraft } from '@/contexts/OnboardingDraftContext';
import { Loader2, Building2, Users, Target, CheckCircle, UserPlus, Trash2, Plus, Crown } from 'lucide-react';
import { InvitationButton } from '@/components/invitations/InvitationButton';
import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';

interface OnboardingWizardV2Props {
  onComplete: () => void;
  initialStep?: number;
  excludeWelcomeStep?: boolean;
  createCompanyFn?: (request: CreateCompanyRequest) => Promise<CreateCompanyResponse>;
  onInvitationAccepted?: () => void;
}

const OnboardingWizardV2: React.FC<OnboardingWizardV2Props> = ({ 
  onComplete, 
  initialStep, 
  excludeWelcomeStep = false, 
  createCompanyFn = createFirstCompany, 
  onInvitationAccepted 
}) => {
  const { draft, updateCompanyName, updateTeams, updateMembers, updateCurrentStep, setLeadershipDismissed, clearDraft } = useOnboardingDraft();
  const { user } = useAuth();
  const { toast } = useToast();

  // Initialize step from draft or props
  const startingStep = excludeWelcomeStep ? 1 : (initialStep || draft.currentStep || 1);
  const [step, setStep] = useState(startingStep);
  
  // Local state for form inputs
  const [teamName, setTeamName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberPermissionLevel, setMemberPermissionLevel] = useState('member');
  const [memberTeamIds, setMemberTeamIds] = useState<string[]>([]);
  
  // Loading states
  const [isCreating, setIsCreating] = useState(false);
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Update draft step when local step changes
  useEffect(() => {
    updateCurrentStep(step);
  }, [step]); // Remove updateCurrentStep from deps to prevent infinite loop

  // Auto-insert Leadership Team when entering teams step
  useEffect(() => {
    const isTeamsStep = (!excludeWelcomeStep && step === 3) || (excludeWelcomeStep && step === 2);
    
    if (isTeamsStep && !draft.leadershipDismissed) {
      // Check if there's already a leadership team
      const hasLeadershipTeam = draft.teams.some(team => team.isLeadership);
      
      if (!hasLeadershipTeam) {
        // Check if there's a team named "Leadership Team" (case-insensitive)
        const leadershipTeamIndex = draft.teams.findIndex(team => 
          team.name.toLowerCase() === 'leadership team'
        );
        
        if (leadershipTeamIndex >= 0) {
          // Mark existing "Leadership Team" as leadership
          const updatedTeams = [...draft.teams];
          updatedTeams[leadershipTeamIndex] = { ...updatedTeams[leadershipTeamIndex], isLeadership: true };
          updateTeams(updatedTeams);
          logger.log('📝 Marked existing Leadership Team as leadership');
        } else {
          // Insert Leadership Team at the beginning
          const leadershipTeam = { name: 'Leadership Team', isLeadership: true };
          updateTeams([leadershipTeam, ...draft.teams]);
          logger.log('📝 Auto-inserted Leadership Team');
        }
      }
    }
  }, [step, excludeWelcomeStep, draft.leadershipDismissed, draft.teams, updateTeams]);

  const allSteps = [
    {
      title: 'Welcome to Zentrix OS',
      description: 'Let\'s get you set up with your first company',
      icon: Building2
    },
    {
      title: 'Company Name',
      description: 'Enter your company details',
      icon: Building2
    },
    {
      title: 'Create Teams',
      description: 'Set up teams to organize your work',
      icon: Users
    },
    {
      title: 'Add Team Members',
      description: 'Invite people to join your company',
      icon: UserPlus
    },
    {
      title: 'Create Workspace',
      description: 'Review and create your workspace',
      icon: CheckCircle
    }
  ];

  const steps = excludeWelcomeStep ? allSteps.slice(1) : allSteps;

  const handleNext = () => {
    // Check if we're on the teams step and there's a team name typed
    const isTeamsStep = (!excludeWelcomeStep && step === 3) || (excludeWelcomeStep && step === 2);
    // Check if we're on the members step and there's a member email typed
    const isMembersStep = (!excludeWelcomeStep && step === 4) || (excludeWelcomeStep && step === 3);
    
    if (isTeamsStep && teamName.trim()) {
      // Add the team before proceeding to next step
      const trimmedName = teamName.trim();
      const existsInDraft = draft.teams.some(team => team.name.toLowerCase() === trimmedName.toLowerCase());
      
      if (!existsInDraft) {
        const newTeams = [...draft.teams, { name: trimmedName, isLeadership: false }];
        updateTeams(newTeams);
        setTeamName('');
        
        toast({
          title: "Team Added",
          description: `${trimmedName} has been added to your team list.`,
        });
      }
    }
    
    if (isMembersStep && memberEmail.trim()) {
      // Add the member before proceeding to next step
      const trimmedEmail = memberEmail.trim();
      const existsInDraft = draft.members.some(m => m.email === trimmedEmail);
      
      if (!existsInDraft) {
        const newMember = {
          email: trimmedEmail,
          permissionLevel: memberPermissionLevel,
          teamIds: [...memberTeamIds]
        };
        
        const newMembers = [...draft.members, newMember];
        updateMembers(newMembers);
        
        // Clear form fields
        setMemberEmail('');
        setMemberTeamIds([]);
        
        toast({
          title: "Member Added",
          description: `${newMember.email} has been added to the invitation list.`,
        });
      }
    }
    
    const nextStep = step + 1;
    setStep(nextStep);
  };

  const handleBack = () => {
    if (step > 1) {
      const prevStep = step - 1;
      setStep(prevStep);
    }
  };

  const handleCompanyNameChange = (value: string) => {
    updateCompanyName(value);
  };

  const handleAddTeam = () => {
    if (!teamName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a team name",
        variant: "destructive",
      });
      return;
    }

    const trimmedName = teamName.trim();
    const existsInDraft = draft.teams.some(team => team.name.toLowerCase() === trimmedName.toLowerCase());
    
    if (existsInDraft) {
      toast({
        title: "Duplicate Team",
        description: `A team named "${trimmedName}" already exists in your list.`,
        variant: "destructive",
      });
      return;
    }

    // Add team without automatic leadership assignment - users will use checkboxes
    const newTeams = [...draft.teams, { name: trimmedName, isLeadership: false }];
    updateTeams(newTeams);
    setTeamName('');
    
    toast({
      title: "Team Added",
      description: `${trimmedName} has been added to your team list.`,
    });
  };

  const handleRemoveTeam = (index: number) => {
    const removedTeam = draft.teams[index];
    const newTeams = draft.teams.filter((_, i) => i !== index);
    updateTeams(newTeams);
    
    // If removing a leadership team, mark leadership as dismissed
    if (removedTeam.isLeadership) {
      setLeadershipDismissed(true);
      logger.log('📝 Leadership Team removed - marked as dismissed');
    }
    
    toast({
      title: "Team Removed",
      description: `${removedTeam.name} has been removed.`,
    });
  };

  const handleLeadershipToggle = (index: number) => {
    const updatedTeams = draft.teams.map((team, i) => ({
      ...team,
      isLeadership: i === index // Set clicked team as leadership, unset others
    }));
    updateTeams(updatedTeams);
    
    toast({
      title: "Leadership Team Set",
      description: `${draft.teams[index].name} is now the leadership team.`,
    });
  };

  const handleAddMember = () => {
    if (!memberEmail.trim()) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    const trimmedEmail = memberEmail.trim();
    if (draft.members.some(m => m.email === trimmedEmail)) {
      toast({
        title: "Error",
        description: "This email has already been added",
        variant: "destructive",
      });
      return;
    }

    const newMember = {
      email: trimmedEmail,
      permissionLevel: memberPermissionLevel,
      teamIds: [...memberTeamIds]
    };

    const newMembers = [...draft.members, newMember];
    updateMembers(newMembers);
    
    setMemberEmail('');
    setMemberTeamIds([]);
    
    toast({
      title: "Member Added",
      description: `${newMember.email} has been added to the invitation list.`,
    });
  };

  const handleRemoveMember = (index: number) => {
    const removedMember = draft.members[index];
    const newMembers = draft.members.filter((_, i) => i !== index);
    updateMembers(newMembers);
    
    toast({
      title: "Member Removed",
      description: `${removedMember.email} has been removed.`,
    });
  };

  const handleTeamToggle = (teamIndex: number, checked: boolean) => {
    const teamId = `temp-${teamIndex}`; // Use index as temporary ID
    if (checked) {
      setMemberTeamIds([...memberTeamIds, teamId]);
    } else {
      setMemberTeamIds(memberTeamIds.filter(id => id !== teamId));
    }
  };

  const handleCreateWorkspace = async () => {
    if (!draft.companyName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a company name",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingWorkspace(true);
    logger.log('🚀 Creating workspace with draft:', draft);

    // Add timeout to prevent button from getting stuck forever
    const timeoutId = setTimeout(() => {
      logger.error('⏰ Workspace creation timeout - resetting button state');
      setIsCreatingWorkspace(false);
      toast({
        title: "Timeout Error",
        description: "The operation took too long. Please try again.",
        variant: "destructive",
      });
    }, 60000); // 60 second timeout

    try {
      // Step 1: Create company
      logger.log('📝 Creating company:', draft.companyName);
      const companyResult = await Promise.race([
        createCompanyFn({
          companyName: draft.companyName.trim()
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Company creation timeout')), 30000)
        )
      ]) as CreateCompanyResponse;

      if (!companyResult.success) {
        throw new Error(companyResult.error || 'Failed to create company');
      }

      const companyId = companyResult.company_id!;
      logger.log('✅ Company created:', companyId);

      // Flag checked by ProtectedRoute to skip billing redirect while subscription
      // check is still in-flight for the brand new company.
      try { sessionStorage.setItem('just_onboarded', '1'); } catch {}
      // Fire-and-forget: track onboarding completion (non-blocking)
      supabase.from('onboarding').upsert({
        user_id: user!.id,
        org_id: companyId,
        company_name: draft.companyName,
        completed: true,
      }, { onConflict: 'user_id' }).then(({ error: onboardingErr }) => {
        if (onboardingErr) logger.warn('Failed to write onboarding record:', onboardingErr);
      });

      // Track company created event
      trackCompanyCreated({
        user_id: user?.id,
        company_id: companyId,
        company_name: companyResult.company_name || draft.companyName,
      });

      // Step 2: Create teams with individual timeouts
      const createdTeams: Array<{ id: string; name: string }> = [];
      if (draft.teams.length > 0) {
        logger.log('📝 Creating teams:', draft.teams.length);
        for (let i = 0; i < draft.teams.length; i++) {
          const team = draft.teams[i];
          try {
            // Use the isLeadership flag from the team data
            const isLeadership = team.isLeadership || false;
            
            logger.log('📝 Creating team:', {
              name: team.name,
              isLeadership
            });
            
            const createdTeam = await Promise.race([
              createTeamWithMembers(
                team.name,
                companyId,
                user!.id,
                undefined,
                undefined,
                isLeadership,
                isLeadership  // hasStrategicPlan: true for leadership teams
              ),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error(`Team creation timeout for "${team.name}"`)), 15000)
              )
            ]) as { id: string; name: string };
            createdTeams.push({ id: createdTeam.id, name: createdTeam.name });
            logger.log('✅ Team created:', createdTeam.name, isLeadership ? '(Leadership)' : '');
          } catch (teamError: any) {
            logger.error(`❌ Failed to create team "${team.name}":`, teamError);
            // Continue with other teams instead of failing completely
            toast({
              title: "Warning",
              description: `Failed to create team "${team.name}". You can create it later.`,
              variant: "destructive",
            });
          }
        }
      }

      // Step 3: Send invitations with individual timeouts
      if (draft.members.length > 0) {
        logger.log('📝 Sending invitations:', draft.members.length);
        for (const member of draft.members) {
          try {
            // Map temporary team IDs to actual team IDs
            const actualTeamIds = member.teamIds.map(tempId => {
              const index = parseInt(tempId.replace('temp-', ''));
              return createdTeams[index]?.id;
            }).filter(Boolean);

            // Normalize permission level to ensure it's valid
            const normalizedPermissionLevel = mapDBRoleToUIPermission(member.permissionLevel);
            
            await Promise.race([
              sendInvitation({
                email: member.email,
                companyId: companyId,
                permissionLevel: normalizedPermissionLevel as any,
                teamIds: actualTeamIds,
                invitedBy: user!.id
              }),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error(`Invitation timeout for "${member.email}"`)), 10000)
              )
            ]);
            logger.log('✅ Invitation sent to:', member.email);
          } catch (inviteError: any) {
            logger.error(`❌ Failed to send invitation to "${member.email}":`, inviteError);
            // Continue with other invitations instead of failing completely
            toast({
              title: "Warning",
              description: `Failed to send invitation to ${member.email}. You can invite them later.`,
              variant: "destructive",
            });
          }
        }
      }

      // Clear the timeout since we succeeded
      clearTimeout(timeoutId);

      // Success!
      toast({
        title: "Workspace Created!",
        description: `Welcome to ${companyResult.company_name}!`,
      });

      // Clear draft (including leadership dismissed flag) and start redirecting
      clearDraft();
      setIsCreatingWorkspace(false);
      setIsRedirecting(true);
      
      setTimeout(() => {
        try {
          onComplete();
        } catch (error) {
          logger.error('❌ Error during redirect:', error);
          setIsRedirecting(false);
          toast({
            title: "Navigation Error",
            description: "There was an issue redirecting you. Please refresh the page.",
            variant: "destructive",
          });
        }
      }, 2000);

    } catch (error: any) {
      clearTimeout(timeoutId);
      logger.error('❌ Error creating workspace:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create workspace. Please try again.",
        variant: "destructive",
      });
    } finally {
      // Ensure button is always re-enabled (unless we're redirecting)
      if (!isRedirecting) {
        setIsCreatingWorkspace(false);
      }
    }
  };

  const currentStep = steps[step - 1];
  const Icon = currentStep.icon;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Icon className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">{currentStep.title}</CardTitle>
          <CardDescription>{currentStep.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress indicator */}
          <div className="flex justify-center space-x-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index + 1 <= step ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>

          {/* Welcome Step */}
          {!excludeWelcomeStep && step === 1 && (
            <div className="space-y-4 text-center">
              <div className="grid grid-cols-3 gap-4 py-4">
                <div className="flex flex-col items-center space-y-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm text-muted-foreground">Company</span>
                </div>
                <div className="flex flex-col items-center space-y-2">
                  <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center">
                    <Users className="w-4 h-4 text-success" />
                  </div>
                  <span className="text-sm text-muted-foreground">Teams</span>
                </div>
                <div className="flex flex-col items-center space-y-2">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                    <Target className="w-4 h-4 text-secondary-foreground" />
                  </div>
                  <span className="text-sm text-muted-foreground">Metrics</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Zentrix OS helps you manage teams, track metrics, and achieve your goals.
                Let's start by creating your company.
              </p>
              <Button onClick={handleNext} className="w-full">
                Get Started
              </Button>
              <InvitationButton
                variant="onboarding"
                onInvitationAccepted={onInvitationAccepted}
                className="w-full"
              />
            </div>
          )}

          {/* Company Name Step */}
          {((!excludeWelcomeStep && step === 2) || (excludeWelcomeStep && step === 1)) && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  type="text"
                  value={draft.companyName}
                  onChange={(e) => handleCompanyNameChange(e.target.value)}
                  placeholder="Enter your company name"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && draft.companyName.trim()) {
                      handleNext();
                    }
                  }}
                />
              </div>
              <div className="flex space-x-2">
                {step > 1 && (
                  <Button variant="outline" onClick={handleBack} className="flex-1">
                    Back
                  </Button>
                )}
                <Button 
                  onClick={handleNext} 
                  className="flex-1"
                  disabled={!draft.companyName.trim()}
                >
                  Next
                </Button>
              </div>
            </div>
          )}

          {/* Teams Step */}
          {((!excludeWelcomeStep && step === 3) || (excludeWelcomeStep && step === 2)) && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="teamName">Team Name</Label>
                <div className="flex space-x-2">
                  <Input
                    id="teamName"
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="Enter team name"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && teamName.trim()) {
                        handleAddTeam();
                      }
                    }}
                  />
                  <Button onClick={handleAddTeam} size="sm">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {draft.teams.length > 0 && (
                <div className="space-y-2">
                  <Label>Teams ({draft.teams.length})</Label>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                      {draft.teams.map((team, index) => {
                        const hasLeadershipTeam = draft.teams.some(t => t.isLeadership);
                        const canSetAsLeadership = !hasLeadershipTeam || team.isLeadership;
                        
                        return (
                          <div key={index} className="flex items-center justify-between p-3 border rounded-md">
                            <div className="flex items-center gap-3 flex-1">
                              <button
                                onClick={() => handleLeadershipToggle(index)}
                                disabled={team.isLeadership}
                                className={`p-1 rounded-full transition-colors ${
                                  team.isLeadership 
                                    ? 'text-yellow-500 cursor-not-allowed' 
                                    : 'text-muted-foreground hover:text-yellow-400 cursor-pointer'
                                }`}
                                title={team.isLeadership ? 'Leadership team' : 'Set as leadership team'}
                              >
                                <Crown className="w-5 h-5" />
                              </button>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{team.name}</span>
                                {team.isLeadership && (
                                  <div className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs">
                                    <Crown className="w-3 h-3" />
                                    Leadership Team
                                  </div>
                                )}
                              </div>
                            </div>
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={() => handleRemoveTeam(index)}
                           >
                             <Trash2 className="w-4 h-4" />
                           </Button>
                         </div>
                        );
                      })}
                  </div>
                </div>
              )}

              <div className="flex space-x-2">
                <Button variant="outline" onClick={handleBack} className="flex-1">
                  Back
                </Button>
                <Button onClick={handleNext} className="flex-1">
                  Next
                </Button>
              </div>
            </div>
          )}

          {/* Members Step */}
          {((!excludeWelcomeStep && step === 4) || (excludeWelcomeStep && step === 3)) && (
            <div className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="memberEmail">Email Address</Label>
                  <Input
                    id="memberEmail"
                    type="email"
                    value={memberEmail}
                    onChange={(e) => setMemberEmail(e.target.value)}
                    placeholder="Enter email address"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="permissionLevel">Permission Level</Label>
                  <Select value={memberPermissionLevel} onValueChange={setMemberPermissionLevel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="view-only">View Only</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="director">Director</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {draft.teams.length > 0 && (
                  <div className="space-y-2">
                    <Label>Assign to Teams</Label>
                    <div className="space-y-2">
                      {draft.teams.map((team, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Checkbox
                            id={`team-${index}`}
                            size="lg"
                            checked={memberTeamIds.includes(`temp-${index}`)}
                            onCheckedChange={(checked) => handleTeamToggle(index, checked as boolean)}
                          />
                           <Label htmlFor={`team-${index}`} className="text-sm flex items-center gap-1">
                             {team.name}
                             {team.isLeadership && <Crown className="w-3 h-3 text-amber-600" />}
                           </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button onClick={handleAddMember} className="w-full" disabled={!memberEmail.trim()}>
                  Add Member
                </Button>
              </div>

              {draft.members.length > 0 && (
                <div className="space-y-2">
                  <Label>Invited Members ({draft.members.length})</Label>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {draft.members.map((member, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded-md">
                        <div className="flex-1">
                          <div className="text-sm font-medium">{member.email}</div>
                          <div className="text-xs text-muted-foreground capitalize">{member.permissionLevel}</div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex space-x-2">
                <Button variant="outline" onClick={handleBack} className="flex-1">
                  Back
                </Button>
                <Button onClick={handleNext} className="flex-1">
                  Next
                </Button>
              </div>
            </div>
          )}

          {/* Create Workspace Step */}
          {((!excludeWelcomeStep && step === 5) || (excludeWelcomeStep && step === 4)) && (
            <div className="space-y-4">
              <div className="space-y-4">
                <div className="p-4 border rounded-lg space-y-4">
                  <h4 className="font-medium">Review Your Workspace</h4>
                  
                  <div>
                    <span className="text-sm font-medium">Company:</span>
                    <span className="text-sm ml-2">{draft.companyName}</span>
                  </div>
                  
                  <div>
                    <span className="text-sm font-medium">Teams:</span>
                    {draft.teams.length > 0 ? (
                      <div className="ml-2 mt-1 space-y-1">
                        {draft.teams.map((team, index) => (
                          <div key={index} className="text-sm text-muted-foreground">
                            • {team.name}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm ml-2 text-muted-foreground">No teams</span>
                    )}
                  </div>
                  
                  <div>
                    <span className="text-sm font-medium">Invitations:</span>
                    {draft.members.length > 0 ? (
                      <div className="ml-2 mt-1 space-y-1">
                        {draft.members.map((member, index) => (
                          <div key={index} className="text-sm text-muted-foreground">
                            • {member.email} ({member.permissionLevel})
                            {member.teamIds.length > 0 && (
                              <span className="text-xs ml-2">
                                → {member.teamIds.map(tempId => {
                                  const teamIndex = parseInt(tempId.replace('temp-', ''));
                                  return draft.teams[teamIndex]?.name;
                                }).filter(Boolean).join(', ')}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm ml-2 text-muted-foreground">No invitations</span>
                    )}
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground text-center">
                  Click "Create Workspace" to set up your company, teams, and send invitations.
                </p>
              </div>

              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  onClick={handleBack} 
                  className="flex-1"
                  disabled={isCreatingWorkspace || isRedirecting}
                >
                  Back
                </Button>
                <Button 
                  onClick={handleCreateWorkspace} 
                  className="flex-1"
                  disabled={isCreatingWorkspace || isRedirecting}
                  aria-busy={isCreatingWorkspace || isRedirecting}
                >
                  {isCreatingWorkspace ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : isRedirecting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Redirecting...
                    </>
                  ) : (
                    'Create Workspace'
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardingWizardV2;