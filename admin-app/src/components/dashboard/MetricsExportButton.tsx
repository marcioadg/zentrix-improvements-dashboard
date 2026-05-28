import React from 'react';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { WeeklyMetricWithOwner } from '@/types/weeklyMetrics';
import { useToast } from '@/hooks/use-toast';
import { getTargetLogicSymbol } from '@/utils/metricUtils';
import { logger } from '@/utils/logger';
// formatValue is passed as a prop, no need to import

interface MetricsExportButtonProps {
  metrics: WeeklyMetricWithOwner[];
  teamName: string;
  weekStarts: string[];
  formatWeekDate: (date: string) => string;
  formatValue: (value: number | null, unit: string, addSuffix?: boolean) => string;
  getValueColor: (value: number | null, metric: any, weekStart?: string) => string;
  loading?: boolean;
}

export const MetricsExportButton: React.FC<MetricsExportButtonProps> = ({
  metrics,
  teamName,
  weekStarts,
  formatWeekDate,
  formatValue,
  getValueColor,
  loading = false
}) => {
  const { toast } = useToast();

  // Helper to detect if a string is an ISO date (YYYY-MM-DD) vs a formatted label
  const isISODate = (dateString: string): boolean => {
    return /^\d{4}-\d{2}-\d{2}$/.test(dateString);
  };

  const exportToPDF = async () => {
    if (loading || metrics.length === 0) {
      toast({
        title: "Export unavailable",
        description: "Please wait for metrics to load or add some metrics first.",
        variant: "destructive"
      });
      return;
    }

    try {
      const doc = new jsPDF('l', 'mm', 'a4'); // Landscape orientation for better table display
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;

      // Header Section
      doc.setFontSize(24);
      doc.setFont(undefined, 'bold');
      doc.text('Team Metrics Report', margin, 30);
      
      doc.setFontSize(16);
      doc.setFont(undefined, 'normal');
      doc.text(`Team: ${teamName}`, margin, 45);
      
      doc.setFontSize(12);
      doc.text(`Generated on: ${new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}`, margin, 55);

      // Add company branding line
      doc.setDrawColor(59, 130, 246); // Blue color
      doc.setLineWidth(2);
      doc.line(margin, 65, pageWidth - margin, 65);

      let yPosition = 80;

      // Metrics Summary
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text('Metrics Overview', margin, yPosition);
      
      yPosition += 15;
      doc.setFontSize(11);
      doc.setFont(undefined, 'normal');
      doc.text(`Total Metrics: ${metrics.length}`, margin, yPosition);
      doc.text(`Reporting Period: ${weekStarts.length} weeks`, margin + 80, yPosition);
      
      yPosition += 20;

      // Split weeks into chunks of 8 for multiple tables
      const WEEKS_PER_TABLE = 8;
      const weekChunks = [];
      for (let i = 0; i < weekStarts.length; i += WEEKS_PER_TABLE) {
        weekChunks.push(weekStarts.slice(i, i + WEEKS_PER_TABLE));
      }

      // Create tables for each chunk
      weekChunks.forEach((weekChunk, chunkIndex) => {
        // Add table title if multiple chunks
        if (weekChunks.length > 1) {
          let titleText = '';
          
          // Check if we're dealing with ISO dates or formatted labels
          if (isISODate(weekChunk[0])) {
            const firstWeek = new Date(weekChunk[0]);
            const lastWeek = new Date(weekChunk[weekChunk.length - 1]);
            const lastWeekEnd = new Date(lastWeek);
            lastWeekEnd.setDate(lastWeek.getDate() + 6);
            
            const startFormatted = firstWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const endFormatted = lastWeekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            titleText = `Metrics ${startFormatted} - ${endFormatted}`;
          } else {
            // Already a formatted label
            titleText = `Metrics ${weekChunk[0]} to ${weekChunk[weekChunk.length - 1]}`;
          }
          
          doc.setFontSize(14);
          doc.setFont(undefined, 'bold');
          doc.text(titleText, margin, yPosition);
          yPosition += 15;
        }

        // Table Header - Optimized for chunk of weeks
        const cellHeight = 7;
        const headerHeight = 12; // Adjusted header for 2-line stacked dates
        const metricNameWidth = 35;
        const ownerWidth = 25;
        const unitWidth = 15;
        const targetWidth = 18;
        const availableWidth = pageWidth - margin * 2 - metricNameWidth - ownerWidth - unitWidth - targetWidth;
        
        // Calculate week width for this chunk
        const weeksToShow = weekChunk.length;
        const weekWidth = availableWidth / weeksToShow;
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        
        // Draw header background - taller for stacked dates
        doc.setFillColor(249, 250, 251);
        doc.rect(margin, yPosition - 8, pageWidth - margin * 2, headerHeight, 'F');
        
        // Header text
        let xPosition = margin;
        doc.text('Metric Name', xPosition + 2, yPosition);
        xPosition += metricNameWidth;
        doc.text('Owner', xPosition + 2, yPosition);
        xPosition += ownerWidth;
        doc.text('Unit', xPosition + 2, yPosition);
        xPosition += unitWidth;
        doc.text('Target', xPosition + 2, yPosition);
        xPosition += targetWidth;
        
        // Week headers with 2-line stacked dates
        doc.setFontSize(9); // Increased font for dates
        weekChunk.forEach((week) => {
          let firstLine = '';
          let secondLine = '';
          
          // Check if we're dealing with ISO dates or formatted labels
          if (isISODate(week)) {
            // Parse as ISO date
            const weekDate = new Date(week);
            const endDate = new Date(weekDate);
            endDate.setDate(weekDate.getDate() + 6); // End of week (6 days after start)
            
            // Format as 2 lines: start date and end date
            const startMonth = weekDate.toLocaleDateString('en-US', { month: 'short' });
            const startDay = weekDate.getDate();
            const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
            const endDay = endDate.getDate();
            
            // Line 1: Start month + day (e.g., "Jul27")
            firstLine = `${startMonth}${startDay}`;
            // Line 2: End month + day (e.g., "Aug2")
            secondLine = `${endMonth}${endDay}`;
          } else {
            // Already a formatted label, split it
            const parts = week.split(' - ');
            if (parts.length === 2) {
              firstLine = parts[0];
              secondLine = parts[1];
            } else {
              // Fallback: use the whole string
              firstLine = week.substring(0, week.length / 2);
              secondLine = week.substring(week.length / 2);
            }
          }
          
          // Draw two lines with proper spacing
          doc.text(firstLine, xPosition + 2, yPosition - 3);
          doc.text(secondLine, xPosition + 2, yPosition + 3);
          xPosition += weekWidth;
        });
        doc.setFontSize(10); // Reset font size

        yPosition += headerHeight;

        // Table borders for header - use headerHeight
        doc.setDrawColor(229, 231, 235);
        doc.setLineWidth(0.5);
        doc.rect(margin, yPosition - headerHeight - 8, pageWidth - margin * 2, headerHeight);

        // Metrics Data
        doc.setFont(undefined, 'normal');
        metrics.forEach((metric, index) => {
          // Check if we need a new page
          if (yPosition > pageHeight - 40) {
            doc.addPage();
            yPosition = 30;
          }

          // Alternate row background
          if (index % 2 === 0) {
            doc.setFillColor(248, 250, 252);
            doc.rect(margin, yPosition - 6, pageWidth - margin * 2, cellHeight, 'F');
          }

          xPosition = margin;
          
          // Metric name (truncated if too long)
          const truncatedName = metric.metric_name.length > 18 ? 
            metric.metric_name.substring(0, 15) + '...' : metric.metric_name;
          doc.text(truncatedName, xPosition + 1, yPosition);
          xPosition += metricNameWidth;
          
          // Owner
          const ownerText = metric.owner.length > 12 ? 
            metric.owner.substring(0, 9) + '...' : metric.owner;
          doc.text(ownerText, xPosition + 1, yPosition);
          xPosition += ownerWidth;
          
          // Unit
          const unitText = metric.unit.length > 8 ? 
            metric.unit.substring(0, 5) + '...' : metric.unit;
          doc.text(unitText, xPosition + 1, yPosition);
          xPosition += unitWidth;
          
          // Target
          const targetText = metric.target_value ? 
            `${getTargetLogicSymbol(metric.target_logic || 'greater_than_or_equal')}${formatValue(metric.target_value, metric.unit, false)}` : 'N/A';
          const truncatedTarget = targetText.length > 10 ? targetText.substring(0, 7) + '...' : targetText;
          doc.text(truncatedTarget, xPosition + 1, yPosition);
          xPosition += targetWidth;
          
          // Weekly values - use readable font
          doc.setFontSize(9);
          weekChunk.forEach((week) => {
            const value = metric.weeklyValues[week];
            let valueText = value !== null ? formatValue(value, metric.unit, false) : '-';
            
            // Truncate long values to fit in narrow columns
            if (valueText.length > 8) {
              if (value !== null && typeof value === 'number') {
                // For numbers, show abbreviated format
                if (value >= 1000000) {
                  valueText = `${(value / 1000000).toFixed(1)}M`;
                } else if (value >= 1000) {
                  valueText = `${(value / 1000).toFixed(1)}K`;
                } else {
                  valueText = value.toFixed(0);
                }
              } else {
                valueText = valueText.substring(0, 6) + '..';
              }
            }
            
            // Color coding based on target achievement
            const colorClass = getValueColor(value, metric, week);
            
            // Set text color based on performance
            if (colorClass.includes('green')) {
              doc.setTextColor(34, 197, 94); // Green for good performance
            } else if (colorClass.includes('red')) {
              doc.setTextColor(239, 68, 68); // Red for poor performance
            } else {
              doc.setTextColor(0, 0, 0); // Default black
            }
            
            doc.text(valueText, xPosition + 1, yPosition);
            doc.setTextColor(0, 0, 0); // Reset to black
            xPosition += weekWidth;
          });
          
          // Reset font size for next row
          doc.setFontSize(10);

          // Row border
          doc.setDrawColor(229, 231, 235);
          doc.rect(margin, yPosition - 6, pageWidth - margin * 2, cellHeight);
          
          yPosition += cellHeight;
        });

        // Add spacing between tables if there are more chunks
        if (chunkIndex < weekChunks.length - 1) {
          yPosition += 30;
          
          // Check if we need a new page for the next table
          if (yPosition > pageHeight - 100) {
            doc.addPage();
            yPosition = 30;
          }
        }
      });

      // Footer
      yPosition += 20;
      if (yPosition > pageHeight - 30) {
        doc.addPage();
        yPosition = 30;
      }

      doc.setFontSize(10);
      doc.setFont(undefined, 'italic');
      doc.setTextColor(107, 114, 128);
      doc.text('This report was generated automatically by your metrics platform.', margin, yPosition);
      doc.text('For questions about this data, please contact your team lead or administrator.', margin, yPosition + 10);

      // Page numbers
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(107, 114, 128);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - 40, pageHeight - 10);
      }

      // Save the PDF
      const fileName = `${teamName.replace(/\s+/g, '_')}_metrics_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      toast({
        title: "Export successful",
        description: `Metrics report has been downloaded as ${fileName}`,
      });

    } catch (error) {
      logger.error('Error generating PDF:', error);
      toast({
        title: "Export failed",
        description: "There was an error generating the PDF. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <Button
      onClick={exportToPDF}
      variant="outline"
      size="sm"
      disabled={loading || metrics.length === 0}
      className="gap-2"
      data-export-pdf-trigger
    >
      <FileDown className="h-4 w-4" />
      Export PDF
    </Button>
  );
};