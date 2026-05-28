import React, { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { getPreviousRoute, getSafeFallbackRoute } from '@/components/navigation/RouteHistoryTracker';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { 
  ListChecks, 
  Share2, 
  Target, 
  Megaphone, 
  DollarSign, 
  Heart, 
  TrendingUp,
  ArrowLeft,
  Home
} from 'lucide-react';

interface ToolItem {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  category: 'personal' | 'business' | 'health';
  comingSoon?: boolean;
}

const tools: ToolItem[] = [
  { id: 'delegate-elevate', title: 'Delegate & Elevate', icon: ListChecks, category: 'personal' },
  { id: 'replacement-ladder', title: 'Replacement Ladder', icon: TrendingUp, category: 'personal' },
  { id: 'clarity-break', title: 'Clarity Break', icon: Share2, category: 'personal' },
  { id: 'deep-strategy', title: 'Deep Strategy', icon: Target, category: 'business' },
  { id: 'marketing-strategy', title: 'Marketing Strategy', icon: Megaphone, category: 'business' },
  { id: 'the-offer', title: 'The Offer', icon: DollarSign, category: 'business' },
  { id: 'eos-life', title: 'EOS Life', icon: Heart, category: 'health' },
];

const categories = {
  personal: 'Personal Development',
  business: 'Business Strategy',
  health: 'Health & Fulfillment'
};

interface ToolsSidebarProps {
  activeTool?: string;
  onToolSelect?: (toolId: string) => void;
}

export const ToolsSidebar: React.FC<ToolsSidebarProps> = ({ 
  activeTool = 'delegate-elevate', 
  onToolSelect 
}) => {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const [selectedTool, setSelectedTool] = useState(activeTool);
  const navigate = useNavigate();

  const handleToolSelect = (toolId: string, comingSoon?: boolean) => {
    if (comingSoon) return; // Don't allow selection of coming soon tools
    setSelectedTool(toolId);
    onToolSelect?.(toolId);
  };

  const handleBackToApp = (e: React.MouseEvent) => {
    e.preventDefault();
    const previousRoute = getPreviousRoute();
    const fallbackRoute = getSafeFallbackRoute();
    navigate(previousRoute || fallbackRoute);
  };

  const isActive = (toolId: string) => selectedTool === toolId;

  const getNavClassNames = (tool: ToolItem) => {
    if (tool.comingSoon) {
      return "text-sidebar-muted-foreground/50 cursor-not-allowed";
    }
    return isActive(tool.id) 
      ? "bg-sidebar-active text-sidebar-foreground font-medium" 
      : "text-sidebar-muted-foreground hover:bg-sidebar-hover hover:text-sidebar-foreground";
  };

  const groupedTools = Object.entries(categories).map(([categoryKey, categoryLabel]) => ({
    key: categoryKey,
    label: categoryLabel,
    tools: tools.filter(tool => tool.category === categoryKey)
  }));

  return (
    <Sidebar 
      className={`border-r border-sidebar-border ${collapsed ? "w-14" : "w-60"}`}
      collapsible="icon"
    >
      <SidebarHeader className="pb-3">
        <button 
          onClick={handleBackToApp}
          className="flex items-center gap-3 px-3 py-2 text-sidebar-foreground hover:bg-sidebar-hover rounded-md transition-colors duration-150 w-full text-left"
        >
          <ArrowLeft className="h-4 w-4 flex-shrink-0" />
          {!collapsed && (
            <span className="text-sm font-medium">Back to App</span>
          )}
        </button>
      </SidebarHeader>
      <SidebarContent className="bg-sidebar-background">
        {groupedTools.map(({ key, label, tools: categoryTools }) => (
          <SidebarGroup key={key}>
            {!collapsed && (
              <SidebarGroupLabel className="text-xs font-medium text-sidebar-text-light uppercase tracking-wider px-3 py-2">
                {label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {categoryTools.map((tool) => (
                  <SidebarMenuItem key={tool.id}>
                    <SidebarMenuButton 
                      onClick={() => handleToolSelect(tool.id, tool.comingSoon)}
                      className={`${getNavClassNames(tool)} h-9 px-3 transition-colors duration-150 ${tool.comingSoon ? 'pointer-events-none' : ''}`}
                      disabled={tool.comingSoon}
                    >
                      <tool.icon className={`h-4 w-4 flex-shrink-0 ${tool.comingSoon ? 'opacity-50' : ''}`} />
                      {!collapsed && (
                        <div className="flex items-center justify-between flex-1">
                          <span className={`text-sm font-normal truncate ${tool.comingSoon ? 'opacity-50' : ''}`}>
                            {tool.title}
                          </span>
                          {tool.comingSoon && (
                            <span className="text-xs text-sidebar-muted-foreground/60 bg-sidebar-muted/20 px-1.5 py-0.5 rounded-sm ml-2">
                              Soon
                            </span>
                          )}
                        </div>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
};