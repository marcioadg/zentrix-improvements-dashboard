/**
 * MobileSettings - Mobile-only Settings page (/m/settings)
 *
 * Composition:
 *  - Profile card (tap to edit name/avatar)
 *  - Workspace section (company, members)
 *  - Sign Out
 *  - Delete Account (mobile-only dialog)
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  LogOut,
  Trash2,
  Users,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { useCurrentUserPermissionLevel } from '@/hooks/useUserPermissionLevel';
import { MobilePageHeader } from '@/components/mobile/MobilePageHeader';
import MobileBottomNav from '@/components/MobileBottomNav';
import { MobileDeleteAccountDialog } from '@/components/mobile/modals';
import {
  MobileSettingsRow,
  MobileSettingsSection,
} from '@/components/mobile/settings/MobileSettingsRow';
import { MobileProfileCard } from '@/components/mobile/settings/MobileProfileCard';
import { MobileEditProfileSheet } from '@/components/mobile/settings/MobileEditProfileSheet';
import { logger } from '@/utils/logger';

const PERMISSION_LABEL: Record<string, string> = {
  super_admin: 'Owner',
  director: 'Director',
  manager: 'Manager',
  team_member: 'Member',
};

const MobileSettings: React.FC = () => {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { profile } = useProfile();
  const { currentCompany } = useMultiCompany();
  const { permissionLevel } = useCurrentUserPermissionLevel();

  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      logger.error('Error signing out:', error);
    }
  };

  const email = user?.email || profile?.email || '';
  const fullName = profile?.full_name || '';
  const avatarUrl = profile?.avatar_url || null;
  const roleLabel = permissionLevel
    ? PERMISSION_LABEL[permissionLevel] ?? permissionLevel
    : undefined;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MobilePageHeader
        title="Settings"
        sticky
        showSearch={false}
        showBackButton
      />

      <main className="flex-1 px-4 pb-24 pt-2">
        <div className="mb-6">
          <MobileProfileCard
            fullName={fullName}
            email={email}
            avatarUrl={avatarUrl}
            roleLabel={roleLabel}
            onClick={() => setShowEditProfile(true)}
          />
        </div>

        <MobileSettingsSection title="Workspace">
          <MobileSettingsRow
            icon={Building2}
            label={currentCompany?.name || 'Workspace'}
            sublabel={currentCompany?.slug ? `@${currentCompany.slug}` : undefined}
            hideChevron
          />
          <MobileSettingsRow
            icon={Users}
            label="Members"
            sublabel="View teams and people"
            onClick={() => navigate('/m/company')}
          />
        </MobileSettingsSection>

        <MobileSettingsSection title="Account">
          <MobileSettingsRow
            icon={LogOut}
            iconTone="destructive"
            label="Sign out"
            destructive
            onClick={handleSignOut}
          />
        </MobileSettingsSection>

        <div className="mt-auto">
          <MobileSettingsSection>
            <MobileSettingsRow
              icon={Trash2}
              iconTone="destructive"
              label="Delete account"
              sublabel="This action can't be undone"
              destructive
              onClick={() => setShowDeleteDialog(true)}
            />
          </MobileSettingsSection>
        </div>
      </main>

      <MobileEditProfileSheet
        open={showEditProfile}
        onOpenChange={setShowEditProfile}
        initialFullName={fullName}
        email={email}
        avatarUrl={avatarUrl}
      />

      <MobileDeleteAccountDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        userEmail={email}
      />

      <MobileBottomNav />
    </div>
  );
};

export default MobileSettings;
