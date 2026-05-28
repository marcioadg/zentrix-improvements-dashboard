
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Filter, Edit, Trash2, User, AlertTriangle } from 'lucide-react';
import { useOrgChartOptimized } from '@/hooks/useOrgChartOptimized';
import { RoleConfigModal } from './RoleConfigModal';
import { useToast } from '@/hooks/use-toast';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { logger } from '@/utils/logger';

export const RoleManagement: React.FC = () => {
  const { roles, deleteRole, updateRole, checkUserPermissions } = useOrgChartOptimized();
  const { currentCompany } = useMultiCompanyAccess();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [showVacantOnly, setShowVacantOnly] = useState(false);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);

  // Helper function to find parent role title
  const getParentRoleTitle = (reportToRoleId: string | null) => {
    if (!reportToRoleId) return null;
    const parentRole = roles.find(r => r.id === reportToRoleId);
    return parentRole?.title || 'Unknown Role';
  };

  // Validate permissions before allowing operations
  const validatePermissions = async () => {
    if (!currentCompany) {
      toast({
        title: "No Company Selected",
        description: "Please select a company before managing organizational roles.",
        variant: "destructive"
      });
      return false;
    }

    try {
      const permissionCheck = await checkUserPermissions();
      if (!permissionCheck.canManage) {
        toast({
          title: "Permission Denied",
          description: `You need owner, admin, or manager permissions in ${currentCompany?.name} to manage organizational roles. Current reason: ${permissionCheck.reason}`,
          variant: "destructive"
        });
        return false;
      }
      return true;
    } catch (error) {
      logger.error('Permission check failed:', error);
      toast({
        title: "Permission Check Failed",
        description: "Unable to verify your permissions. Please try again.",
        variant: "destructive"
      });
      return false;
    }
  };

  const filteredRoles = roles.filter(role => {
    const matchesSearch = role.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesVacant = !showVacantOnly || !role.assignments?.length;
    return matchesSearch && matchesVacant;
  });

  const handleEdit = async (roleId: string) => {
    const hasPermission = await validatePermissions();
    if (!hasPermission) return;

    setEditingRole(roleId);
    setIsRoleModalOpen(true);
  };

  const handleDelete = async (roleId: string) => {
    const hasPermission = await validatePermissions();
    if (!hasPermission) return;

    if (confirm('Are you sure you want to delete this role? This action cannot be undone.')) {
      try {
        await deleteRole(roleId);
        toast({
          title: "Success",
          description: "Role deleted successfully."
        });
      } catch (error) {
        logger.error('Failed to delete role:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred while deleting the role.';
        
        let displayMessage = errorMessage;
        if (errorMessage.includes('Permission denied') || errorMessage.includes('Insufficient permissions')) {
          displayMessage = `You don't have permission to delete roles in ${currentCompany?.name || 'this company'}. You need owner, admin, or manager permissions.`;
        }

        toast({
          title: "Failed to Delete Role",
          description: displayMessage,
          variant: "destructive"
        });
      }
    }
  };

  const handleSaveRole = async (roleData: any) => {
    try {
      if (editingRole) {
        await updateRole(editingRole, roleData);
        toast({
          title: "Success",
          description: "Role updated successfully."
        });
      }
      setIsRoleModalOpen(false);
      setEditingRole(null);
    } catch (error) {
      logger.error('Failed to update role:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred while updating the role.';
      
      let displayMessage = errorMessage;
      if (errorMessage.includes('Permission denied') || errorMessage.includes('Insufficient permissions')) {
        displayMessage = `You don't have permission to update roles in ${currentCompany?.name || 'this company'}. You need owner, admin, or manager permissions.`;
      } else if (errorMessage.includes('not available for assignment')) {
        displayMessage = 'The selected user is not available for assignment to this role.';
      }

      toast({
        title: "Failed to Update Role",
        description: displayMessage,
        variant: "destructive"
      });
    }
  };

  const vacantRolesCount = roles.filter(role => !role.assignments?.length).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Role Management</h2>
          <p className="text-muted-foreground mt-1">
            View and manage all roles across your organization
          </p>
        </div>
        
        {vacantRolesCount > 0 && (
          <Badge variant="destructive" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {vacantRolesCount} vacant positions
          </Badge>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search roles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <Button
          variant={showVacantOnly ? "default" : "outline"}
          onClick={() => setShowVacantOnly(!showVacantOnly)}
          className="flex items-center gap-2"
        >
          <Filter className="h-4 w-4" />
          Vacant Only
        </Button>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRoles.map((role) => {
          const assignedPerson = role.assignments?.[0]?.profile;
          const isVacant = !assignedPerson;

          return (
            <Card key={role.id} className={isVacant ? 'border-destructive/30 bg-destructive/5' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{role.title}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(role.id)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(role.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {isVacant && (
                  <Badge variant="destructive" className="w-fit">
                    Vacant Position
                  </Badge>
                )}
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Assigned Person */}
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    {assignedPerson ? (
                      <>
                        <AvatarImage src={assignedPerson.avatar_url} />
                        <AvatarFallback>
                          {assignedPerson.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </>
                    ) : (
                      <AvatarFallback>
                        <User className="h-5 w-5 text-muted-foreground" />
                      </AvatarFallback>
                    )}
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    {assignedPerson ? (
                      <>
                        <p className="font-medium text-sm truncate">
                          {assignedPerson.full_name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {assignedPerson.email}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        No one assigned
                      </p>
                    )}
                  </div>
                </div>

                {/* Reports To */}
                {role.reports_to_role_id && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Reports to:</p>
                    <p className="text-sm font-medium">
                      {getParentRoleTitle(role.reports_to_role_id)}
                    </p>
                  </div>
                )}

                {/* Responsibilities */}
                {role.responsibilities && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Key responsibilities:</p>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {role.responsibilities}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredRoles.length === 0 && (
        <div className="text-center py-12">
          <User className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            No roles found
          </h3>
          <p className="text-muted-foreground">
            {searchTerm || showVacantOnly
              ? 'Try adjusting your filters to see more roles'
              : 'Create your first role to get started'
            }
          </p>
        </div>
      )}

      {/* Role Edit Modal */}
      <RoleConfigModal
        isOpen={isRoleModalOpen}
        onClose={() => {
          setIsRoleModalOpen(false);
          setEditingRole(null);
        }}
        roleId={editingRole}
        roles={roles}
        onSave={handleSaveRole}
      />
    </div>
  );
};
