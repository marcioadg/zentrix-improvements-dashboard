import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, Download, Zap, TrendingUp, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import StrategyCard from './StrategyCard';
import { strategyModes, StrategyMode } from './strategyData';
import { useDeepStrategy } from '@/hooks/useDeepStrategy';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { logger } from '@/utils/logger';

export default function DeepStrategyView() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentCompany } = useMultiCompany();
  const [selectedMode, setSelectedMode] = useState<StrategyMode>('scaling');
  
  // Use the Deep Strategy hook for persistence
  const { responses, loading, saveResponse } = useDeepStrategy(
    user?.id || null,
    currentCompany?.id || null
  );

  const currentQuestions = strategyModes[selectedMode];
  const currentResponses = responses[selectedMode] || {};
  const completedCount = Object.keys(currentResponses).filter(key => currentResponses[parseInt(key)]?.trim()).length;

  const handleResponseChange = async (questionIndex: number, response: string) => {
    const question = currentQuestions.questions[questionIndex];
    await saveResponse(selectedMode, questionIndex, question, response);
  };

  const getModeIcon = (mode: StrategyMode) => {
    switch (mode) {
      case 'pre-revenue':
        return <Zap className="h-4 w-4" />;
      case 'scaling':
        return <TrendingUp className="h-4 w-4" />;
      case 'plateaued':
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getModeVariant = (mode: StrategyMode) => {
    switch (mode) {
      case 'pre-revenue':
        return 'outline' as const;
      case 'scaling':
        return 'outline' as const;
      case 'plateaued':
        return 'outline' as const;
    }
  };

  const getModeStyles = (mode: StrategyMode) => {
    switch (mode) {
      case 'pre-revenue':
        return 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/20';
      case 'scaling':
        return 'bg-success/10 text-success border-success/30 hover:bg-success/20';
      case 'plateaued':
        return 'bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20';
    }
  };

  const scrollToQuestion = (index: number) => {
    const element = document.getElementById(`question-${index}`);
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const generateSummary = () => {
    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.width;
      const pageHeight = pdf.internal.pageSize.height;
      const margin = 20;
      const maxLineWidth = pageWidth - (margin * 2);
      let yPosition = margin;

      // Helper function to add text with word wrapping
      const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize = 12) => {
        pdf.setFontSize(fontSize);
        const lines = pdf.splitTextToSize(text, maxWidth);
        lines.forEach((line: string, index: number) => {
          if (y + (index * fontSize * 0.4) > pageHeight - margin) {
            pdf.addPage();
            yPosition = margin;
            pdf.text(line, x, margin);
          } else {
            pdf.text(line, x, y + (index * fontSize * 0.4));
          }
        });
        return y + (lines.length * fontSize * 0.4) + 5;
      };

      // Title
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      yPosition = addWrappedText('Strategic Summary Report', margin, yPosition, maxLineWidth, 24);
      
      // Strategy Mode
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      yPosition = addWrappedText(`Strategy Mode: ${strategyModes[selectedMode].title}`, margin, yPosition + 10, maxLineWidth, 16);
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      yPosition = addWrappedText(strategyModes[selectedMode].subtitle, margin, yPosition + 5, maxLineWidth);
      
      // Date
      const currentDate = new Date().toLocaleDateString();
      yPosition = addWrappedText(`Generated on: ${currentDate}`, margin, yPosition + 10, maxLineWidth);
      
      // Progress
      yPosition = addWrappedText(`Completion: ${completedCount}/${currentQuestions.questions.length} questions answered`, margin, yPosition + 5, maxLineWidth);

      // Questions and Answers
      yPosition += 15;
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      yPosition = addWrappedText('Strategic Analysis', margin, yPosition, maxLineWidth, 18);
      
      currentQuestions.questions.forEach((question, index) => {
        const response = currentResponses[index] || 'No response provided';
        
        // Check if we need a new page
        if (yPosition > pageHeight - 100) {
          pdf.addPage();
          yPosition = margin;
        }
        
        // Question
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        yPosition = addWrappedText(`${index + 1}. ${question}`, margin, yPosition + 15, maxLineWidth, 14);
        
        // Answer
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
        yPosition = addWrappedText(response, margin + 10, yPosition + 5, maxLineWidth - 10, 11);
      });

      // Save the PDF
      const fileName = `strategic-summary-${selectedMode}-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
      toast({
        title: "PDF Generated Successfully",
        description: `Your strategic summary has been downloaded as ${fileName}`,
      });
    } catch (error) {
      logger.error('Error generating PDF:', error);
      toast({
        title: "Error Generating PDF",
        description: "There was an issue creating your strategic summary. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground mt-2">Loading your strategy responses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-6 h-full">
      {/* Main Content */}
      <div className="flex-1 space-y-6">
        {/* Mode Selector */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold mb-1">Strategy Mode</h3>
              <p className="text-sm text-muted-foreground">
                Select your business stage for targeted strategic insights
              </p>
            </div>
            <Select value={selectedMode} onValueChange={(value: StrategyMode) => setSelectedMode(value)}>
              <SelectTrigger className="w-80 h-12">
                <div className="flex items-center gap-2">
                  <Badge variant={getModeVariant(selectedMode)} className={`flex items-center gap-1 ${getModeStyles(selectedMode)}`}>
                    {getModeIcon(selectedMode)}
                    {strategyModes[selectedMode].title}
                  </Badge>
                </div>
              </SelectTrigger>
              <SelectContent className="w-80">
                <SelectItem value="pre-revenue" className="cursor-pointer">
                  <div className="flex items-center gap-2 py-1">
                    <Badge variant="outline" className="flex items-center gap-1 bg-primary/10 text-primary border-primary/30 hover:bg-primary/20">
                      <Zap className="h-4 w-4" />
                      Pre-Revenue Startup
                    </Badge>
                    <span className="text-xs text-muted-foreground ml-2">Find truth, not comfort</span>
                  </div>
                </SelectItem>
                <SelectItem value="scaling" className="cursor-pointer">
                  <div className="flex items-center gap-2 py-1">
                    <Badge variant="outline" className="flex items-center gap-1 bg-success/10 text-success border-success/30 hover:bg-success/20">
                      <TrendingUp className="h-4 w-4" />
                      Scaling Company
                    </Badge>
                    <span className="text-xs text-muted-foreground ml-2">Systematize & amplify</span>
                  </div>
                </SelectItem>
                <SelectItem value="plateaued" className="cursor-pointer">
                  <div className="flex items-center gap-2 py-1">
                    <Badge variant="outline" className="flex items-center gap-1 bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20">
                      <AlertTriangle className="h-4 w-4" />
                      Plateaued Business
                    </Badge>
                    <span className="text-xs text-muted-foreground ml-2">Diagnose & reinvent</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Strategy Cards */}
        <div className="space-y-4">
          {currentQuestions.questions.map((question, index) => (
            <motion.div
              key={`${selectedMode}-${index}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              id={`question-${index}`}
            >
              <StrategyCard
                question={question}
                questionNumber={index + 1}
                totalQuestions={currentQuestions.questions.length}
                response={currentResponses[index] || ''}
                onResponseChange={(response) => handleResponseChange(index, response)}
              />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Sticky Sidebar */}
      <div className="w-80 space-y-4">
        <Card className="p-4 sticky top-4">
          <div className="space-y-4">
            {/* Progress Overview */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold">Progress</h4>
                <span className="text-sm text-muted-foreground">
                  {completedCount}/{currentQuestions.questions.length}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <motion.div
                  className="bg-primary h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(completedCount / currentQuestions.questions.length) * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {completedCount === currentQuestions.questions.length ? 
                  '✅ All questions answered!' : 
                  `${currentQuestions.questions.length - completedCount} questions remaining`
                }
              </p>
            </div>

            {/* Quick Navigation */}
            <div>
              <h4 className="font-semibold mb-2">Quick Jump</h4>
              <div className="grid grid-cols-5 gap-2">
                {currentQuestions.questions.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => scrollToQuestion(index)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs border transition-colors hover:bg-muted"
                  >
                    {currentResponses[index]?.trim() ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Summary CTA */}
            <Button 
              onClick={generateSummary}
              className="w-full"
              disabled={completedCount < currentQuestions.questions.length}
            >
              <Download className="h-4 w-4 mr-2" />
              Generate My Strategic Summary
            </Button>
            
            {completedCount < currentQuestions.questions.length && (
              <p className="text-xs text-muted-foreground text-center">
                Complete all questions to generate your summary
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}