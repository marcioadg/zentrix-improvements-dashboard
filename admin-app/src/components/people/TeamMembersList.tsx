
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, AlertCircle, Info } from 'lucide-react';
import { UserRow } from './UserRow';
import { UnifiedUser } from '@/hooks/useUserManagement';

interface TeamMembersListProps {
  users: UnifiedUser[];
  currentUserId?: string;
  roleUpdating: string | null;
  onUserClick: (user: UnifiedUser) => void;
  onRoleChange: (userId: string, newRole: string) => void;
  onEditName: (user: UnifiedUser) => void;
  onDeactivateUser: (user: UnifiedUser) => void;
  onDeleteUser: (user: UnifiedUser) => void;
}

export const TeamMembersList: React.FC<TeamMembersListProps> = ({
  users,
  currentUserId,
  roleUpdating,
  onUserClick,
  onRoleChange,
  onEditName,
  onDeactivateUser,
  onDeleteUser,
}) => {
  const directUsers = users.filter(user => user.access_type === 'direct');
  const teamUsers = users.filter(user => user.access_type === 'team_member');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Team Members ({users.length})
        </CardTitle>
        {teamUsers.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Info className="h-4 w-4" />
            Showing company members and users explicitly added to teams
          </div>
        )}
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground mb-2">No team members found</p>
            <p className="text-sm text-muted-foreground">
              Add members to get started with your team.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {users.map((person) => (
              <UserRow
                key={person.user_id}
                person={person}
                currentUserId={currentUserId}
                roleUpdating={roleUpdating}
                onUserClick={onUserClick}
                onRoleChange={onRoleChange}
                onEditName={onEditName}
                onDeactivateUser={onDeactivateUser}
                onDeleteUser={onDeleteUser}
                users={users}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
