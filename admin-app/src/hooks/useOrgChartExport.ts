import { useCallback } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

export const useOrgChartExport = () => {
  const { toast } = useToast();

  const exportToPDF = useCallback(async (companyName?: string) => {
    try {
      toast({
        title: "Generating PDF...",
        description: "Please wait while we create your org chart PDF."
      });

      // Find containers
      const orgChartElement = document.querySelector('[data-org-chart-content]') as HTMLElement;
      const captureElement = (document.querySelector('[data-org-chart-inner]') as HTMLElement) || orgChartElement;
      
      if (!orgChartElement || !captureElement) {
        throw new Error('Org chart content not found. Please make sure the chart is visible.');
      }

      // Temporarily set the container to show all content for capture
      const originalStyle = {
        overflow: orgChartElement.style.overflow,
        height: orgChartElement.style.height,
        maxHeight: orgChartElement.style.maxHeight,
        backgroundColor: orgChartElement.style.backgroundColor,
        backgroundImage: orgChartElement.style.backgroundImage,
        background: orgChartElement.style.background,
      };

      // Force solid white background (remove grid) and ensure full content is visible
      orgChartElement.style.overflow = 'visible';
      orgChartElement.style.height = 'auto';
      orgChartElement.style.maxHeight = 'none';
      orgChartElement.style.background = '#ffffff';
      orgChartElement.style.backgroundColor = '#ffffff';
      orgChartElement.style.backgroundImage = 'none';

      // Fix SVG connection lines: html2canvas can't resolve CSS vars so lines render black.
      // Temporarily set explicit stroke color for export.
      const svgLines = captureElement.querySelectorAll('svg line');
      const originalStrokes: string[] = [];
      svgLines.forEach((line, i) => {
        originalStrokes[i] = (line as SVGLineElement).getAttribute('stroke') || '';
        (line as SVGLineElement).setAttribute('stroke', '#9ca3af');
      });

      // Generate canvas from the inner chart container for cleaner capture
      const canvas = await html2canvas(captureElement, {
        scale: 2, // Higher quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        removeContainer: false,
        logging: false,
        width: captureElement.scrollWidth,
        height: captureElement.scrollHeight
      });

      // Restore SVG line strokes
      svgLines.forEach((line, i) => {
        (line as SVGLineElement).setAttribute('stroke', originalStrokes[i]);
      });

      // Restore original styles
      orgChartElement.style.overflow = originalStyle.overflow;
      orgChartElement.style.height = originalStyle.height;
      orgChartElement.style.maxHeight = originalStyle.maxHeight;
      orgChartElement.style.backgroundColor = originalStyle.backgroundColor;
      orgChartElement.style.backgroundImage = originalStyle.backgroundImage;
      orgChartElement.style.background = originalStyle.background;

      // Create a new canvas with guaranteed white background
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = canvas.width;
      finalCanvas.height = canvas.height;
      const finalCtx = finalCanvas.getContext('2d');
      
      if (finalCtx) {
        // Fill with white background first
        finalCtx.fillStyle = '#ffffff';
        finalCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
        
        // Draw the captured content on top
        finalCtx.drawImage(canvas, 0, 0);
      }

      // Auto-crop to content to ensure equal left/right margins
      let croppedCanvas = finalCanvas;
      try {
        const sampleStep = 4; // skip pixels for performance
        const pad = 20; // extra padding around content
        const ctx2 = finalCanvas.getContext('2d');
        if (ctx2) {
          const { width: w, height: h } = finalCanvas;
          const data = ctx2.getImageData(0, 0, w, h).data;
          const isNonWhite = (idx: number) => {
            const r = data[idx], g = data[idx + 1], b = data[idx + 2], a = data[idx + 3];
            return a > 0 && (r < 250 || g < 250 || b < 250);
          };
          let left = w, right = 0, top = h, bottom = 0;

          // scan columns
          for (let x = 0; x < w; x += 1) {
            let colHas = false;
            for (let y = 0; y < h; y += sampleStep) {
              const idx = (y * w + x) * 4;
              if (isNonWhite(idx)) { colHas = true; break; }
            }
            if (colHas) {
              if (x < left) left = x;
              if (x > right) right = x;
            }
          }

          // scan rows
          for (let y = 0; y < h; y += 1) {
            let rowHas = false;
            for (let x = 0; x < w; x += sampleStep) {
              const idx = (y * w + x) * 4;
              if (isNonWhite(idx)) { rowHas = true; break; }
            }
            if (rowHas) {
              if (y < top) top = y;
              if (y > bottom) bottom = y;
            }
          }

          if (right > left && bottom > top) {
            const cx = Math.max(0, left - pad);
            const cy = Math.max(0, top - pad);
            const cwidth = Math.min(w - cx, right - left + 1 + pad * 2);
            const cheight = Math.min(h - cy, bottom - top + 1 + pad * 2);
            const tmp = document.createElement('canvas');
            tmp.width = cwidth;
            tmp.height = cheight;
            const tctx = tmp.getContext('2d');
            if (tctx) {
              tctx.fillStyle = '#ffffff';
              tctx.fillRect(0, 0, cwidth, cheight);
              tctx.drawImage(finalCanvas, cx, cy, cwidth, cheight, 0, 0, cwidth, cheight);
              croppedCanvas = tmp;
            }
          }
        }
      } catch (e) {
        logger.warn('Auto-crop failed, using full canvas', e);
      }

      // Create PDF using the cropped canvas with solid background
      const imgData = croppedCanvas.toDataURL('image/png');
      
      // Calculate PDF dimensions
      const imgWidth = croppedCanvas.width;
      const imgHeight = croppedCanvas.height;
      
      // Always use landscape orientation for org charts
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Reserve space for title
      const titleHeight = 20;
      const marginSize = 10;
      const availableWidth = pdfWidth - (marginSize * 2);
      const availableHeight = pdfHeight - titleHeight - (marginSize * 2);
      
      // Add title with generation date
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      pdf.setFontSize(16);
      pdf.setFont(undefined, 'bold');
      const title = companyName ? `${companyName} - Organizational Chart` : 'Organizational Chart';
      const titleWidth = pdf.getTextWidth(title);
      pdf.text(title, (pdfWidth - titleWidth) / 2, marginSize + 8);
      
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'normal');
      const subtitle = `Generated on ${dateStr}`;
      const subtitleWidth = pdf.getTextWidth(subtitle);
      pdf.text(subtitle, (pdfWidth - subtitleWidth) / 2, marginSize + 15);
      
      // Calculate scaling to fit within available space
      const widthRatio = availableWidth / (imgWidth * 0.264583); // Convert px to mm
      const heightRatio = availableHeight / (imgHeight * 0.264583);
      const scale = Math.min(widthRatio, heightRatio, 1);
      
      const finalWidth = (imgWidth * 0.264583) * scale;
      const finalHeight = (imgHeight * 0.264583) * scale;
      
      // Center the image perfectly with equal margins (accounting for title)
      const x = (pdfWidth - finalWidth) / 2;
      const y = titleHeight + marginSize + (availableHeight - finalHeight) / 2;

      pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);

      
      // Generate filename
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${companyName ? `${companyName}-` : ''}org-chart-${timestamp}.pdf`;
      
      pdf.save(filename);

      toast({
        title: "Export Successful",
        description: `Org chart exported as ${filename}`
      });

    } catch (error) {
      logger.error('PDF export failed:', error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export org chart as PDF",
        variant: "destructive"
      });
    }
  }, [toast]);

  const exportToJSON = useCallback(async (roles: any[], companyName?: string) => {
    try {
      // Structure the data for export
      const exportData = {
        exportDate: new Date().toISOString(),
        companyName: companyName || 'Unknown Company',
        totalRoles: roles.length,
        orgChart: {
          roles: roles.map(role => ({
            id: role.id,
            title: role.title,
            responsibilities: role.responsibilities,
            reportsTo: role.reports_to_role_id,
            personalityColor: role.personality_color,
            assignedUser: role.assignments?.[0] ? {
              id: role.assignments[0].user_id,
              name: role.assignments[0].user?.full_name,
              email: role.assignments[0].user?.email
            } : null,
            position: {
              x: role.position_x,
              y: role.position_y
            },
            department: role.department?.name,
            tags: role.tags
          })),
          hierarchy: buildHierarchy(roles)
        }
      };

      // Create and download JSON file
      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${companyName ? `${companyName}-` : ''}org-chart-data-${timestamp}.json`;
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: `Org chart data exported as ${filename}`
      });

    } catch (error) {
      logger.error('JSON export failed:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export org chart data as JSON",
        variant: "destructive"
      });
    }
  }, [toast]);

  const exportToCSV = useCallback(async (roles: any[], companyName?: string) => {
    try {
      // Create CSV headers
      const headers = [
        'Role ID',
        'Title', 
        'Reports To Role ID',
        'Assigned User Name',
        'Assigned User Email',
        'Personality Color',
        'Department',
        'Responsibilities',
        'Tags'
      ];

      // Convert roles to CSV rows
      const csvRows = [
        headers.join(','),
        ...roles.map(role => [
          role.id || '',
          `"${(role.title || '').replace(/"/g, '""')}"`,
          role.reports_to_role_id || '',
          `"${(role.assignments?.[0]?.user?.full_name || '').replace(/"/g, '""')}"`,
          `"${(role.assignments?.[0]?.user?.email || '').replace(/"/g, '""')}"`,
          role.personality_color || '',
          `"${(role.department?.name || '').replace(/"/g, '""')}"`,
          `"${(role.responsibilities || '').replace(/"/g, '""')}"`,
          `"${(role.tags || []).join('; ').replace(/"/g, '""')}"`
        ].join(','))
      ];

      // Create and download CSV file
      const csvString = csvRows.join('\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${companyName ? `${companyName}-` : ''}org-chart-data-${timestamp}.csv`;
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: `Org chart data exported as ${filename}`
      });

    } catch (error) {
      logger.error('CSV export failed:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export org chart data as CSV",
        variant: "destructive"
      });
    }
  }, [toast]);

  return {
    exportToPDF,
    exportToJSON,
    exportToCSV
  };
};

// Helper function to build hierarchy structure
function buildHierarchy(roles: any[]) {
  const roleMap = new Map(roles.map(role => [role.id, { ...role, children: [] }]));
  const rootRoles: any[] = [];

  roles.forEach(role => {
    const roleWithChildren = roleMap.get(role.id);
    if (role.reports_to_role_id) {
      const parent = roleMap.get(role.reports_to_role_id);
      if (parent) {
        parent.children.push(roleWithChildren);
      }
    } else {
      rootRoles.push(roleWithChildren);
    }
  });

  return rootRoles;
}