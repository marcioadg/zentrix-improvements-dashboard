
import React, { memo, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/UserAvatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { LogOut, Mail, Building, Calendar, Camera } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AvatarEditModal } from '@/components/modals/AvatarEditModal';

const UserProfile: React.FC = memo(() => {
  const { user, signOut } = useAuth();
  const { currentCompany } = useMultiCompany();
  const { profile } = useProfile();
  const { toast } = useToast();
  const [isAvatarEditOpen, setIsAvatarEditOpen] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  // Memoize the sign out handler to prevent unnecessary re-renders
  const handleSignOut = useMemo(() => async () => {
    try {
      await signOut();
      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  }, [signOut, toast]);

  if (!user) return null;

  return (
    <>
      <div className="p-2 border-t border-sidebar-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
              <PopoverTrigger asChild>
                <div className="cursor-pointer">
                  <UserAvatar
                    userId={user.id}
                    fullName={profile?.full_name}
                    email={user.email}
                    avatarUrl={profile?.avatar_url}
                    size="md"
                  />
                </div>
              </PopoverTrigger>
            <PopoverContent className="w-80" side="top" align="start">
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div 
                    className="relative cursor-pointer group"
                    onClick={() => setIsAvatarEditOpen(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setIsAvatarEditOpen(true);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label="Edit profile picture"
                  >
                    <UserAvatar
                      userId={user.id}
                      fullName={profile?.full_name}
                      email={user.email}
                      avatarUrl={profile?.avatar_url}
                      size="lg"
                    />
                  {/* Edit Icon Overlay */}
                  <div className="absolute -bottom-0.5 -right-0.5 bg-background/90 text-muted-foreground rounded-full p-1 shadow-sm border border-border/50">
                    <Camera className="h-2.5 w-2.5" />
                  </div>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold">{profile?.full_name || 'No name set'}</h4>
                    <p className="text-xs text-muted-foreground">Profile</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-xs">
                    <Mail className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">{user.email}</span>
                  </div>
                  {currentCompany && (
                    <div className="flex items-center space-x-2 text-xs">
                      <Building className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">{currentCompany?.name}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-2 text-xs">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Joined {new Date(profile?.created_at || user.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          {profile?.full_name && (
            <div className="text-[13px] font-medium text-foreground truncate max-w-24">
              {profile.full_name.split(' ')[0]}
            </div>
          )}
        </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="text-muted-foreground hover:text-foreground h-7 w-7 p-0 ml-auto"
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <AvatarEditModal
        open={isAvatarEditOpen}
        onOpenChange={setIsAvatarEditOpen}
      />
    </>
  );
});

export default UserProfile;
