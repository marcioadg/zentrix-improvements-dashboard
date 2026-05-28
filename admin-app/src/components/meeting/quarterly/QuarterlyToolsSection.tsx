
import React, { useState } from "react";
import { BarChart3, Users, ListChecks, Share2, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConsolidatedMetricsPageContent } from "@/components/dashboard/ConsolidatedMetricsPageContent";
import { OrgChartBuilderOptimized } from "@/components/org-chart/OrgChartBuilderOptimized";
import DelegateElevate from "@/pages/tools/DelegateElevate";
import ClarityBreakJournal from "@/pages/tools/ClarityBreakJournal";
import { useTeams } from "@/hooks/useTeams";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useSimpleIssues } from "@/hooks/useSimpleIssues";
import { useToast } from "@/hooks/use-toast";
import { logger } from '@/utils/logger';

interface QuarterlyToolsSectionProps {
  teamId: string;
}

const toolCards = [
  {
    name: "Metrics",
    key: "metrics",
    Icon: BarChart3,
    desc: "Track and review key performance indicators",
    color: "bg-secondary/50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 hover:bg-secondary dark:hover:bg-purple-950/50"
  },
  {
    name: "Org Chart",
    key: "org-chart",
    Icon: Users,
    desc: "Review organizational structure and roles",
    color: "bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 hover:bg-warning/10 dark:hover:bg-orange-950/50"
  },
  {
    name: "Delegate & Elevate",
    key: "delegate-elevate",
    Icon: ListChecks,
    desc: "Focus on what you love and delegate the rest",
    color: "bg-primary/5 dark:bg-blue-950/30 text-primary dark:text-blue-300 hover:bg-primary/10 dark:hover:bg-blue-950/50"
  },
  {
    name: "Clarity Break Journal",
    key: "clarity-break",
    Icon: Share2,
    desc: "Reflect, solve, and gain insight with guided clarity breaks",
    color: "bg-success/5 dark:bg-green-950/30 text-success dark:text-green-300 hover:bg-success/10 dark:hover:bg-green-950/50"
  }
];

export const QuarterlyToolsSection: React.FC<QuarterlyToolsSectionProps> = ({ teamId }) => {
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [selectedTeamForMetrics, setSelectedTeamForMetrics] = useState<string>(teamId);
  const [delegateElevateButtons, setDelegateElevateButtons] = useState<React.ReactNode>(null);
  const { teams } = useTeams();
  const { settings, updateMetricsSettings, loading: settingsLoading } = useUserSettings();
  const { addIssue } = useSimpleIssues(teamId);
  const { toast } = useToast();
  
  // Find the current team
  const selectedTeam = teams.find(team => team.id === teamId);
  const compatibleTeams = teams.map(team => ({
    id: team.id,
    name: team.name,
    company_id: team.company_id
  }));

  // Wrapper function to match the expected signature
  const handleUpdateMetricsSettings = async (settings: any): Promise<void> => {
    try {
      await updateMetricsSettings(settings);
    } catch (error) {
      logger.error('QuarterlyTools: Failed to update metrics settings:', error);
      toast({
        title: "Error",
        description: "Failed to save metrics settings. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleCreateIssueFromMetric = async (title: string, description: string, ownerId?: string): Promise<void> => {
    logger.log('📝 Quarterly Tools - Creating issue from metric:', { title, description, ownerId });
    try {
      const success = await addIssue(title, description, 'short_term', ownerId);
      if (success) {
        logger.log('✅ Quarterly Tools - Issue created successfully from metric');
        logger.log('Issue created from metric (toast suppressed)');
      }
    } catch (error) {
      logger.error('❌ Quarterly Tools - Failed to create issue from metric:', error);
      toast({
        title: "Error",
        description: "Failed to create issue from metric.",
        variant: "destructive"
      });
    }
  };

  const renderSelectedTool = () => {
    switch (selectedTool) {
      case "metrics":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedTool(null)}
                className="text-sm"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Tools
              </Button>
            </div>
            <ConsolidatedMetricsPageContent
              teams={compatibleTeams} 
              selectedTeam={selectedTeamForMetrics} 
              setSelectedTeam={setSelectedTeamForMetrics} 
              userSettings={settings} 
              updateMetricsSettings={handleUpdateMetricsSettings} 
              settingsLoading={settingsLoading}
              onCreateIssue={handleCreateIssueFromMetric}
            />
          </div>
        );
      case "org-chart":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedTool(null)}
                className="text-sm"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Tools
              </Button>
            </div>
            <div className="h-[600px] border rounded-lg overflow-hidden">
              <OrgChartBuilderOptimized />
            </div>
          </div>
        );
      case "delegate-elevate":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedTool(null)}
                className="text-sm"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Tools
              </Button>
            </div>
            <DelegateElevate 
              inMeeting={true} 
              onRenderButtons={setDelegateElevateButtons}
            />
          </div>
        );
      case "clarity-break":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedTool(null)}
                className="text-sm"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Tools
              </Button>
            </div>
            <ClarityBreakJournal />
          </div>
        );
      default:
        return null;
    }
  };

  if (selectedTool) {
    const selectedToolCard = toolCards.find(tool => tool.key === selectedTool);
    const toolName = selectedToolCard?.name || '';
    
    return (
      <div className="pt-4">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <h2 className="text-2xl font-bold">Tools Review - {toolName}</h2>
          {selectedTool === 'delegate-elevate' && delegateElevateButtons}
        </div>
        {renderSelectedTool()}
      </div>
    );
  }

  return (
    <div className="pt-4">
      <h2 className="text-2xl font-bold mb-6">Tools Review</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {toolCards.map(({ name, key, Icon, desc, color }) => (
          <button
            key={key}
            onClick={() => setSelectedTool(key)}
            className="text-left"
          >
            <Card className={`transition-all hover:shadow-lg hover:scale-[1.02] ${color} border border-border cursor-pointer py-8 px-6 min-h-[180px] flex flex-col justify-center rounded-xl`}>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-4">
                  <Icon className="h-10 w-10" />
                  <span className="text-xl">{name}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-base text-muted-foreground leading-relaxed">{desc}</p>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuarterlyToolsSection;
