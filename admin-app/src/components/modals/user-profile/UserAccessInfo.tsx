import React from 'react';
import { Mail, Calendar } from 'lucide-react';
import { CompanyUser } from '@/types/companyUser';
interface UserAccessInfoProps {
  user: CompanyUser;
}
const getAccessTypeDisplay = (accessType?: string) => {
  switch (accessType) {
    case 'direct':
      return {
        description: 'Has direct access to the company'
      };
    case 'team_member':
      return {
        description: 'Access granted through team membership'
      };
    default:
      return {
        description: 'Company member'
      };
  }
};
export const UserAccessInfo: React.FC<UserAccessInfoProps> = ({
  user
}) => {
  const accessDisplay = getAccessTypeDisplay(user.access_type);
  return <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Mail className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm">{user.email}</span>
      </div>
      
      <div className="flex items-center gap-3">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm">
          Joined {new Date(user.created_at).toLocaleDateString()}
        </span>
      </div>

      
    </div>;
};