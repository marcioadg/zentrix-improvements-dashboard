import { useState } from 'react';
import { jsPDF } from 'jspdf';
import { VTOData } from './VTOBuilderApp';

export const useVTOExport = (
  data: VTOData,
  leadData: { name: string; company: string }
) => {
  const [isBusy, setIsBusy] = useState(false);

  const exportPDF = async () => {
    setIsBusy(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const w = doc.internal.pageSize.getWidth();
      let y = 20;

      const addSection = (title: string, content: () => void) => {
        if (y > 250) { doc.addPage(); y = 20; }
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 100, 100);
        doc.text(title.toUpperCase(), 20, y);
        y += 2;
        doc.setDrawColor(200, 200, 200);
        doc.line(20, y, w - 20, y);
        y += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(30, 30, 30);
        content();
        y += 8;
      };

      const addText = (text: string) => {
        if (!text) return;
        const lines = doc.splitTextToSize(text, w - 40);
        if (y + lines.length * 5 > 280) { doc.addPage(); y = 20; }
        doc.text(lines, 20, y);
        y += lines.length * 5;
      };

      const addBullets = (items: string[]) => {
        items.filter(Boolean).forEach((item, i) => {
          if (y > 275) { doc.addPage(); y = 20; }
          doc.text(`${i + 1}. ${item}`, 24, y);
          y += 5.5;
        });
      };

      // Header
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(10, 10, 10);
      doc.text('Vision/Traction Organizer', 20, y);
      y += 8;
      doc.setFontSize(14);
      doc.setTextColor(100, 100, 100);
      doc.text(leadData.company, 20, y);
      y += 5;
      doc.setFontSize(9);
      doc.text(`Prepared by ${leadData.name} • ${new Date().toLocaleDateString()}`, 20, y);
      y += 12;

      addSection('Core Values', () => addBullets(data.coreValues));
      addSection('Core Focus', () => {
        if (data.purpose) { addText(`Purpose: ${data.purpose}`); }
        if (data.niche) { addText(`Niche: ${data.niche}`); }
      });
      addSection('10-Year Target', () => addText(data.tenYearTarget));
      addSection('Marketing Strategy', () => {
        if (data.marketingStrategy.target) addText(`Target Market: ${data.marketingStrategy.target}`);
        if (data.marketingStrategy.uniques) addText(`3 Uniques: ${data.marketingStrategy.uniques}`);
        if (data.marketingStrategy.process) addText(`Proven Process: ${data.marketingStrategy.process}`);
        if (data.marketingStrategy.guarantee) addText(`Guarantee: ${data.marketingStrategy.guarantee}`);
      });
      addSection('3-Year Picture', () => {
        if (data.threeYearPicture.revenue) addText(`Revenue: ${data.threeYearPicture.revenue}`);
        if (data.threeYearPicture.profit) addText(`Profit: ${data.threeYearPicture.profit}`);
        if (data.threeYearPicture.description) addText(data.threeYearPicture.description);
      });
      addSection('1-Year Plan', () => {
        if (data.oneYearPlan.revenue) addText(`Revenue: ${data.oneYearPlan.revenue}`);
        if (data.oneYearPlan.profit) addText(`Profit: ${data.oneYearPlan.profit}`);
        addBullets(data.oneYearPlan.goals);
      });
      addSection('Quarterly Rocks', () => addBullets(data.quarterlyRocks));
      addSection('Issues List', () => addBullets(data.issuesList));

      // Footer
      if (y > 270) { doc.addPage(); y = 20; }
      y += 10;
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('Generated with Zentrix V/TO Builder — zentrix.app', 20, 285);

      doc.save(`${leadData.company.replace(/\s+/g, '-')}-VTO.pdf`);
    } finally {
      setIsBusy(false);
    }
  };

  return { exportPDF, isBusy };
};
