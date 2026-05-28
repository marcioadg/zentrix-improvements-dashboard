import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { FileText, Eye, EyeOff, Star, StarOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { useMarketingStrategy } from '@/hooks/useMarketingStrategy';
import CoreFourGrid from './CoreFourGrid';
import LeadGettersGrid from './LeadGettersGrid';

export default function MarketingStrategyView() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentCompany } = useMultiCompany();
  const [activeSection, setActiveSection] = useState<'core-four' | 'lead-getters'>('core-four');

  const { 
    loading, 
    session, 
    blocks, 
    saveBlock, 
    getBlockData, 
    getBlocksBySection, 
    getProgress 
  } = useMarketingStrategy(user?.id || null, currentCompany?.id || null);

  const { coreProgress, leadProgress, totalProgress, totalBlocks } = getProgress();
  const progressPercentage = (totalProgress / totalBlocks) * 100;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground mt-2">Loading your marketing strategy...</p>
        </div>
      </div>
    );
  }
  const generateLeadPlan = () => {
    toast({
      title: "Lead Plan Generated! 🚀",
      description: "Your comprehensive lead generation strategy is being prepared.",
    });
  };

  return (
    <div className="flex gap-6 h-full">
      {/* Main Content */}
      <div className="flex-1 space-y-6">
        {/* Header */}
        <Card className="p-6">
          <div>
            <h3 className="text-xl font-bold mb-2">Marketing Strategy Framework</h3>
            <p className="text-muted-foreground">
              Build your lead generation machine using Alex Hormozi's <em>$100M Leads</em> framework
            </p>
          </div>
        </Card>

        {/* Main Framework Tabs */}
        <Tabs value={activeSection} onValueChange={(value) => setActiveSection(value as typeof activeSection)}>
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="core-four" className="text-sm font-medium">
              📦 You Tell
            </TabsTrigger>
            <TabsTrigger value="lead-getters" className="text-sm font-medium">
              🧲 Others Tell
            </TabsTrigger>
          </TabsList>

          <TabsContent value="core-four" className="mt-6">
            <div className="space-y-4">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">📦 Core Four</h2>
                <p className="text-muted-foreground italic">
                  "You tell people about your stuff"
                </p>
              </div>
              <CoreFourGrid 
                saveBlock={saveBlock}
                getBlockData={getBlockData}
                blocks={getBlocksBySection('core-four')}
              />
            </div>
          </TabsContent>

          <TabsContent value="lead-getters" className="mt-6">
            <div className="space-y-4">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">🧲 Lead Getters</h2>
                <p className="text-muted-foreground italic">
                  "Others tell people about your stuff"
                </p>
              </div>
              <LeadGettersGrid 
                saveBlock={saveBlock}
                getBlockData={getBlockData}
                blocks={getBlocksBySection('lead-getters')}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Sidebar */}
      <div className="w-80 space-y-4">
        <Card className="p-4 sticky top-4">
          <div className="space-y-4">
            {/* Progress Overview */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold">Progress</h4>
                <span className="text-sm text-muted-foreground">
                  {totalProgress}/{totalBlocks}
                </span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {totalProgress === totalBlocks ? 
                  '✅ Lead machine complete!' : 
                  `${totalBlocks - totalProgress} blocks remaining`
                }
              </p>
            </div>

            {/* Section Breakdown */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>📦 Core Four</span>
                <Badge variant="secondary">{coreProgress}/4</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>🧲 Lead Getters</span>
                <Badge variant="secondary">{leadProgress}/4</Badge>
              </div>
            </div>

            {/* Quick Tips */}
            <div className="pt-4 border-t">
              <h4 className="font-semibold mb-2">💡 Quick Tips</h4>
              <div className="space-y-2 text-xs text-muted-foreground">
                <p>• Focus on 1-2 channels maximum to start</p>
                <p>• Set daily/weekly targets for each active channel</p>
                <p>• Track which methods drive highest quality leads</p>
                <p>• Test hooks and scripts regularly</p>
              </div>
            </div>

            {/* Generate CTA */}
            <Button 
              onClick={generateLeadPlan}
              className="w-full"
              variant={totalProgress >= 6 ? "default" : "outline"}
            >
              <FileText className="h-4 w-4 mr-2" />
              Generate Lead Plan
            </Button>
            
            {totalProgress < 6 && (
              <p className="text-xs text-muted-foreground text-center">
                Complete at least 6 blocks for a comprehensive plan
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}