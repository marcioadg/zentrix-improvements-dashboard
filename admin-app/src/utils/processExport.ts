import jsPDF from 'jspdf';
import { BusinessProcess } from '@/hooks/mobile/processes/useBusinessProcesses';
import { format } from 'date-fns';

export const exportSingleProcessToPDF = (process: BusinessProcess) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(process.name, 20, y);
  y += 10;

  // Owner
  if (process.owner) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`Owner: ${process.owner}`, 20, y);
    y += 8;
  }

  // Description
  if (process.description) {
    doc.setFontSize(11);
    doc.setTextColor(80);
    const descLines = doc.splitTextToSize(process.description, pageWidth - 40);
    doc.text(descLines, 20, y);
    y += descLines.length * 6 + 5;
  }

  doc.setTextColor(0);
  y += 5;

  // Major Steps
  const majorSteps = process.major_steps || [];
  majorSteps.forEach((step, stepIndex) => {
    // Check if we need a new page
    if (y > 260) {
      doc.addPage();
      y = 20;
    }

    // Major step header
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`${stepIndex + 1}. ${step.title}`, 20, y);
    y += 8;

    // Minor steps
    const minorSteps = step.minor_steps || [];
    minorSteps.forEach((minorStep, minorIndex) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      
      let stepText = `   ${stepIndex + 1}.${minorIndex + 1}  ${minorStep.title}`;
      if (minorStep.hyperlink) {
        stepText += ` (${minorStep.hyperlink})`;
      }
      
      const lines = doc.splitTextToSize(stepText, pageWidth - 50);
      doc.text(lines, 25, y);
      y += lines.length * 5 + 3;
    });

    y += 5;
  });

  // Footer with date
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text(
      `Generated on ${format(new Date(), 'MMMM d, yyyy')}`,
      20,
      doc.internal.pageSize.getHeight() - 10
    );
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth - 40,
      doc.internal.pageSize.getHeight() - 10
    );
  }

  doc.save(`${process.name.replace(/[^a-z0-9]/gi, '_')}_process.pdf`);
};

export const exportProcessesToPDF = (processes: BusinessProcess[]) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Cover Page
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('Business Processes', pageWidth / 2, 60, { align: 'center' });

  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text('Documentation', pageWidth / 2, 72, { align: 'center' });

  doc.setFontSize(12);
  doc.text(`${processes.length} Documented Processes`, pageWidth / 2, 90, { align: 'center' });
  doc.text(format(new Date(), 'MMMM d, yyyy'), pageWidth / 2, 100, { align: 'center' });

  // Table of Contents
  doc.addPage();
  let y = 30;
  doc.setTextColor(0);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Table of Contents', 20, y);
  y += 15;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  processes.forEach((process, index) => {
    if (y > pageHeight - 30) {
      doc.addPage();
      y = 30;
    }
    doc.text(`${index + 1}. ${process.name}`, 25, y);
    y += 8;
  });

  // Each Process
  processes.forEach((process, processIndex) => {
    doc.addPage();
    y = 25;

    // Process Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text(`${processIndex + 1}. ${process.name}`, 20, y);
    y += 10;

    // Owner
    if (process.owner) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(`Owner: ${process.owner}`, 20, y);
      y += 7;
    }

    // Description
    if (process.description) {
      doc.setFontSize(10);
      doc.setTextColor(80);
      const descLines = doc.splitTextToSize(process.description, pageWidth - 40);
      doc.text(descLines, 20, y);
      y += descLines.length * 5 + 5;
    }

    doc.setTextColor(0);
    y += 5;

    // Major Steps
    const majorSteps = process.major_steps || [];
    majorSteps.forEach((step, stepIndex) => {
      if (y > pageHeight - 40) {
        doc.addPage();
        y = 25;
      }

      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text(`${stepIndex + 1}. ${step.title}`, 20, y);
      y += 8;

      // Minor steps
      const minorSteps = step.minor_steps || [];
      minorSteps.forEach((minorStep, minorIndex) => {
        if (y > pageHeight - 20) {
          doc.addPage();
          y = 25;
        }

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        let stepText = `${stepIndex + 1}.${minorIndex + 1}  ${minorStep.title}`;
        if (minorStep.hyperlink) {
          stepText += ` (${minorStep.hyperlink})`;
        }
        
        const lines = doc.splitTextToSize(stepText, pageWidth - 55);
        doc.text(lines, 30, y);
        y += lines.length * 5 + 2;
      });

      y += 5;
    });
  });

  // Footer on all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text(
      `Generated on ${format(new Date(), 'MMMM d, yyyy')}`,
      20,
      pageHeight - 10
    );
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 40, pageHeight - 10);
  }

  doc.save(`business_processes_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};
