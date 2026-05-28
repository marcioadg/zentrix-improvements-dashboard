
import React from 'react';
import { UserAvatar } from '@/components/UserAvatar';

interface OwnerInitialsProps {
  ownerId: string;
  members: Array<{
    user_id: string;
    profiles?: {
      full_name: string;
      email: string;
      avatar_url?: string;
    };
  }>;
}

export const OwnerInitials: React.FC<OwnerInitialsProps> = ({ ownerId, members }) => {
  const owner = members.find(m => m.user_id === ownerId);
  
  return (
    <UserAvatar
      userId={ownerId}
      fullName={owner?.profiles?.full_name}
      email={owner?.profiles?.email}
      avatarUrl={owner?.profiles?.avatar_url}
      size="sm"
      className="bg-primary text-primary-foreground"
    />
  );
};
