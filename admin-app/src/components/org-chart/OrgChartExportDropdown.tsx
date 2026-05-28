import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileImage, FileText, FileSpreadsheet, ChevronDown } from 'lucide-react';
import { useOrgChartExport } from '@/hooks/useOrgChartExport';

interface OrgChartExportDropdownProps {
  roles: any[];
  companyName?: string;
  disabled?: boolean;
}

export const OrgChartExportDropdown: React.FC<OrgChartExportDropdownProps> = ({
  roles,
  companyName,
  disabled = false
}) => {
  const { exportToPDF, exportToJSON, exportToCSV } = useOrgChartExport();

  const handleExportPDF = () => {
    exportToPDF(companyName);
  };

  const handleExportJSON = () => {
    exportToJSON(roles, companyName);
  };

  const handleExportCSV = () => {
    exportToCSV(roles, companyName);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          disabled={disabled}
          className="hidden sm:flex"
        >
          <Download className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Export</span>
          <ChevronDown className="h-3 w-3 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleExportPDF} className="cursor-pointer">
          <FileImage className="h-4 w-4 mr-2" />
          <div className="flex flex-col">
            <span>Export as PDF</span>
            <span className="text-xs text-muted-foreground">Visual chart</span>
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleExportJSON} className="cursor-pointer">
          <FileText className="h-4 w-4 mr-2" />
          <div className="flex flex-col">
            <span>Export as JSON</span>
            <span className="text-xs text-muted-foreground">Raw data</span>
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleExportCSV} className="cursor-pointer">
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          <div className="flex flex-col">
            <span>Export as CSV</span>
            <span className="text-xs text-muted-foreground">Spreadsheet data</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};