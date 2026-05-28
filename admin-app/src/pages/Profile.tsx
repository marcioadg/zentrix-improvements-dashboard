import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/UserAvatar';
import { AddMemberModal } from '@/components/modals/AddMemberModal';
import { UserPlus } from 'lucide-react';
import { useState } from 'react';

const Profile: React.FC = () => {
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const [showInviteModal, setShowInviteModal] = useState(false);

  const handleSignOut = async () => {
    await signOut();
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="text-center pt-8">
          <h1 className="text-2xl font-bold text-foreground mb-8">Profile</h1>
        </div>

        {/* User Avatar Section */}
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <UserAvatar
              userId={user.id}
              fullName={profile?.full_name}
              email={user.email}
              avatarUrl={profile?.avatar_url}
              size="lg"
              className="h-24 w-24 border-4 border-primary/20"
            />
          </div>
          
          <div className="text-center">
            <h2 className="text-xl font-semibold text-foreground">
              {profile?.full_name || 'User'}
            </h2>
            <p className="text-muted-foreground">{user.email}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          {/* Invite Button */}
          <Button
            onClick={() => setShowInviteModal(true)}
            className="w-full h-12 text-base"
            variant="default"
          >
            <UserPlus className="h-5 w-5 mr-2" />
            Invite users by email
          </Button>


          {/* Sign Out Button */}
          <Button
            onClick={handleSignOut}
            variant="destructive"
            className="w-full h-12 text-base"
          >
            Sign Out
          </Button>
        </div>
      </div>

      {/* Invite Modal */}
      <AddMemberModal 
        open={showInviteModal}
        onOpenChange={setShowInviteModal}
      />
    </div>
  );
};

export default Profile;