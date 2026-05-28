import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ZoomIn, ZoomOut, Search, Plus, FileText, Eye, EyeOff, Network, List } from 'lucide-react';
import { OrgChartActionsDropdown } from './OrgChartActionsDropdown';
import { logger } from '@/utils/logger';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select';

export type OrgChartViewMode = 'chart' | 'list';

interface OrgChartControlsProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  zoom: number;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleCollapseAll: () => void;
  handleExpandAll: () => void;
  handleCreateRole: () => void;
  handleClearAllRoles: () => void;
  allAreCollapsed: boolean;
  allAreExpanded: boolean;
  rolesWithChildrenCount: number;
  currentCompany: any;
  roles: any[];
  templates?: Array<{
    id: string;
    name: string;
    description: string | null;
    is_global: boolean;
  }>;
  onTemplateSelect?: (templateId: string) => void;
  templatesLoading?: boolean;
  showResponsibilities?: boolean;
  onToggleResponsibilities?: () => void;
  viewMode?: OrgChartViewMode;
  onViewModeChange?: (mode: OrgChartViewMode) => void;
}

export const OrgChartControls: React.FC<OrgChartControlsProps> = ({
  searchTerm,
  setSearchTerm,
  zoom,
  handleZoomIn,
  handleZoomOut,
  handleCollapseAll,
  handleExpandAll,
  handleCreateRole,
  handleClearAllRoles,
  allAreCollapsed,
  allAreExpanded,
  rolesWithChildrenCount,
  currentCompany,
  roles,
  templates = [],
  onTemplateSelect,
  templatesLoading = false,
  showResponsibilities = true,
  onToggleResponsibilities,
  viewMode = 'chart',
  onViewModeChange,
}) => {
  const globalTemplates = templates.filter(t => t.is_global);
  const companyTemplates = templates.filter(t => !t.is_global);

  return (
    <div className="p-2 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
        <div className="relative w-full sm:w-auto">
          <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search roles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 w-full sm:w-64"
          />
        </div>
        
        <Select 
          onValueChange={onTemplateSelect}
          disabled={!currentCompany || templatesLoading}
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <FileText className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Templates" />
          </SelectTrigger>
          <SelectContent>
            {globalTemplates.length > 0 && (
              <SelectGroup>
                {globalTemplates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
            {companyTemplates.length > 0 && (
              <SelectGroup>
                <SelectLabel>Company Templates</SelectLabel>
                {companyTemplates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
            {templates.length === 0 && !templatesLoading && (
              <div className="p-2 text-sm text-muted-foreground text-center">
                No templates available
              </div>
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
        {/* View mode toggle */}
        <div className="flex items-center rounded-md border border-border overflow-hidden">
          <Button
            variant={viewMode === 'chart' ? 'default' : 'ghost'}
            size="sm"
            className="rounded-none border-0 h-8 px-2.5"
            onClick={() => onViewModeChange?.('chart')}
            title="Graphic view"
          >
            <Network className="h-4 w-4 sm:mr-1.5" />
            <span className="hidden sm:inline text-xs">Chart</span>
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            className="rounded-none border-0 border-l border-border h-8 px-2.5"
            onClick={() => onViewModeChange?.('list')}
            title="List view"
          >
            <List className="h-4 w-4 sm:mr-1.5" />
            <span className="hidden sm:inline text-xs">List</span>
          </Button>
        </div>

        {viewMode === 'chart' && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground min-w-[60px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button variant="outline" size="sm" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        )}
        {viewMode === 'chart' && (
          <Button
            variant={showResponsibilities ? "outline" : "secondary"}
            size="sm"
            onClick={onToggleResponsibilities}
            title={showResponsibilities ? "Hide responsibilities" : "Show responsibilities"}
          >
            {showResponsibilities ? <Eye className="h-4 w-4 sm:mr-2" /> : <EyeOff className="h-4 w-4 sm:mr-2" />}
            <span className="hidden sm:inline">{showResponsibilities ? "Hide details" : "Show details"}</span>
          </Button>
        )}
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => {
              logger.log('🎯 Add Role button clicked!');
              handleCreateRole();
            }}
            disabled={!currentCompany}
            className="whitespace-nowrap"
          >
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Add Role</span>
          </Button>
          <OrgChartActionsDropdown
            handleCollapseAll={handleCollapseAll}
            handleExpandAll={handleExpandAll}
            handleClearAllRoles={handleClearAllRoles}
            allAreCollapsed={allAreCollapsed}
            allAreExpanded={allAreExpanded}
            rolesWithChildrenCount={rolesWithChildrenCount}
            currentCompany={currentCompany}
            roles={roles}
            disabled={!currentCompany}
          />
        </div>
      </div>
    </div>
  );
};