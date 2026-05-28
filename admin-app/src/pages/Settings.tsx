import React, { useState, useEffect } from 'react';
import { useSearchParams, Navigate } from 'react-router-dom';
import { VoteLimitSettings } from '@/components/voting/VoteLimitSettings';
import { ProfileSettings } from '@/components/settings/ProfileSettings';
import { CompanySettings } from '@/components/settings/CompanySettings';
import { OrgChartColorSettings } from '@/components/settings/OrgChartColorSettings';
import { ThemeSettings } from '@/components/settings/ThemeSettings';
import { ColorThemeSettings } from '@/components/settings/ColorThemeSettings';
import { ShortcutsSettings } from '@/components/settings/ShortcutsSettings';
import { ApiKeysSettings } from '@/components/settings/ApiKeysSettings';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { useProfile } from '@/hooks/useProfile';
import { SettingsPageSkeleton } from '@/components/settings/SettingsPageSkeleton';
import { Billing } from '@/pages/settings/Billing';
import { useCurrentUserPermissionLevel } from '@/hooks/useUserPermissionLevel';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { isMobileOrTabletDevice } from '@/utils/mobileDetection';
import { WebhookIntegrationSettings } from '@/components/settings/WebhookIntegrationSettings';
import WorkspaceSettings from '@/components/settings/WorkspaceSettings';
import IntegrationsSettings from '@/components/settings/IntegrationsSettings';
import SecuritySettings from '@/components/settings/SecuritySettings';
import { cn } from '@/lib/utils';

type NavItem = { key: string; label: string };
type NavGroup = { label: string; adminOnly?: boolean; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Account",
    items: [
      { key: "general", label: "General" },
      { key: "notifications", label: "Notifications" },
      { key: "security", label: "Security" },
      { key: "appearance", label: "Appearance" },
      { key: "shortcuts", label: "Shortcuts" },
    ],
  },
  {
    label: "Workspace",
    items: [
      { key: "workspace", label: "Workspace" },
      { key: "integrations", label: "Integrations" },
      { key: "api", label: "API Keys" },
    ],
  },
  {
    label: "Admin",
    adminOnly: true,
    items: [
      { key: "company", label: "Company" },
      { key: "billing", label: "Billing" },
    ],
  },
];

const VALID_TABS = ['general', 'appearance', 'shortcuts', 'notifications', 'workspace', 'integrations', 'api', 'company', 'billing', 'security'];

export default function Settings() {
  const [searchParams] = useSearchParams();
  const [, setSearchParams] = useSearchParams();

  const isMobileApp = isMobileOrTabletDevice();
  const isMobile = isMobileOrTabletDevice();
  const [showVersionBanner, setShowVersionBanner] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const { user } = useAuth();
  const {
    companies,
    loading: companiesLoading
  } = useMultiCompanyAccess();
  const {
    loading: profileLoading
  } = useProfile();
  const {
    hasDirectorAccess,
    isSuperAdmin
  } = useCurrentUserPermissionLevel();
  const {
    subscription,
    loading: subscriptionLoading
  } = useSubscription();

  const canAccessBilling = (hasDirectorAccess || isSuperAdmin) && !isMobileApp;

  useEffect(() => {
    const checkVersion = async () => {
      const { data } = await supabase
        .from('system_settings')
        .select('system_version')
        .eq('setting_key', 'app_version')
        .single();

      if (data?.system_version && data.system_version !== "1.2") {
        setShowVersionBanner(true);
      }
    };
    checkVersion();
  }, []);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && VALID_TABS.includes(tabParam)) {
      if ((tabParam === 'billing' || tabParam === 'company' || tabParam === 'api') && !canAccessBilling) {
        setActiveTab('general');
      } else {
        setActiveTab(tabParam);
      }
    } else {
      setActiveTab('general');
    }
  }, [searchParams, canAccessBilling]);

  if (isMobileOrTabletDevice()) {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'billing' || tabParam === 'company') {
      return <Navigate to="/m/settings" replace />;
    }
  }

  const handleSectionChange = (key: string) => {
    setActiveTab(key);
    setSearchParams({ tab: key });
  };

  if (profileLoading || companiesLoading || subscriptionLoading) {
    return <SettingsPageSkeleton variant={isMobile ? 'mobile' : 'desktop'} showVoting={companies.length > 0} className="animate-fade-in" />;
  }

  const isAdminTab = (key: string) => ['company', 'billing', 'api'].includes(key);

  return (
    <div className="min-h-screen bg-background">
      {showVersionBanner && (
        <div className="fixed top-4 right-4 z-50 bg-card border border-border rounded-[6px] shadow-sm p-4 max-w-sm animate-in slide-in-from-top-2">
          <div className="flex items-start gap-3">
            <RefreshCw className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <p className="text-[13px] font-medium text-foreground">New version available</p>
              <p className="text-[11px] text-muted-foreground">Please refresh to get the latest updates.</p>
              <Button onClick={() => window.location.reload()} size="sm" className="w-full">
                Refresh Now
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="px-6 py-6">
        <div className="mb-6">
          <h1 className="text-[20px] font-semibold text-foreground tracking-tight">Settings</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Manage your account preferences and application settings
          </p>
          {!subscription.subscribed && !isMobileApp && (
            <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-[6px]">
              <p className="text-sm text-destructive font-medium">Subscription Required: Please update the company subscription to access company features.</p>
            </div>
          )}
        </div>

        <div className="flex gap-8">
          {/* Left sidebar nav */}
          <nav className="w-52 shrink-0 space-y-5">
            {NAV_GROUPS.map((group) => {
              if (group.adminOnly && !canAccessBilling) return null;
              const visibleItems = group.items.filter(
                (item) => !(isAdminTab(item.key) && !canAccessBilling)
              );
              if (visibleItems.length === 0) return null;
              return (
                <div key={group.label}>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1.5 px-3">
                    {group.label}
                  </p>
                  <div className="space-y-0.5">
                    {visibleItems.map((item) => (
                      <button
                        key={item.key}
                        onClick={() => handleSectionChange(item.key)}
                        className={cn(
                          "w-full text-left px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors",
                          activeTab === item.key
                            ? "bg-muted text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </nav>

          {/* Right content area */}
          <div className="flex-1 min-w-0">
            {activeTab === 'general' && (
              <div className="space-y-8">
                <ProfileSettings />
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-8">
                <ThemeSettings />
                <ColorThemeSettings />
              </div>
            )}

            {activeTab === 'shortcuts' && <ShortcutsSettings />}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <WebhookIntegrationSettings />
              </div>
            )}

            {activeTab === 'workspace' && <WorkspaceSettings />}

            {activeTab === 'integrations' && <IntegrationsSettings />}

            {activeTab === 'api' && canAccessBilling && <ApiKeysSettings />}

            {activeTab === 'company' && canAccessBilling && (
              <div className="space-y-8">
                <CompanySettings />
                {companies.length > 0 && <VoteLimitSettings />}
                <OrgChartColorSettings />
              </div>
            )}

            {activeTab === 'billing' && canAccessBilling && <Billing />}

            {activeTab === 'security' && <SecuritySettings />}
          </div>
        </div>
      </div>
    </div>
  );
}
