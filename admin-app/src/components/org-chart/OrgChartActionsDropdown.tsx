import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, ListCollapse, ListEnd, FileDown, Trash2 } from 'lucide-react';
import { useOrgChartExport } from '@/hooks/useOrgChartExport';

interface OrgChartActionsDropdownProps {
  handleCollapseAll: () => void;
  handleExpandAll: () => void;
  handleClearAllRoles: () => void;
  allAreCollapsed: boolean;
  allAreExpanded: boolean;
  rolesWithChildrenCount: number;
  currentCompany: any;
  roles: any[];
  disabled?: boolean;
}

export const OrgChartActionsDropdown: React.FC<OrgChartActionsDropdownProps> = ({
  handleCollapseAll,
  handleExpandAll,
  handleClearAllRoles,
  allAreCollapsed,
  allAreExpanded,
  rolesWithChildrenCount,
  currentCompany,
  roles,
  disabled = false,
}) => {
  const { exportToPDF, exportToJSON, exportToCSV } = useOrgChartExport();

  const handleExportPDF = () => {
    exportToPDF(currentCompany?.name);
  };

  const handleExportJSON = () => {
    exportToJSON(roles, currentCompany?.name);
  };

  const handleExportCSV = () => {
    exportToCSV(roles, currentCompany?.name);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          disabled={disabled}
          title="More actions"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-background">
        <DropdownMenuItem
          onClick={handleCollapseAll}
          disabled={rolesWithChildrenCount === 0 || allAreCollapsed}
        >
          <ListCollapse className="h-4 w-4 mr-2" />
          Collapse All
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleExpandAll}
          disabled={rolesWithChildrenCount === 0 || allAreExpanded}
        >
          <ListEnd className="h-4 w-4 mr-2" />
          Expand All
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem
          onClick={handleExportPDF}
          disabled={roles.length === 0}
        >
          <FileDown className="h-4 w-4 mr-2" />
          Export as PDF
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleExportJSON}
          disabled={roles.length === 0}
        >
          <FileDown className="h-4 w-4 mr-2" />
          Export as JSON
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleExportCSV}
          disabled={roles.length === 0}
        >
          <FileDown className="h-4 w-4 mr-2" />
          Export as CSV
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem
          onClick={handleClearAllRoles}
          disabled={roles.length === 0}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Clear All Roles
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
