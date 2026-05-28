import React, { useState } from 'react';
import { useTeamManagement } from '@/hooks/useTeamManagement';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, Users, Trash2, RefreshCw, AlertTriangle, ChevronDown, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TeamMembersManagement } from '@/components/teams/TeamMembersManagement';
import { logger } from '@/utils/logger';

export const Teams = () => {
  const { profile } = useProfile();
  const { teams, loading, createTeam, refetch, deleteTeam } = useTeamManagement();
  const { toast } = useToast();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDescription, setNewTeamDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());

  const canManageTeams = profile?.role === 'manager' || profile?.role === 'director' || profile?.role === 'super_admin';

  const toggleTeamExpansion = (teamId: string) => {
    setExpandedTeams(prev => {
      const newSet = new Set(prev);
      if (newSet.has(teamId)) {
        newSet.delete(teamId);
      } else {
        newSet.add(teamId);
      }
      return newSet;
    });
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Team name is required',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);
    try {
      logger.log('Teams page: Creating team with name:', newTeamName.trim());
      logger.log('Teams page: User profile:', {
        userId: profile?.id,
        userRole: profile?.role,
        userCompany: profile?.company_id
      });

      const result = await createTeam(newTeamName.trim(), newTeamDescription.trim() || undefined);
      logger.log('Teams page: Team created successfully:', result);

      toast({
        title: 'Success',
        description: `Team "${newTeamName.trim()}" created successfully`,
      });

      setNewTeamName('');
      setNewTeamDescription('');
      setCreateModalOpen(false);
    } catch (error) {
      logger.error('Teams page: Error creating team:', error);
      
      let errorMessage = 'Failed to create team';
      let errorTitle = 'Error';
      
      if (error instanceof Error) {
        logger.log('Teams page: Error details:', {
          message: error.message,
          stack: error.stack
        });
        
        if (error.message.includes('Permission denied')) {
          errorTitle = 'Permission Denied';
          errorMessage = error.message;
        } else if (error.message.includes('already exists')) {
          errorTitle = 'Team Already Exists';
          errorMessage = error.message;
        } else if (error.message.includes('row-level security')) {
          errorTitle = 'Access Denied';
          errorMessage = 'You do not have permission to create teams in this company.';
        } else if (error.message.includes('authentication')) {
          errorTitle = 'Authentication Error';
          errorMessage = 'Please log out and log back in, then try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    if (!confirm(`Are you sure you want to delete the team "${teamName}"? This will remove meetings, issues, tasks, metrics, and related data. This action cannot be undone.`)) {
      return;
    }

    try {
      logger.log('Teams page: Deleting team via hook:', { teamId, teamName });
      await deleteTeam(teamId);
      // Hook optimistically updates state; refetch to be extra safe
      refetch();
    } catch (error) {
      logger.error('Teams page: Error deleting team:', error);
      let errorMessage = 'Failed to delete team';
      if (error instanceof Error) {
        if (
          error.message.includes('Permission denied') ||
          error.message.includes('row-level security')
        ) {
          errorMessage = 'You do not have permission to delete this team.';
        } else {
          errorMessage = error.message;
        }
      }
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  if (!canManageTeams) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You don't have permission to manage teams.</p>
          <p className="text-sm text-muted-foreground mt-2">
            Current role: {profile?.role || 'Unknown'}
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  // Show error state if there's an error loading teams
  

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold text-foreground tracking-tight">Team Management</h1>
          <p className="text-muted-foreground mt-2">
            Create and manage teams within your organization. Use the People page to assign team members.
          </p>
          {profile?.role === 'super_admin' && (
            <p className="text-sm text-primary mt-1">
              Super Admin: You can create teams in any company
            </p>
          )}
        </div>
        <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Team
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Team</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div>
                <Label htmlFor="teamName">Team Name</Label>
                <Input
                  id="teamName"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="Enter team name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="teamDescription">Description (Optional)</Label>
                <Textarea
                  id="teamDescription"
                  value={newTeamDescription}
                  onChange={(e) => setNewTeamDescription(e.target.value)}
                  placeholder="Enter team description"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateModalOpen(false)}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? 'Creating...' : 'Create Team'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {teams.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium mb-2">No teams yet</h3>
          <p className="text-muted-foreground mb-4">
            Get started by creating your first team
          </p>
          <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Team
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
      ) : (
        <div className="space-y-6">
          {teams.map((team) => (
            <Card key={team.id}>
              <Collapsible
                open={expandedTeams.has(team.id)}
                onOpenChange={() => toggleTeamExpansion(team.id)}
              >
                <CardHeader>
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between w-full cursor-pointer group rounded-md transition-colors hover:bg-accent/50 p-1 -m-1">
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        {team.name}
                        <ChevronDown className={`h-4 w-4 transition-transform ${expandedTeams.has(team.id) ? 'rotate-180' : ''}`} />
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleTeamExpansion(team.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTeam(team.id, team.name);
                          }}
                          className="text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  {team.description && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {team.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Created: {new Date(team.created_at).toLocaleDateString()}
                  </p>
                </CardHeader>
                
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <TeamMembersManagement teamId={team.id} teamName={team.name} />
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Managing Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            To assign people to teams, go to the <strong>People</strong> page where you can toggle team memberships for each person using simple switches.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Teams;
