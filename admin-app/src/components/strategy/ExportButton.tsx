
import React from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useSimpleStrategy } from '@/contexts/SimpleStrategyContext';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { trackVTOExported } from '@/lib/statsigAnalytics';
import jsPDF from 'jspdf';
import { logger } from '@/utils/logger';

export const ExportButton: React.FC = () => {
  const { data } = useSimpleStrategy();
  const { user } = useAuth();
  const { currentCompany } = useMultiCompany();

  const exportToPDF = () => {
    logger.log('📋 Issues data in export:', data.issues);
    logger.log('📋 Issues count:', data.issues?.length || 0);
    
    // Track VTO export (non-blocking)
    if (user?.id && currentCompany?.id) {
      try {
        trackVTOExported({
          user_id: user.id,
          company_id: currentCompany?.id,
          export_format: 'pdf',
        });
      } catch (e) {
        // Non-blocking
      }
    }
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let yPosition = 30;

    // Helper function to add text with word wrapping
    const addText = (text: string, fontSize = 10, isBold = false) => {
      doc.setFontSize(fontSize);
      if (isBold) doc.setFont('helvetica', 'bold');
      else doc.setFont('helvetica', 'normal');
      
      const lines = doc.splitTextToSize(text, pageWidth - (margin * 2));
      lines.forEach((line: string) => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }
        doc.text(line, margin, yPosition);
        yPosition += fontSize * 0.6;
      });
      yPosition += 5;
    };

    // Helper function to add a new page
    const addNewPage = () => {
      doc.addPage();
      yPosition = 30;
    };

    // Title
    addText('STRATEGIC PLAN', 20, true);
    yPosition += 10;

    // Strategy Section
    addText('STRATEGY', 16, true);
    yPosition += 5;

    addText('Purpose Statement:', 12, true);
    addText(data.purpose || 'Not defined');

    addText('Core Values:', 12, true);
    if (data.coreValues.length > 0) {
      data.coreValues.forEach(v => addText(`• ${v.value}`));
    } else {
      addText('None defined');
    }

    addText(`Long-Term Objective (${data.longTermTimeframe} years):`, 12, true);
    addText(data.longTermObjective || 'Not defined');

    addText('3-Year Milestones:', 12, true);
    addText(`• Revenue: ${data.threeYearMilestones.revenue || 'Not set'}`);
    addText(`• Profit: ${data.threeYearMilestones.profit || 'Not set'}`);
    addText(`• Team Size: ${data.threeYearMilestones.teamSize || 'Not set'}`);
    addText(`• Key Descriptors: ${data.threeYearMilestones.keyDescriptors || 'Not defined'}`);

    addText('Target Customer Profile:', 12, true);
    addText(`• Demographics: ${data.targetCustomer.demographics || 'Not defined'}`);
    addText(`• Psychographics: ${data.targetCustomer.psychographics || 'Not defined'}`);
    addText(`• Behavior: ${data.targetCustomer.behavior || 'Not defined'}`);

    addText('Unique Edge:', 12, true);
    addText(data.uniqueEdge || 'Not defined');

    yPosition += 10;

    // Execution Section
    addText('EXECUTION', 16, true);
    yPosition += 5;

    addText('1-Year Goals:', 12, true);
    addText(`• Revenue: ${data.oneYearGoals.revenue || 'Not set'}`);
    addText(`• Profit: ${data.oneYearGoals.profit || 'Not set'}`);
    
    // Handle deliverables (could be string or array)
    if (Array.isArray(data.oneYearGoals.deliverables)) {
      if (data.oneYearGoals.deliverables.length > 0) {
        addText('• Deliverables:');
        data.oneYearGoals.deliverables.forEach(d => addText(`  - ${d.text}`));
      } else {
        addText('• Deliverables: Not defined');
      }
    } else {
      addText(`• Deliverables: ${data.oneYearGoals.deliverables || 'Not defined'}`);
    }

    addText('Quarterly Priorities:', 12, true);
    if (data.quarterlyPriorities.length > 0) {
      data.quarterlyPriorities.forEach(p => {
        addText(`• ${p.title} (Owner: ${p.owner || 'Unassigned'}, Due: ${p.deadline || 'No deadline'}, Status: ${p.status})`);
      });
    } else {
      addText('None defined');
    }

    addText('Key Issues:', 12, true);
    if (data.issues.length > 0) {
      data.issues.forEach(i => {
        addText(`• ${i.title}${i.owner ? ` (Owner: ${i.owner})` : ''}`);
        if (i.description) {
          addText(`  ${i.description}`);
        }
      });
    } else {
      addText('None tracked');
    }

    // Add new page for SWOT Analysis
    addNewPage();
    
    // SWOT Analysis Section
    addText('SWOT ANALYSIS', 20, true);
    yPosition += 10;

    // Strengths
    addText('STRENGTHS', 16, true);
    yPosition += 5;
    if (data.swotData.strengths.length > 0) {
      data.swotData.strengths.forEach(item => addText(`• ${item.text}`));
    } else {
      addText('None defined');
    }
    yPosition += 10;

    // Weaknesses
    addText('WEAKNESSES', 16, true);
    yPosition += 5;
    if (data.swotData.weaknesses.length > 0) {
      data.swotData.weaknesses.forEach(item => addText(`• ${item.text}`));
    } else {
      addText('None defined');
    }
    yPosition += 10;

    // Opportunities
    addText('OPPORTUNITIES', 16, true);
    yPosition += 5;
    if (data.swotData.opportunities.length > 0) {
      data.swotData.opportunities.forEach(item => addText(`• ${item.text}`));
    } else {
      addText('None defined');
    }
    yPosition += 10;

    // Threats
    addText('THREATS', 16, true);
    yPosition += 5;
    if (data.swotData.threats.length > 0) {
      data.swotData.threats.forEach(item => addText(`• ${item.text}`));
    } else {
      addText('None defined');
    }

    // Save the PDF
    doc.save('strategic-plan.pdf');
  };

  return (
    <Button onClick={exportToPDF} variant="outline" size="sm">
      <Download className="h-4 w-4 mr-2" />
      Export Plan
    </Button>
  );
};
