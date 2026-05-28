import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { createFirstCompany, CreateCompanyRequest, CreateCompanyResponse } from '@/services/onboardingService';
import { createTeamWithMembers } from '@/services/teamOperationsService';
import { sendInvitation } from '@/services/invitationService';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Building2, Users, Target, CheckCircle, UserPlus, Trash2, Plus } from 'lucide-react';
import { InvitationButton } from '@/components/invitations/InvitationButton';
import { logger } from '@/utils/logger';

interface OnboardingWizardProps {
  onComplete: () => void;
  initialStep?: number;
  excludeWelcomeStep?: boolean;
  createCompanyFn?: (request: CreateCompanyRequest) => Promise<CreateCompanyResponse>;
  onInvitationAccepted?: () => void;
}

const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete, initialStep, excludeWelcomeStep = false, createCompanyFn = createFirstCompany, onInvitationAccepted }) => {
  const startingStep = excludeWelcomeStep ? 1 : (initialStep || 1);
  const [step, setStep] = useState(startingStep);
  const [companyName, setCompanyName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createdCompanyId, setCreatedCompanyId] = useState<string>('');
  
  // Team creation state
  const [teams, setTeams] = useState<Array<{ id?: string; name: string }>>([]);
  const [teamName, setTeamName] = useState('');
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  
  // Member invitation state
  const [members, setMembers] = useState<Array<{ email: string; permissionLevel: string; teamIds: string[] }>>([]);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberPermissionLevel, setMemberPermissionLevel] = useState('member');
  const [memberTeamIds, setMemberTeamIds] = useState<string[]>([]);
  const [isInvitingMembers, setIsInvitingMembers] = useState(false);
  const [createdTeamIds, setCreatedTeamIds] = useState<string[]>([]);

  const { toast } = useToast();
  const { user } = useAuth();

  // Enhanced 5-step onboarding flow
  const allSteps = [
    {
      title: 'Welcome to Zentrix OS',
      description: 'Let\'s get you set up with your first company',
      icon: Building2
    },
    {
      title: 'Create Your Company',
      description: 'Enter your company details to get started',
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
      title: 'All Set!',
      description: 'Your company is ready to go',
      icon: CheckCircle
    }
  ];

  // Filter out welcome step if requested
  const steps = excludeWelcomeStep ? allSteps.slice(1) : allSteps;

  const handleCreateCompany = async () => {
    if (!companyName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a company name",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    logger.log('🚀 Creating company:', companyName, 'Current step:', step);

    try {
      const result = await createCompanyFn({
        companyName: companyName.trim()
      });

      if (result.success) {
        logger.log('✅ Company created successfully:', result);
        setCreatedCompanyId(result.company_id!);
        toast({
          title: "Company Created!",
          description: `Welcome to ${result.company_name}!`,
        });
        const nextStep = step + 1;
        logger.log('🔄 Moving from step', step, 'to step', nextStep);
        setStep(nextStep);
      } else {
        logger.error('❌ Company creation failed:', result.error);
        toast({
          title: "Error",
          description: result.error || "Failed to create company. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      logger.error('❌ Error during company creation:', error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
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
    
    // Check if team with this name already exists in the current list or was already created
    const existsInCurrentList = teams.some(team => team.name.toLowerCase() === trimmedName.toLowerCase());
    
    if (existsInCurrentList) {
      toast({
        title: "Duplicate Team",
        description: `A team named "${trimmedName}" already exists in your list.`,
        variant: "destructive",
      });
      return;
    }

    const newTeam = {
      name: trimmedName
    };

    setTeams([...teams, newTeam]);
    setTeamName('');
    
    toast({
      title: "Team Added",
      description: `${newTeam.name} has been added to your team list.`,
    });
  };

  const handleRemoveTeam = (index: number) => {
    const removedTeam = teams[index];
    setTeams(teams.filter((_, i) => i !== index));
    toast({
      title: "Team Removed",
      description: `${removedTeam.name} has been removed.`,
    });
  };

  const handleCreateTeams = async () => {
    // CRITICAL FIX #1: Set loading state immediately to prevent re-render interruption
    setIsCreatingTeam(true);
    
    logger.log('🔍 handleCreateTeams started', { 
      teamName: teamName.trim(), 
      teamsLength: teams.length,
      teams: teams,
      createdCompanyId,
      createdTeamIds 
    });
    
    try {
      // CRITICAL FIX #2: Validate user authentication
      if (!user?.id) {
        logger.log('❌ User not authenticated');
        throw new Error('User not authenticated');
      }

      // CRITICAL FIX #3: Validate company context
      if (!createdCompanyId) {
        logger.log('❌ No company ID available');
        throw new Error('No company context available');
      }

      logger.log('✅ User and company validation passed', { 
        userId: user.id, 
        companyId: createdCompanyId 
      });

      // Check if teams were already created
      if (createdTeamIds.length > 0) {
        logger.log('✅ Teams already created, moving to next step');
        const nextStep = step + 1;
        setStep(nextStep);
        return;
      }

      // Auto-add current team name if it exists and isn't already in the list
      let finalTeams = [...teams];
      const trimmedTeamName = teamName.trim();
      if (trimmedTeamName && !teams.some(team => team.name.toLowerCase() === trimmedTeamName.toLowerCase())) {
        logger.log('🔄 Auto-adding team:', trimmedTeamName);
        finalTeams.push({ name: trimmedTeamName });
      }

      // Filter out teams that might already exist (additional safety check)
      const teamsToCreate = finalTeams.filter(team => !team.id);

      logger.log('🔍 Final teams to create:', teamsToCreate);

      if (teamsToCreate.length === 0) {
        throw new Error('Please add at least one team');
      }

      // CRITICAL FIX #4: Create teams with proper error handling
      const teamIds: string[] = [];
      const createdTeams: Array<{ id: string; name: string }> = [];
      
      for (const team of teamsToCreate) {
        logger.log('🔄 Creating team:', team.name);
        
        // CRITICAL FIX #5: Fix function signature - match exact parameters
        const createdTeam = await createTeamWithMembers(
          team.name,           // name: string
          createdCompanyId,    // companyId: string  
          user.id,             // userId: string
          undefined,           // description?: string (explicitly undefined)
          undefined,           // memberIds?: string[] (explicitly undefined)
          false                // isLeadership: boolean = false (explicitly false)
        );
        
        teamIds.push(createdTeam.id);
        createdTeams.push({ id: createdTeam.id, name: createdTeam.name });
        logger.log('✅ Team created successfully:', { 
          teamId: createdTeam.id, 
          teamName: createdTeam.name 
        });
      }

      // Success - update state with actual team data and proceed
      setCreatedTeamIds(teamIds);
      setTeams(createdTeams); // Update teams with actual database team data
      setTeamName(''); // Clear the team name field to prevent duplicates when going back
      
      toast({
        title: "Teams Created!",
        description: `${teamsToCreate.length} team(s) have been created successfully.`,
      });
      
      const nextStep = step + 1;
      logger.log('🔄 Moving to next step:', nextStep);
      setStep(nextStep);
      
    } catch (error: any) {
      logger.error('❌ Error in handleCreateTeams:', error);
      
      // CRITICAL FIX #6: Proper error handling with user feedback
      toast({
        title: "Error Creating Teams",
        description: error.message || "Failed to create teams. Please try again.",
        variant: "destructive",
      });
    } finally {
      // CRITICAL FIX #7: Always reset loading state
      setIsCreatingTeam(false);
      logger.log('🏁 handleCreateTeams completed');
    }
  };

  const handleAddMember = async (): Promise<boolean> => {
    logger.log('🔍 handleAddMember: Starting with email:', memberEmail);
    
    if (!memberEmail.trim()) {
      logger.log('❌ handleAddMember: No email provided');
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return false;
    }

    if (members.some(m => m.email === memberEmail.trim())) {
      logger.log('❌ handleAddMember: Email already exists:', memberEmail.trim());
      toast({
        title: "Error",
        description: "This email has already been added",
        variant: "destructive",
      });
      return false;
    }

    const newMember = {
      email: memberEmail.trim(),
      permissionLevel: memberPermissionLevel,
      teamIds: [...memberTeamIds]
    };

    logger.log('🔄 handleAddMember: Adding new member:', newMember);

    // CRITICAL FIX: Use proper async state update with useCallback pattern
    return new Promise((resolve) => {
      setMembers(prevMembers => {
        const updatedMembers = [...prevMembers, newMember];
        logger.log('🔄 handleAddMember: Updated members array length:', updatedMembers.length);
        
        // Use requestAnimationFrame to ensure React has processed the state update
        requestAnimationFrame(() => {
          logger.log('✅ handleAddMember: State update committed, resolving with true');
          resolve(true);
        });
        
        return updatedMembers;
      });
      
      setMemberEmail('');
      setMemberTeamIds([]);
      
      toast({
        title: "Member Added",
        description: `${newMember.email} has been added to the invitation list.`,
      });
    });
  };

  const handleTeamToggle = (teamId: string, checked: boolean) => {
    if (checked) {
      setMemberTeamIds([...memberTeamIds, teamId]);
    } else {
      setMemberTeamIds(memberTeamIds.filter(id => id !== teamId));
    }
  };

  const updateMemberTeams = (memberIndex: number, teamIds: string[]) => {
    const updatedMembers = [...members];
    updatedMembers[memberIndex].teamIds = teamIds;
    setMembers(updatedMembers);
  };

  const handleRemoveMember = (index: number) => {
    const removedMember = members[index];
    setMembers(members.filter((_, i) => i !== index));
    toast({
      title: "Member Removed",
      description: `${removedMember.email} has been removed.`,
    });
  };

  const handleInviteMembers = async () => {
    setIsInvitingMembers(true);

    try {
      for (const member of members) {
        await sendInvitation({
          email: member.email,
          companyId: createdCompanyId,
          permissionLevel: member.permissionLevel as any,
          teamIds: member.teamIds,
          invitedBy: user?.id || ''
        });
      }

      toast({
        title: "Invitations Sent!",
        description: `${members.length} invitation(s) have been sent successfully.`,
      });
      const nextStep = step + 1;
      logger.log('🔄 Moving from step', step, 'to step', nextStep, 'after inviting members');
      setStep(nextStep);
    } catch (error: any) {
      logger.error('❌ Error sending invitations:', error);
      toast({
        title: "Error",
        description: "Failed to send invitations. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsInvitingMembers(false);
    }
  };

  const handleSkipTeams = () => {
    const nextStep = step + 1;
    logger.log('🔄 Skipping teams - moving from step', step, 'to step', nextStep);
    setStep(nextStep);
  };

  const handleSkipMembers = () => {
    const nextStep = step + 1;
    logger.log('🔄 Skipping members - moving from step', step, 'to step', nextStep);
    setStep(nextStep);
  };

  const handleCompleteOnboarding = () => {
    setTimeout(() => {
      onComplete();
    }, 2000);
  };

  const currentStep = steps[step - 1];
  const Icon = currentStep.icon;

  logger.log('🔍 OnboardingWizard render:', {
    step,
    excludeWelcomeStep,
    totalSteps: steps.length,
    currentStepTitle: currentStep?.title
  });

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
                  <div className="w-8 h-8 rounded-full bg-info/10 flex items-center justify-center">
                    <Target className="w-4 h-4 text-info" />
                  </div>
                  <span className="text-sm text-muted-foreground">Metrics</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Zentrix OS helps you manage teams, track metrics, and achieve your goals.
                Let's start by creating your company.
              </p>
              <Button onClick={() => setStep(step + 1)} className="w-full">
                Get Started
              </Button>
              <InvitationButton
                variant="onboarding"
                onInvitationAccepted={onInvitationAccepted}
                className="w-full"
              />
            </div>
          )}

          {((!excludeWelcomeStep && step === 2) || (excludeWelcomeStep && step === 1)) && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Enter your company name"
                  disabled={isCreating}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isCreating) {
                      handleCreateCompany();
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  This will be the name of your organization in Zentrix OS
                </p>
              </div>
              
              <div className="flex space-x-2">
                {!excludeWelcomeStep && (
                  <Button 
                    variant="outline" 
                    onClick={() => setStep(step - 1)}
                    disabled={isCreating}
                    className="w-full"
                  >
                    Back
                  </Button>
                )}
                <Button
                  onClick={handleCreateCompany}
                  disabled={isCreating || !companyName.trim()}
                  className="w-full"
                >
                  {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Company
                </Button>
              </div>
            </div>
          )}

          {((!excludeWelcomeStep && step === 3) || (excludeWelcomeStep && step === 2)) && (
            <div className="space-y-4">
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="teamName">Team Name</Label>
                    <Input
                      id="teamName"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      placeholder="e.g., Leadership, Engineering, Marketing, Sales"
                      disabled={isCreatingTeam}
                    />
                    <p className="text-xs text-muted-foreground">
                      You will be automatically added as the team owner
                    </p>
                  </div>
                  <Button 
                    onClick={handleAddTeam} 
                    disabled={!teamName.trim() || isCreatingTeam}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Team
                  </Button>
                </div>

                {teams.length > 0 && (
                  <div className="space-y-2">
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {teams.map((team, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                           <div className="flex-1">
                             <p className="font-medium text-sm">{team.name}</p>
                             {createdTeamIds.length > 0 && team.id && (
                               <p className="text-xs text-muted-foreground">✓ Already created</p>
                             )}
                           </div>
                          {createdTeamIds.length === 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveTeam(index)}
                              disabled={isCreatingTeam}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                          {createdTeamIds.length > 0 && team.id && (
                            <CheckCircle className="w-4 h-4 text-success" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setStep(step - 1)}
                  disabled={isCreatingTeam}
                  className="w-full"
                >
                  Back
                </Button>
                {createdTeamIds.length === 0 ? (
                  <>
                    <Button 
                      variant="ghost" 
                      onClick={handleSkipTeams}
                      disabled={isCreatingTeam}
                      className="w-full"
                    >
                      Skip
                    </Button>
                    <Button 
                      onClick={handleCreateTeams}
                      disabled={isCreatingTeam || (teams.length === 0 && !teamName.trim())}
                      className="w-full"
                    >
                      {isCreatingTeam && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create Teams
                    </Button>
                  </>
                ) : (
                  <Button 
                    onClick={() => setStep(step + 1)}
                    className="w-full"
                  >
                    Continue
                  </Button>
                )}
              </div>
            </div>
          )}

          {((!excludeWelcomeStep && step === 4) || (excludeWelcomeStep && step === 3)) && (
            <div className="space-y-4">
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="memberEmail">Email Address</Label>
                    <Input
                      id="memberEmail"
                      type="email"
                      value={memberEmail}
                      onChange={(e) => setMemberEmail(e.target.value)}
                      placeholder="colleague@company.com"
                      disabled={isInvitingMembers}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="memberPermission">Permission Level</Label>
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
                   
                   {/* Team Assignment Section */}
                   {createdTeamIds.length > 0 && (
                     <div className="space-y-2">
                       <Label htmlFor="teamSelect">Assign to Team (Optional)</Label>
                       <Select 
                         value={memberTeamIds[0] || "none"} 
                         onValueChange={(teamId) => setMemberTeamIds(teamId === "none" ? [] : [teamId])}
                       >
                         <SelectTrigger className="bg-background">
                           <SelectValue placeholder="Select a team" />
                         </SelectTrigger>
                         <SelectContent className="bg-background border">
                           <SelectItem value="none">No team assignment</SelectItem>
                            {teams.map((team) => (
                              <SelectItem 
                                key={team.id} 
                                value={team.id!}
                                className="hover:bg-muted"
                              >
                                {team.name}
                              </SelectItem>
                            ))}
                         </SelectContent>
                       </Select>
                       <p className="text-xs text-muted-foreground">
                         Select which team this member should join.
                       </p>
                     </div>
                   )}
                   
                   <Button 
                     onClick={handleAddMember} 
                     disabled={!memberEmail.trim() || isInvitingMembers}
                     variant="outline"
                     size="sm"
                     className="w-full"
                   >
                     <Plus className="w-4 h-4 mr-2" />
                     Add Member
                   </Button>
                </div>

                {members.length > 0 && (
                  <div className="space-y-2">
                    <Label>Members to Invite</Label>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {members.map((member, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                           <div className="flex-1">
                             <p className="font-medium text-sm">{member.email}</p>
                             <p className="text-xs text-muted-foreground capitalize">{member.permissionLevel}</p>
                             {member.teamIds.length > 0 && (
                               <p className="text-xs text-muted-foreground">
                                  Teams: {member.teamIds.map(teamId => {
                                    const team = teams.find(t => t.id === teamId);
                                    return team ? team.name : 'Unknown';
                                  }).join(', ')}
                               </p>
                             )}
                           </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveMember(index)}
                            disabled={isInvitingMembers}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setStep(step - 1)}
                  disabled={isInvitingMembers}
                  className="w-full"
                >
                  Back
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={handleSkipMembers}
                  disabled={isInvitingMembers}
                  className="w-full"
                >
                  Skip
                </Button>
                <Button 
                  onClick={async () => {
                    logger.log('🔍 Continue button clicked - Current state:', {
                      memberEmail: memberEmail.trim(),
                      membersLength: members.length,
                      members: members.map(m => m.email)
                    });
                    
                    // Auto-add pending member if email is filled but not added
                    if (memberEmail.trim() && members.length === 0) {
                      logger.log('🔍 Auto-adding pending member before continue:', memberEmail);
                      const memberAdded = await handleAddMember();
                      
                      if (memberAdded) {
                        logger.log('✅ Member added successfully, FORCING invitation send');
                        // CRITICAL FIX: Don't rely on state checks - we KNOW we just added a member
                        // Force invitation to be sent since we just successfully added a member
                        await handleInviteMembers();
                      } else {
                        logger.log('❌ Member not added, skipping');
                        handleSkipMembers();
                      }
                    } else if (members.length > 0) {
                      logger.log('✅ Members already in state, sending invitations');
                      await handleInviteMembers();
                    } else {
                      logger.log('🔄 No members to invite, skipping');
                      handleSkipMembers();
                    }
                  }}
                  disabled={isInvitingMembers}
                  className="w-full"
                >
                  {isInvitingMembers && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {members.length > 0 ? 'Send Invites' : 'Continue'}
                </Button>
              </div>
            </div>
          )}

          {((!excludeWelcomeStep && step === 5) || (excludeWelcomeStep && step === 4)) && (() => {
            // Trigger completion when step 5 loads
            setTimeout(() => {
              onComplete();
            }, 2000);
            
            return (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-success/10 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-success" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Welcome to your new company!</h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>Your onboarding is complete:</p>
                    <div className="space-y-1">
                      <p>✓ Company created</p>
                      {teams.length > 0 && <p>✓ {teams.length} team(s) created</p>}
                      {members.length > 0 && <p>✓ {members.length} invitation(s) sent</p>}
                    </div>
                    <p className="mt-2">You'll be redirected to the dashboard in a moment.</p>
                  </div>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Setting up your workspace...</span>
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardingWizard;