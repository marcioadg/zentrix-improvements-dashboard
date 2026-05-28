import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { FileText, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { useOfferBuilder } from '@/hooks/useOfferBuilder';
import ValueEquationGrid from './ValueEquationGrid';
import GrandSlamOfferBuilder from './GrandSlamOfferBuilder';
import BonusStackEngine from './BonusStackEngine';
import ObjectionHandlingEngine from './ObjectionHandlingEngine';

export default function OfferBuilderView() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentCompany } = useMultiCompany();

  const { 
    loading, 
    session, 
    sections, 
    bonusItems, 
    objections,
    saveSection,
    saveBonusItem,
    updateBonusItem,
    deleteBonusItem,
    saveObjection,
    updateObjection,
    deleteObjection,
    getSectionData,
    getProgress 
  } = useOfferBuilder(user?.id || null, currentCompany?.id || null);

  const { sectionsCompleted, totalSections, fieldsCompleted, fieldsTotal, valueScore } = getProgress();

  const generateOfferPack = () => {
    toast({
      title: "Offer Pack Generated! 🎯",
      description: "Your comprehensive $100M Offer package is being prepared.",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground mt-2">Loading your offer builder...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-6 h-full">
      {/* Main Content */}
      <div className="flex-1 space-y-8">
        {/* Header */}
        <Card className="p-6">
          <div>
            <h3 className="text-xl font-bold mb-2">$100M Offer Builder</h3>
            <p className="text-muted-foreground">
              Create your Grand Slam Offer that customers can't refuse using Alex Hormozi's proven framework
            </p>
          </div>
        </Card>

        {/* Value Equation Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">🧩 Value Equation</h2>
            <p className="text-sm text-muted-foreground italic mb-4">
              Value = (Dream Outcome × Perceived Likelihood of Success) ÷ (Time Delay × Effort & Sacrifice)
            </p>
          </div>
          <ValueEquationGrid 
            sectionData={getSectionData('value-equation')}
            onSave={(data) => saveSection('value-equation', data)}
          />
        </motion.div>

        {/* Grand Slam Offer Builder */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">🎯 Grand Slam Offer Builder</h2>
            <p className="text-sm text-muted-foreground">
              Define your specific avatar, single outcome, and crystal-clear offer
            </p>
          </div>
          <GrandSlamOfferBuilder 
            sectionData={getSectionData('grand-slam')}
            onSave={(data) => saveSection('grand-slam', data)}
          />
        </motion.div>

        {/* Bonus Stack Engine */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">🎁 Bonus Stack Engine</h2>
            <p className="text-sm text-muted-foreground">
              Add irresistible bonuses that remove objections and increase perceived value
            </p>
          </div>
          <BonusStackEngine 
            bonusItems={bonusItems}
            onSave={saveBonusItem}
            onUpdate={updateBonusItem}
            onDelete={deleteBonusItem}
          />
        </motion.div>

        {/* Objection Handling Engine */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">❌ Objection Handling Engine</h2>
            <p className="text-sm text-muted-foreground">
              Anticipate and crush every objection before it kills your sale
            </p>
          </div>
          <ObjectionHandlingEngine 
            objections={objections}
            onSave={saveObjection}
            onUpdate={updateObjection}
            onDelete={deleteObjection}
          />
        </motion.div>
      </div>

      {/* Sidebar */}
      <div className="w-80 space-y-4">
        <Card className="p-4 sticky top-4">
          <div className="space-y-4">
            {/* Value Score */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold">Value Score</h4>
                <span className="text-lg font-bold text-primary">{valueScore}/100</span>
              </div>
              <Progress value={valueScore} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Red</span>
                <span>Green</span>
              </div>
            </div>

            {/* Completion Progress */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold">Progress</h4>
                <span className="text-sm text-muted-foreground">
                  {fieldsCompleted}/{fieldsTotal}
                </span>
              </div>
              <Progress value={(fieldsCompleted / fieldsTotal) * 100} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {fieldsCompleted === fieldsTotal ? 
                  '✅ Offer complete!' : 
                  `${fieldsTotal - fieldsCompleted} fields remaining`
                }
              </p>
            </div>

            {/* Section Breakdown */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>🧩 Value Equation</span>
                <Badge variant="secondary">{Object.keys(getSectionData('value-equation')).length > 0 ? '✓' : '○'}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>🎯 Grand Slam Offer</span>
                <Badge variant="secondary">{Object.keys(getSectionData('grand-slam')).length > 0 ? '✓' : '○'}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>🎁 Bonus Stack</span>
                <Badge variant="secondary">{bonusItems.length}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>❌ Objections</span>
                <Badge variant="secondary">{objections.length}</Badge>
              </div>
            </div>

            {/* Quick Tips */}
            <div className="pt-4 border-t">
              <h4 className="font-semibold mb-2">💡 Quick Tips</h4>
              <div className="space-y-2 text-xs text-muted-foreground">
                <p>• Focus on dream outcome first</p>
                <p>• Add proof to increase likelihood</p>
                <p>• Stack bonuses that remove objections</p>
                <p>• Make the offer feel inevitable</p>
              </div>
            </div>

            {/* Generate CTA */}
            <Button 
              onClick={generateOfferPack}
              className="w-full"
              variant={valueScore >= 70 ? "default" : "outline"}
            >
              <Download className="h-4 w-4 mr-2" />
              Generate My $100M Offer Pack
            </Button>
            
            {valueScore < 70 && (
              <p className="text-xs text-muted-foreground text-center">
                Complete more sections for a comprehensive offer pack
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}