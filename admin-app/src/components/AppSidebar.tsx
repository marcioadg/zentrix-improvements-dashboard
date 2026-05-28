import { useState, memo, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  CheckSquare, 
  Target, 
  AlertTriangle, 
  BarChart3, 
  Calendar, 
  Users, 
  FileText, // Changed from BookOpen to FileText
  Settings, 
  Building2,
  Bot,
  Wrench, 
  Share2,
  Shield,
  Database,
  LayoutDashboard,
  TestTube2,
  Timer,
  
  Home,
  HelpCircle,
  MessageCircle,
  MessageSquare,
  GitBranch,
  Rocket,
  ChevronDown,
  ChevronRight,
  Brain,
  GraduationCap,
  HeartPulse
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProfile } from '@/hooks/useProfile';
import { useUserCapabilities } from '@/hooks/useUserCapabilities';
import { useCurrentUserPermissionLevel } from '@/hooks/useUserPermissionLevel';
import { useStrategicPlanAccess } from '@/hooks/useStrategicPlanAccess';
import { StrategicPlanErrorBoundary } from '@/components/errors/StrategicPlanErrorBoundary';
import { StrategicPlanMenuButton } from '@/components/sidebar/StrategicPlanMenuButton';
import { CompanyHeader } from '@/components/CompanyHeader';
import UserProfile from '@/components/UserProfile'; // Fixed: Use default import
import { VersionDisplay } from '@/components/VersionDisplay';
import { SidebarErrorBoundary } from '@/components/sidebar/SidebarErrorBoundary';
import { AppSwitcher } from '@/components/AppSwitcher';
import { SidebarDebugger } from '@/components/sidebar/SidebarDebugger';
import { usePendingInvitations } from '@/hooks/usePendingInvitations';
import { useInvitationModal } from '@/hooks/useInvitationModal';
import { InvitationModal } from '@/components/invitations/InvitationModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { Badge } from '@/components/ui/badge';
import { SupportChatWidget } from '@/components/support/SupportChatWidget';
import { useSupportUnread } from '@/hooks/useSupportUnread';
import { useAdminSupportUnread } from '@/hooks/useAdminSupportUnread';

import { 
  Sidebar, 
  SidebarContent, 
  SidebarHeader, 
  SidebarFooter,
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupContent 
} from '@/components/ui/sidebar';

const navigation = [
  { name: 'Dashboard', tKey: 'nav.dashboard', href: '/dashboard', icon: Home },
  { name: 'Metrics', tKey: 'nav.metrics', href: '/metrics', icon: BarChart3 },
  { name: 'Tasks', tKey: 'nav.tasks', href: '/tasks', icon: CheckSquare },
  { name: 'Goals', tKey: 'nav.goals', href: '/goals', icon: Target },
  { name: 'Issues', tKey: 'nav.issues', href: '/issues', icon: AlertTriangle },
  { name: 'Meetings', tKey: 'nav.meetings', href: '/meetings', icon: Calendar },
  { name: 'People', tKey: 'nav.people', href: '/people', icon: Users },
  { name: 'Org Chart', tKey: 'nav.orgChart', href: '/org-chart', icon: GitBranch },
  { name: 'Org Health', tKey: 'nav.orgHealth', href: '/health', icon: HeartPulse },
  { name: 'Strategy', tKey: 'nav.strategy', href: '/strategy', icon: Rocket },
  { name: 'Zentrix AI', tKey: 'nav.zentrixAI', href: '/zentrixai', icon: Bot },
  { name: 'Academy', tKey: 'nav.academy', href: '/academy', icon: GraduationCap },
];

export const AppSidebar = memo(() => {
  const location = useLocation();
  const { profile } = useProfile();
  const { invitations } = usePendingInvitations();
  const { isOpen, openModal, setIsOpen } = useInvitationModal();
  const { hasCapability, permissionLevel } = useUserCapabilities();
  const { hasDirectorAccess, isSuperAdmin } = useCurrentUserPermissionLevel();
  const { t } = useTranslation('navigation');
  
  // Use proper permission checking instead of profile.role
  const canAccessTools = hasCapability('access_analytics') || hasCapability('manage_all_teams') || hasCapability('access_admin_panel');
  const canAccessManagement = hasCapability('manage_users') || hasCapability('access_admin_panel');
  const canAccessSuperAdmin = hasCapability('access_admin_panel');
  const hasInvitations = invitations.length > 0;
  const [chatOpen, setChatOpen] = useState(false);
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const supportUnread = useSupportUnread();
  const adminSupportUnread = useAdminSupportUnread(canAccessSuperAdmin);

  return (
    <SidebarErrorBoundary>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <CompanyHeader />
            </div>
            <AppSwitcher />
          </div>
        </SidebarHeader>
        
        <SidebarContent className="py-1">
          <SidebarGroup className="py-0.5">
            <SidebarGroupContent>
              <SidebarMenu className="gap-0">
                {navigation.map((item) => {
                  // 🎯 PHASE 2: Stable keys and reduced conditional returns
                  const stableKey = `nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`;
                  
                  // Remove AI Thought Partner and Academy from main nav (we'll add them separately)  
                  if (item.name === "AI Thought Partner") return null;
                  if (item.name === "Academy") return null;
                  
                  // Split navigation - EXECUTION section (Metrics) and STRATEGY section (People)
                  if (item.name === "Metrics") {
                    return (
                      <div key={`execution-${stableKey}`}>
                        <div className="px-2 pt-2 pb-0.5 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-[0.08em]">
                          {t('sections.execution')}
                        </div>
                        <SidebarMenuItem>
                          <SidebarMenuButton 
                            asChild 
                            isActive={location.pathname === item.href}
                            size="default"
                            className={cn(
                              "group relative overflow-hidden h-7 text-[13px] font-medium transition-colors duration-150 px-2 py-1 gap-2 rounded-[4px]",
                              location.pathname === item.href
                                ? "bg-state-active text-foreground font-medium"
                                : "text-muted-foreground hover:text-foreground hover:bg-state-hover"
                            )}
                          >
                            <Link to={item.href} data-tour={`nav-${item.name.toLowerCase()}`} className="flex items-center gap-2">
                              <item.icon className="h-4 w-4 stroke-[1.5] transition-colors duration-150" />
                              <span>{t(item.tKey)}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      </div>
                    );
                  }

                  if (item.name === "People") {
                    return (
                      <div key={`strategy-${stableKey}`}>
                        <div className="px-2 pt-3 pb-0.5 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-[0.08em]">
                          {t('sections.strategy')}
                        </div>
                        <SidebarMenuItem>
                          <SidebarMenuButton
                            asChild
                            isActive={location.pathname === item.href}
                            size="default"
                            className={cn(
                              "group relative overflow-hidden h-7 text-[13px] font-medium transition-colors duration-150 px-2 py-1 gap-2 rounded-[4px]",
                              location.pathname === item.href
                                ? "bg-state-active text-foreground font-medium"
                                : "text-muted-foreground hover:text-foreground hover:bg-state-hover"
                            )}
                          >
                            <Link to={item.href} data-tour={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`} className="flex items-center gap-2">
                              <item.icon className="h-4 w-4 stroke-[1.5] transition-colors duration-150" />
                              <span>{t(item.tKey)}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      </div>
                    );
                  }

                  const isActive = location.pathname === item.href || (item.name === "Tools" && location.pathname.startsWith('/tools'));
                  const needsSpacing = ["Dashboard"].includes(item.name);
                  
                  // 🎯 PHASE 3: Strategy item with error boundary and stable rendering
                  if (item.name === "Strategy") {
                    return (
                      <StrategicPlanErrorBoundary key={stableKey}>
                        <SidebarMenuItem className={needsSpacing ? "mb-2" : ""}>
                          <StrategicPlanMenuButton />
                        </SidebarMenuItem>
                      </StrategicPlanErrorBoundary>
                    );
                  }
                  
                  // Zentrix AI - add Zentrix Insights right after
                  if (item.name === "Zentrix AI") {
                    return (
                      <div key={stableKey}>
                        <SidebarMenuItem className={needsSpacing ? "mb-2" : ""}>
                          <SidebarMenuButton 
                            asChild 
                            isActive={isActive}
                            size="default"
                            className={cn(
                              "group relative overflow-hidden h-7 text-[13px] font-medium transition-colors duration-150 px-2 py-1 gap-2 rounded-[4px]",
                              isActive
                                ? "bg-state-active text-foreground font-medium"
                                : "text-muted-foreground hover:text-foreground hover:bg-state-hover"
                            )}
                          >
                            <Link to={item.href} data-tour={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`} className="flex items-center gap-2">
                              <item.icon className="h-4 w-4 stroke-[1.5] transition-colors duration-150" />
                              <span>{t(item.tKey)}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>


                      </div>
                    );
                  }
                  
                  return (
                    <SidebarMenuItem key={stableKey} className={needsSpacing ? "mb-2" : ""}>
                      <SidebarMenuButton 
                        asChild 
                        isActive={isActive}
                        size="default"
                        className={cn(
                          "group relative overflow-hidden h-7 text-[13px] font-medium transition-colors duration-150 px-2 py-1 gap-2 rounded-[4px]",
                          isActive
                            ? "bg-state-active text-foreground font-medium"
                            : "text-muted-foreground hover:text-foreground hover:bg-state-hover"
                        )}
                      >
                        <Link to={item.href} data-tour={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`} className="flex items-center gap-2">
                          <item.icon className={cn(
                            "h-4 w-4 stroke-[1.5] transition-colors duration-150",
                            isActive && "text-foreground"
                          )} />
                          <span>{t(item.tKey)}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>


          <SidebarGroup className="py-0.5 mt-1">
            <div className="px-2 pt-2 pb-0.5 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-[0.08em]">
              WORKSPACE
            </div>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0">
                
                {hasCapability('access_analytics') && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild
                      isActive={location.pathname.startsWith('/analytics')}
                      size="default"
                      className={cn(
                        "group relative overflow-hidden h-7 text-[13px] font-medium transition-colors duration-150 px-2 py-1 gap-2 rounded-[4px]",
                        location.pathname.startsWith('/analytics')
                          ? "bg-state-active text-foreground font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-state-hover"
                      )}
                    >
                      <Link to="/analytics" className="flex items-center gap-2">
                        <BarChart3 className={cn(
                          "h-4 w-4 stroke-[1.5] transition-colors duration-150",
                          location.pathname.startsWith('/analytics') && "text-foreground"
                        )} />
                        <span>Analytics</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                
                {/* Academy */}
                <SidebarMenuItem>
                  <SidebarMenuButton asChild
                    isActive={location.pathname === '/academy'}
                    size="default"
                    className={cn(
                      "group relative overflow-hidden h-7 text-[13px] font-medium transition-colors duration-150 px-2 py-1 gap-2 rounded-[4px]",
                      location.pathname === '/academy'
                        ? "bg-state-active text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-state-hover"
                    )}
                  >
                    <Link to="/academy" className="flex items-center gap-2">
                      <GraduationCap className={cn(
                        "h-4 w-4 stroke-[1.5] transition-colors duration-150",
                        location.pathname === '/academy' && "text-foreground"
                      )} />
                      <span>Academy</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                <SidebarMenuItem>
                  <SidebarMenuButton asChild
                    isActive={location.pathname.startsWith('/settings')}
                    size="default"
                    className={cn(
                      "group relative overflow-hidden h-7 text-[13px] font-medium transition-colors duration-150 px-2 py-1 gap-2 rounded-[4px]",
                      location.pathname.startsWith('/settings')
                        ? "bg-state-active text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-state-hover"
                    )}
                  >
                    <Link to="/settings?tab=general" className="flex items-center gap-2">
                      <Settings className={cn(
                        "h-4 w-4 stroke-[1.5] transition-colors duration-150",
                        location.pathname.startsWith('/settings') && "text-foreground"
                      )} />
                      <span>{t('nav.settings')}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild
                    size="default"
                    className="group h-7 text-[13px] font-medium transition-colors duration-150 px-2 py-1 gap-2 rounded-[4px] text-muted-foreground hover:text-foreground hover:bg-state-hover"
                  >
                    <a href="mailto:matheus@zentrixventures.com?cc=marcio@wisevas.io,rodri.depaula@gmail.com&subject=ZentrixOS Support Request">
                      <HelpCircle className="h-4 w-4 stroke-[1.5] transition-colors duration-150" />
                      <span>{t('nav.help')}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                <SidebarMenuItem>
                  <button
                    onClick={() => setSupportModalOpen(true)}
                    className="group flex items-center gap-2 w-full h-7 text-[13px] font-medium transition-colors duration-150 px-2 py-1 rounded-[4px] text-muted-foreground hover:text-foreground hover:bg-state-hover"
                  >
                    <MessageCircle className="h-4 w-4 flex-shrink-0 stroke-[1.5]" />
                    <span>Support</span>
                    {supportUnread > 0 && (
                      <span className="ml-auto h-2 w-2 rounded-full bg-destructive animate-pulse" />
                    )}
                  </button>
                </SidebarMenuItem>

                
                {/* Admin Panel */}
                {canAccessSuperAdmin && (
                  <SidebarMenuItem>
                    <Link
                      to="/admin"
                      className={cn(
                        "group flex items-center gap-2 h-7 text-[13px] font-medium transition-colors duration-150 px-2 py-1 rounded-[4px]",
                        "text-muted-foreground hover:text-foreground hover:bg-state-hover",
                        location.pathname === '/admin' && "bg-state-active text-foreground"
                      )}
                    >
                      <LayoutDashboard className={cn(
                        "h-4 w-4 stroke-[1.5] transition-colors duration-150",
                        location.pathname === '/admin' && "text-foreground"
                      )} />
                      <span>Admin Panel</span>
                    </Link>
                  </SidebarMenuItem>
                )}

                {/* Super Admin - navigate directly to company management */}
                {canAccessSuperAdmin && (
                  <SidebarMenuItem>
                    <Link
                      to="/company-management"
                      className={cn(
                        "group flex items-center gap-2 h-7 text-[13px] font-medium transition-colors duration-150 px-2 py-1 rounded-[4px]",
                        "text-muted-foreground hover:text-foreground hover:bg-state-hover",
                        location.pathname === '/company-management' && "bg-state-active text-foreground"
                      )}
                    >
                      <Shield className={cn(
                        "h-4 w-4 stroke-[1.5] transition-colors duration-150",
                        location.pathname === '/company-management' && "text-foreground"
                      )} />
                      <span>{t('nav.superAdmin')}</span>
                      {adminSupportUnread && (
                        <span className="relative z-10 ml-auto h-2 w-2 rounded-full bg-destructive animate-pulse" />
                      )}
                    </Link>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="py-1.5 px-2">
          <UserProfile />
        </SidebarFooter>
      </Sidebar>
      
      {/* Debug sidebar state in development */}
      <SidebarDebugger />
      <SupportChatWidget open={chatOpen} onClose={() => setChatOpen(false)} unreadHook={supportUnread} />

      {/* Support Options Modal */}
      <Dialog open={supportModalOpen} onOpenChange={setSupportModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[16px]">Get Support</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => {
                setSupportModalOpen(false);
                window.open('https://wa.me/5541988852536?text=Hey%2C%20I%20have%20an%20account%20at%20Zentrix%20OS%20and%20I%20need%20some%20support.%20Can%20you%20help%3F', '_blank');
              }}
              className="flex flex-col items-center gap-3 rounded-[6px] border border-border bg-card p-5 hover:border-primary/40 hover:bg-muted/40 transition-colors"
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--btn-bg, var(--primary))' }}>
                <MessageCircle className="h-5 w-5 text-white" />
              </div>
              <div className="text-center">
                <div className="text-[13px] font-medium text-foreground">WhatsApp</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">Message us directly</div>
              </div>
            </button>
            <button
              onClick={() => {
                setSupportModalOpen(false);
                setChatOpen(true);
              }}
              className="flex flex-col items-center gap-3 rounded-[6px] border border-border bg-card p-5 hover:border-primary/40 hover:bg-muted/40 transition-colors"
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--btn-bg, var(--primary))' }}>
                <MessageSquare className="h-5 w-5 text-white" />
              </div>
              <div className="text-center">
                <div className="text-[13px] font-medium text-foreground">Live Chat</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">Chat in-app</div>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </SidebarErrorBoundary>
  );
});

AppSidebar.displayName = 'AppSidebar';
