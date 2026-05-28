import React, { useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, TrendingUp } from 'lucide-react';
import { useDragToScroll } from '@/hooks/useDragToScroll';
import { useOrgChartUtils } from '@/utils/orgChartUtils';
import { OrgChartConnections } from './OrgChartConnections';

interface TemplateRole {
  temp_id: string;
  title: string;
  description?: string;
  responsibilities?: string;
  personality_color?: string;
  department?: string;
  reports_to_temp_id: string | null;
  position_x: number;
}

interface OrgChartTemplate {
  id: string;
  name: string;
  description: string | null;
  icon?: string;
  category?: string;
  use_count?: number;
  is_global: boolean;
  company_id: string | null;
  template_data: {
    roles: TemplateRole[];
  };
}

interface TemplatePreviewProps {
  template: OrgChartTemplate | undefined;
  onUseTemplate: () => void;
  onBack: () => void;
  zoom: number;
}

const getPersonalityStyles = (color?: string): { bg: string; border: string } => {
  const styles: Record<string, { bg: string; border: string }> = {
    red: {
      bg: "bg-gradient-to-br from-orgChart-red-light to-white/50",
      border: "border-orgChart-red-border",
    },
    yellow: {
      bg: "bg-gradient-to-br from-orgChart-yellow-light to-white/50",
      border: "border-orgChart-yellow-border",
    },
    green: {
      bg: "bg-gradient-to-br from-orgChart-green-light to-white/50",
      border: "border-orgChart-green-border",
    },
    blue: {
      bg: "bg-gradient-to-br from-orgChart-blue-light to-white/50",
      border: "border-orgChart-blue-border",
    },
  };
  return styles[color || 'blue'] || styles.blue;
};

const getPersonalityHeaderColor = (color?: string): string => {
  const colors: Record<string, string> = {
    red: 'bg-gradient-to-r from-orgChart-red-start to-orgChart-red-end',
    yellow: 'bg-gradient-to-r from-orgChart-yellow-start to-orgChart-yellow-end',
    green: 'bg-gradient-to-r from-orgChart-green-start to-orgChart-green-end',
    blue: 'bg-gradient-to-r from-orgChart-blue-start to-orgChart-blue-end',
  };
  return colors[color || 'blue'] || colors.blue;
};

export const TemplatePreview: React.FC<TemplatePreviewProps> = ({
  template,
  onUseTemplate,
  onBack,
  zoom,
}) => {
  const dragScrollRef = useDragToScroll({ 
    enabled: true,
    cursor: 'grab',
    activeCursor: 'grabbing'
  });

  const contentRef = useRef<HTMLDivElement>(null);

  // Parse template roles from template_data
  const templateRoles = useMemo(() => {
    if (!template?.template_data?.roles) return [];
    return template.template_data.roles;
  }, [template]);

  // Transform template roles to match the format expected by useOrgChartUtils
  const transformedRoles = useMemo(() => {
    return templateRoles.map(role => ({
      ...role,
      id: role.temp_id, // Map temp_id to id
      reports_to_role_id: role.reports_to_temp_id // Map reports_to_temp_id to reports_to_role_id
    }));
  }, [templateRoles]);

  const { rootRoles, getSortedSiblings } = useOrgChartUtils(transformedRoles, '');

  // Build hierarchy for preview - non-interactive
  const renderRoleHierarchy = (role: any): React.ReactNode => {
    const children = transformedRoles.filter((r: any) => r.reports_to_role_id === role.id);
    const sortedChildren = getSortedSiblings(children);
    const hasChildren = children.length > 0;

    const styles = getPersonalityStyles(role.personality_color);
    const headerColor = getPersonalityHeaderColor(role.personality_color);

    const responsibilities = role.responsibilities
      ? role.responsibilities
          .split(/[\n\r]+|[.!?]\s+/)
          .map((item: string) => item.trim())
          .filter((item: string) => item.length > 0)
          .slice(0, 3) // Show max 3 responsibilities in preview
      : [];

    return (
      <div key={role.temp_id} className="flex flex-col items-center gap-2 sm:gap-4">
        {/* Role Card - Non-clickable preview */}
        <div className="relative opacity-90 pointer-events-none">
          <div
            className={`relative w-64 rounded-lg border-2 ${styles.border} ${styles.bg} shadow-md transition-all`}
          >
            {/* Header */}
            <div className={`${headerColor} text-white shadow-lg rounded-t-md px-4 py-3`}>
              <h3 className="font-bold text-base leading-tight">{role.title}</h3>
            </div>

            {/* Body */}
            <div className="p-3 space-y-2">
              {/* Vacant Badge */}
              <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-border/50">
                Vacant
              </Badge>

              {/* Responsibilities Preview */}
              {responsibilities.length > 0 && (
                <div className="text-xs text-muted-foreground space-y-1">
                  {responsibilities.map((resp, idx) => (
                    <div key={idx} className="flex items-start gap-1">
                      <span className="text-primary mt-0.5">•</span>
                      <span className="line-clamp-1">{resp}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Preview indicator */}
            <div className="absolute top-2 right-2 bg-muted/80 text-muted-foreground text-[10px] px-2 py-0.5 rounded">
              Preview
            </div>
          </div>
        </div>

        {/* Children */}
        {hasChildren && (
          <div className="relative">
            {/* Connector line */}
            <div className="absolute left-1/2 top-0 w-0.5 h-4 bg-border -translate-x-1/2" />
            
            {/* Children container */}
            <div className="flex justify-center items-start gap-2 sm:gap-6 flex-wrap pt-4">
              {sortedChildren.map((childRole: TemplateRole) => (
                <div key={childRole.temp_id} className="relative">
                  {/* Connector to parent */}
                  <div className="absolute left-1/2 -top-4 w-0.5 h-4 bg-border -translate-x-1/2" />
                  {renderRoleHierarchy(childRole)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!template) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">No template selected</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Action Banner */}
      <div className="p-3 sm:p-4 border-b bg-muted/30 shrink-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {template.icon && <span className="text-2xl">{template.icon}</span>}
              <h2 className="text-lg sm:text-xl font-bold text-foreground">
                Template Preview: {template.name}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Review the structure before applying • Drag to explore
            </p>
            
            {/* Metadata */}
            <div className="flex items-center gap-2 mt-2">
              {template.category && (
                <Badge variant="secondary" className="text-xs">
                  {template.category}
                </Badge>
              )}
              {(template.use_count ?? 0) > 0 && (
                <Badge variant="outline" className="gap-1 text-xs">
                  <TrendingUp className="h-3 w-3" />
                  Used {template.use_count} times
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                {templateRoles.length} {templateRoles.length === 1 ? 'role' : 'roles'}
              </Badge>
            </div>
          </div>
          
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" onClick={onBack} size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button onClick={onUseTemplate} size="sm">
              Use '{template.name}' Template
            </Button>
          </div>
        </div>
      </div>

      {/* Scrollable Preview Area */}
      <div 
        ref={dragScrollRef}
        className="w-full flex-1 overflow-auto p-2 sm:p-4 relative org-chart-background"
      >
        <div className="relative min-w-[1600px] min-h-0">
          <div
            ref={contentRef}
            className="min-w-fit min-h-fit w-full flex justify-center relative"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top center',
              transition: 'transform 0.20s cubic-bezier(0.42,0,0.58,1)',
              padding: `${(1 - zoom) * 50}% 0`
            }}
          >
            {/* Connection Lines */}
            <OrgChartConnections 
              roles={transformedRoles}
              containerRef={contentRef}
              collapsedRoles={new Set()} // Empty set - nothing collapsed in preview
              zoom={zoom}
            />

            {templateRoles.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                This template is empty
              </div>
            ) : (
              <div className="inline-flex justify-center items-start gap-2 sm:gap-6 flex-wrap min-w-fit">
                {rootRoles.map(role => renderRoleHierarchy(role))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
