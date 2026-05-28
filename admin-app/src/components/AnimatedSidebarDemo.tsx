"use client";
import React, { useState, useMemo } from "react";
import { AnimatedSidebar, SidebarBody, SidebarLink } from "@/components/ui/animated-sidebar";
import { 
  Home,
  BarChart3,
  CheckSquare, 
  Target, 
  AlertTriangle, 
  Calendar,
  FileText,
  Users, 
  GitBranch,
  Rocket,
  Wrench, 
  Bot,
  Settings,
  HelpCircle,
  MessageSquare,
  Shield,
  Building2,
  UserCircle,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useMultiCompany } from "@/contexts/MultiCompanyContext";
import { useProfile } from "@/hooks/useProfile";
import { useUserCapabilities } from "@/hooks/useUserCapabilities";
import { useStrategicPlanAccess } from "@/hooks/useStrategicPlanAccess";
import { usePendingInvitations } from "@/hooks/usePendingInvitations";
import { useCurrentUserRoles } from "@/hooks/useUserRoles";

export function AnimatedSidebarDemo() {
  const { user } = useAuth();
  const { currentCompany } = useMultiCompany();
  const location = useLocation();
  const { profile } = useProfile();
  const { hasCapability } = useUserCapabilities();
  const { shouldShowStrategyPage } = useStrategicPlanAccess();
  const { invitations } = usePendingInvitations();
  const { isSuperAdminAssistant } = useCurrentUserRoles();
  
  // Permission checks
  const canAccessTools = hasCapability('access_analytics') || hasCapability('manage_all_teams') || hasCapability('access_admin_panel');
  const canAccessSuperAdmin = hasCapability('access_admin_panel') || isSuperAdminAssistant;
  const hasInvitations = invitations.length > 0;
  
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  // Main navigation items
  const executionItems = [
    { label: "Metrics", href: "/metrics", icon: <BarChart3 className="text-sidebar-muted h-4 w-4 flex-shrink-0" /> }
  ];
  
  const mainItems = [
    { label: "Dashboard", href: "/dashboard", icon: <Home className="text-sidebar-muted h-4 w-4 flex-shrink-0" /> },
    { label: "Tasks", href: "/tasks", icon: <CheckSquare className="text-sidebar-muted h-4 w-4 flex-shrink-0" /> },
    { label: "Goals", href: "/goals", icon: <Target className="text-sidebar-muted h-4 w-4 flex-shrink-0" /> },
    { label: "Issues", href: "/issues", icon: <AlertTriangle className="text-sidebar-muted h-4 w-4 flex-shrink-0" /> },
    { label: "Meetings", href: "/meetings", icon: <Calendar className="text-sidebar-muted h-4 w-4 flex-shrink-0" /> }
  ];
  
  const strategyItems = [
    { label: "People", href: "/people", icon: <Users className="text-sidebar-muted h-4 w-4 flex-shrink-0" /> }
  ];
  
  const strategyItemsAfter = useMemo(() => [
    { label: "Org Chart", href: "/org-chart", icon: <GitBranch className="text-sidebar-muted h-4 w-4 flex-shrink-0" /> },
    ...(shouldShowStrategyPage ? [{ label: "Strategy", href: "/strategy", icon: <Rocket className="text-sidebar-muted h-4 w-4 flex-shrink-0" /> }] : []),
    ...(canAccessTools ? [{ label: "Tools", href: "/tools", icon: <Wrench className="text-sidebar-muted h-4 w-4 flex-shrink-0" /> }] : [])
  ], [shouldShowStrategyPage, canAccessTools]);
  
  // Custom Zentrix Icon component
  const ZentrixIcon = () => (
    <div className="h-4 w-4 flex items-center justify-center flex-shrink-0">
      <svg viewBox="0 0 20 20" className="w-full h-full text-sidebar-muted">
        <path 
          d="M4 5h12l-10 8h10" 
          stroke="currentColor" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </div>
  );
  
  // Workspace items
  const workspaceItems = [
    { label: "SOPs", href: "/sops", icon: <FileText className="text-sidebar-muted h-4 w-4 flex-shrink-0" /> },
    {
      label: "Zentrix Insights",
      href: "https://zentrixinsights.com/",
      icon: <ZentrixIcon />,
      external: true
    },
    {
      label: "Help", 
      href: "mailto:matheus@zentrixventures.com?cc=marcio@wisevas.io,rodri.depaula@gmail.com&subject=ZentrixOS Support Request", 
      icon: <HelpCircle className="text-sidebar-muted h-4 w-4 flex-shrink-0" />,
      external: true
    },
    { 
      label: "Product Feedback", 
      href: "https://forms.clickup.com/90131958189/f/2ky4h2dd-933/IGX4MK35RB0DH551FH", 
      icon: <MessageSquare className="text-sidebar-muted h-4 w-4 flex-shrink-0" />,
      external: true
    }
  ];
  
  // Settings submenu items
  const settingsItems = [
    { label: "General", href: "/settings?tab=general" },
    { label: "Shortcuts", href: "/settings?tab=shortcuts" },
    { label: "Integrations", href: "/settings?tab=integrations" },
    { label: "Billing", href: "/settings?tab=billing" }
  ];
  
  // Check if current route is in settings
  const isSettingsActive = location.pathname.startsWith('/settings');
  
  // Settings dropdown component
  const SettingsDropdown = () => {
    return (
      <div className="space-y-1">
        {/* Main Settings button */}
        <div 
          className="flex items-center justify-between group/sidebar py-2 px-2 rounded-md transition-colors hover:bg-sidebar-hover cursor-pointer"
          onClick={() => setSettingsOpen(!settingsOpen)}
        >
          <div className="flex items-center gap-2">
            <Settings className="text-sidebar-muted h-4 w-4 flex-shrink-0" />
            {open && (
              <motion.span
                animate={{ opacity: 1 }}
                className={cn(
                  "text-sm whitespace-pre inline-block !p-0 !m-0 transition-colors",
                  isSettingsActive ? "text-sidebar-foreground font-medium" : "text-sidebar-muted-foreground group-hover/sidebar:text-sidebar-foreground"
                )}
              >
                Settings
              </motion.span>
            )}
          </div>
          {open && (
            <motion.div
              animate={{ rotate: settingsOpen ? 90 : 0 }}
              transition={{ duration: 0.2 }}
              className="flex-shrink-0"
            >
              <ChevronRight className="h-4 w-4 text-sidebar-muted-foreground" />
            </motion.div>
          )}
        </div>
        
        {/* Submenu items */}
        {settingsOpen && open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-1 ml-7"
          >
            {settingsItems.map((item, idx) => {
              const isActive = location.pathname === '/settings' && 
                (location.search.includes(`tab=${item.label.toLowerCase()}`) || 
                 (item.label === 'General' && !location.search.includes('tab=')));
              
              return (
                <NavLink
                  key={idx}
                  to={item.href}
                  className={cn(
                    "flex items-center py-1.5 px-2 rounded-md text-sm transition-colors",
                    isActive 
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-hover"
                  )}
                >
                  {item.label}
                </NavLink>
              );
            })}
          </motion.div>
        )}
      </div>
    );
  };
  
  return (
    <div className="flex h-screen bg-background w-full">
      <AnimatedSidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-10">
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            {/* Logo */}
            <div className="mb-8">
              {open ? <Logo /> : <LogoIcon />}
            </div>
            
            {/* Main Navigation */}
            <div className="flex flex-col gap-1">
              {/* EXECUTION Section */}
              {open && (
                <div className="px-2 py-2 text-xs font-medium text-sidebar-muted-foreground uppercase tracking-wider">
                  EXECUTION
                </div>
              )}
              {executionItems.map((link, idx) => (
                <SidebarLink key={idx} link={link} />
              ))}
              
              {/* Main items without section header */}
              {mainItems.map((link, idx) => (
                <SidebarLink key={`main-${idx}`} link={link} />
              ))}
              
              {/* STRATEGY Section */}
              {open && (
                <div className="px-2 py-2 text-xs font-medium text-sidebar-muted-foreground uppercase tracking-wider mt-4">
                  STRATEGY
                </div>
              )}
              {strategyItems.map((link, idx) => (
                <SidebarLink key={`strategy-${idx}`} link={link} />
              ))}
              
              {/* Process - Grayed out */}
              <div className="flex items-center justify-start gap-2 group/sidebar py-2 px-2 rounded-md opacity-40 cursor-not-allowed">
                <FileText className="text-sidebar-muted h-4 w-4 flex-shrink-0" />
                {open && (
                  <motion.span
                    animate={{ opacity: 1 }}
                    className="text-sm text-sidebar-muted-foreground whitespace-pre inline-block !p-0 !m-0"
                  >
                    Process
                  </motion.span>
                )}
              </div>
              
              {/* Strategy items after Process */}
              {strategyItemsAfter.map((link, idx) => (
                <SidebarLink key={`strategy-after-${idx}`} link={link} />
              ))}
              
              {/* AI Thought Partner - Grayed out */}
              <div className="flex items-center justify-start gap-2 group/sidebar py-2 px-2 rounded-md opacity-40 cursor-not-allowed mb-2">
                <Bot className="text-sidebar-muted h-4 w-4 flex-shrink-0" />
                {open && (
                  <motion.span
                    animate={{ opacity: 1 }}
                    className="text-sm text-sidebar-muted-foreground whitespace-pre inline-block !p-0 !m-0"
                  >
                    AI Thought Partner
                  </motion.span>
                )}
              </div>
              
              {/* WORKSPACE Section */}
              {open && (
                <div className="px-2 py-2 text-xs font-medium text-sidebar-muted-foreground uppercase tracking-wider mt-2">
                  WORKSPACE
                </div>
              )}
              
              {/* Analytics - Grayed out for some users */}
              {canAccessTools && (
                <div className="flex items-center justify-start gap-2 group/sidebar py-2 px-2 rounded-md opacity-40 cursor-not-allowed">
                  <BarChart3 className="text-sidebar-muted h-4 w-4 flex-shrink-0" />
                  {open && (
                    <motion.span
                      animate={{ opacity: 1 }}
                      className="text-sm text-sidebar-muted-foreground whitespace-pre inline-block !p-0 !m-0"
                    >
                      Analytics
                    </motion.span>
                  )}
                </div>
              )}
              
              {/* Settings dropdown */}
              <SettingsDropdown />
              
              {/* Workspace items */}
              {workspaceItems.map((link, idx) => (
                <WorkspaceLink key={`workspace-${idx}`} link={link} open={open} />
              ))}
              
              {/* Super Admin */}
              {canAccessSuperAdmin && (
                <div className="flex items-center justify-start gap-2 group/sidebar py-2 px-2 rounded-md transition-colors hover:bg-sidebar-hover">
                  <Shield className="h-4 w-4 flex-shrink-0 text-destructive" />
                  {open && (
                    <motion.span
                      animate={{ opacity: 1 }}
                      className="text-sm text-sidebar-foreground whitespace-pre inline-block !p-0 !m-0"
                    >
                      Super Admin
                    </motion.span>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Footer */}
          <div className="border-t border-sidebar-border pt-4">
            <SidebarLink
              link={{
                label: user?.email || "User",
                href: "/profile",
                icon: (
                  <div className="h-7 w-7 flex-shrink-0 rounded-full bg-primary flex items-center justify-center">
                    <UserCircle className="h-4 w-4 text-primary-foreground" />
                  </div>
                ),
              }}
            />
            {open && (
              <motion.div
                animate={{ opacity: 1 }}
                className="mt-2 px-2 text-xs text-sidebar-muted-foreground"
              >
                Version 1.0.0
              </motion.div>
            )}
          </div>
        </SidebarBody>
      </AnimatedSidebar>
      
      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <div className="h-full p-2 md:p-10 rounded-tl-2xl border border-border bg-background flex flex-col gap-2 w-full">
          <div className="flex gap-2">
            {[...new Array(4)].map((i) => (
              <div
                key={"first-array" + i}
                className="h-20 w-full rounded-lg bg-muted animate-pulse"
              ></div>
            ))}
          </div>
          <div className="flex gap-2 flex-1">
            {[...new Array(2)].map((i) => (
              <div
                key={"second-array" + i}
                className="h-full w-full rounded-lg bg-muted animate-pulse"
              ></div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

// Custom workspace link component for external links
const WorkspaceLink = ({ link, open }: { link: any; open: boolean }) => {
  if (link.external) {
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-start gap-2 group/sidebar py-2 px-2 rounded-md transition-colors hover:bg-sidebar-hover text-sidebar-muted-foreground hover:text-sidebar-foreground"
      >
        {link.icon}
        {open && (
          <motion.span
            animate={{ opacity: 1 }}
            className="text-sm group-hover/sidebar:translate-x-1 transition duration-150 whitespace-pre inline-block !p-0 !m-0"
          >
            {link.label}
          </motion.span>
        )}
      </a>
    );
  }
  
  return <SidebarLink link={link} />;
};

export const Logo = () => {
  const { currentCompany } = useMultiCompany();
  
  return (
    <NavLink
      to="/"
      className="font-normal flex space-x-2 items-center text-sm py-1 relative z-20"
    >
      <div className="h-5 w-6 bg-primary rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm flex-shrink-0" />
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-medium text-sidebar-foreground whitespace-pre"
      >
        {currentCompany?.name || "Your Company"}
      </motion.span>
    </NavLink>
  );
};

export const LogoIcon = () => {
  return (
    <NavLink
      to="/"
      className="font-normal flex space-x-2 items-center text-sm py-1 relative z-20"
    >
      <div className="h-5 w-6 bg-primary rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm flex-shrink-0" />
    </NavLink>
  );
};