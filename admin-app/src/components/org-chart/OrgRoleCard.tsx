import React from 'react';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { UserAvatar } from '@/components/UserAvatar';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { useSettings } from '@/contexts/SettingsContext';
import { InsightsHoverCard } from './InsightsHoverCard';

interface OrgRoleCardProps {
  role: any;
  level: number;
  hasChildren: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onClick: () => void;
  onAddChild: () => void;
  isOverDropTarget?: boolean;
  isDropDisabled?: boolean;
  showLeftIndicator?: boolean;
  showRightIndicator?: boolean;
  showResponsibilities?: boolean;
}

const getPersonalityStyles = (): Record<string, { bg: string; border: string }> => ({
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
});

export const OrgRoleCard: React.FC<OrgRoleCardProps> = ({
  role,
  level,
  hasChildren,
  isCollapsed,
  onToggleCollapse,
  onClick,
  onAddChild,
  isOverDropTarget,
  isDropDisabled,
  showLeftIndicator,
  showRightIndicator,
  showResponsibilities = true,
}) => {
  const { settings } = useSettings();
  const [showAllMembers, setShowAllMembers] = React.useState(false);
  const {
    attributes,
    listeners,
    setNodeRef: setDragNodeRef,
    transform,
    isDragging,
  } = useDraggable({ 
    id: role.id,
    data: {
      type: 'role',
      role: role
    }
  });

  const { isOver, setNodeRef: setDropNodeRef } = useDroppable({ id: role.id });

  // Compose refs
  const cardRef = (node: HTMLDivElement) => {
    setDragNodeRef(node);
    setDropNodeRef(node);
  };

  // Get assignment data with proper null checking, including image_url from company_member
  const assignedPeople = role.assignments?.map((a: any) => ({
    ...a.profile,
    image_url: a.company_member?.image_url || null
  })).filter(p => p?.id && (p?.full_name || p?.email)) || [];
  const isVacant = assignedPeople.length === 0;

  const responsibilities = role.responsibilities
    ? role.responsibilities
        .split(/[\n\r]+|[.!?]\s+/)
        .map((item: string) => item.trim())
        .filter((item: string) => item.length > 0)
    : [];


  const getHeaderColor = (level: number) => {
    switch (level) {
      case 0: return 'bg-gradient-to-r from-orgChart-blue-start to-orgChart-blue-end text-white'; // Dean level
      case 1: return 'bg-gradient-to-r from-orgChart-yellow-start to-orgChart-yellow-end text-white'; // Department heads
      case 2: return 'bg-gradient-to-r from-orgChart-blue-start to-orgChart-blue-end text-white'; // Middle management
      case 3: return 'bg-gradient-to-r from-orgChart-green-start to-orgChart-green-end text-white'; // Lower management
      default: return 'bg-gradient-to-r from-orgChart-blue-start to-orgChart-blue-end text-white';
    }
  };

  const getPersonalityHeaderColor = (personalityColor: string) => {
    switch (personalityColor) {
      case 'red': return 'bg-gradient-to-r from-orgChart-red-start to-orgChart-red-end text-white shadow-lg';
      case 'yellow': return 'bg-gradient-to-r from-orgChart-yellow-start to-orgChart-yellow-end text-white shadow-lg';
      case 'green': return 'bg-gradient-to-r from-orgChart-green-start to-orgChart-green-end text-white shadow-lg';
      case 'blue': return 'bg-gradient-to-r from-orgChart-blue-start to-orgChart-blue-end text-white shadow-lg';
      default: return 'bg-gradient-to-r from-orgChart-blue-start to-orgChart-blue-end text-white shadow-lg';
    }
  };

  // Get personality color styles
  const personalityStyles = getPersonalityStyles();
  const personalityStyle = role.personality_color ? personalityStyles[role.personality_color] : null;

  const cardContent = (
    <div
      ref={cardRef}
      style={transform ? {
        transform: `translate3d(${Math.max(-300, Math.min(300, transform.x))}px, 0px, 0)`,
      } : undefined}
      className={`group relative transition-all duration-200
        ${isDragging ? 'opacity-75 scale-105 shadow-2xl z-50' : ''}
        ${
          (isOverDropTarget || isOver) && !isDropDisabled
            ? 'ring-2 ring-blue-400 ring-opacity-60 z-20 animate-scale-in'
            : isDropDisabled && isOverDropTarget
            ? 'ring-2 ring-red-400 ring-opacity-60 z-20'
            : ''
        }
      `}
    >
      {/* Visual left indicator for move-to-left */}
      {showLeftIndicator && (
        <div className="absolute left-0 top-0 h-full w-3 bg-gradient-to-r from-blue-400 to-blue-300 rounded-l z-30 pointer-events-none animate-pulse shadow-lg" />
      )}
      {/* Visual right indicator for move-to-right */}
      {showRightIndicator && (
        <div className="absolute right-0 top-0 h-full w-3 bg-gradient-to-l from-blue-400 to-blue-300 rounded-r z-30 pointer-events-none animate-pulse shadow-lg" />
      )}
      <div
        className={`relative w-52 ${showResponsibilities ? 'h-64' : 'h-[120px]'} cursor-move overflow-hidden rounded-lg border shadow-sm flex flex-col
          ${isDragging ? 'bg-white/90 border-blue-300 shadow-xl' : ''}
          hover:shadow-xl hover:-translate-y-1 transition-all duration-200 hover:scale-[1.02] active:scale-95
          ${isVacant 
            ? 'border-muted bg-muted/30 opacity-75' 
            : 'border-border bg-card'
          }
          ${personalityStyle ? `${personalityStyle.bg} ${personalityStyle.border}` : ''}
        `}
        onClick={onClick}
        {...attributes}
        {...listeners}
      >
        {/* Add Child Button - positioned at bottom right aligned with collapse arrow */}
        <div 
          className="absolute bottom-0 right-0 w-16 h-10 z-10 flex items-center justify-center cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onAddChild();
          }}
          title="Add subordinate role"
        >
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 hover:bg-black/10 rounded-full shadow-sm bg-white/80 backdrop-blur-sm pointer-events-none"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        {/* Colored Header - simplified without avatar */}
        <div className={`${role.personality_color ? getPersonalityHeaderColor(role.personality_color) : getHeaderColor(level)} px-3 py-2 flex items-center justify-between relative`}>
          {/* Role Title */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm leading-tight break-words">
              {role.title}
            </h3>
          </div>


        </div>

        {/* Content Area - Fixed height with avatars only */}
        <div className={`px-3 py-2 text-center h-14 flex items-center justify-center gap-1 overflow-hidden
          ${personalityStyle ? 'bg-card/80 backdrop-blur-sm' : 'bg-card'}
        `}>
          {isVacant ? (
            <div className="flex items-center justify-start gap-2 w-full">
              <UserAvatar
                userId={undefined}
                fullName=""
                email=""
                avatarUrl=""
                size="sm"
                isClickable={false}
                aria-label="Position vacant"
              />
              <div className="text-xs text-muted-foreground italic text-left">Position Open</div>
            </div>
          ) : assignedPeople.length === 1 ? (
            // Single person - show avatar and name side by side, aligned left
            <div className="flex items-center justify-start gap-2 w-full">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="cursor-pointer flex-shrink-0">
                      <UserAvatar
                        userId={assignedPeople[0].id}
                        fullName={assignedPeople[0].full_name || ''}
                        email={assignedPeople[0].email || ''}
                        avatarUrl={assignedPeople[0].avatar_url || ''}
                        size="sm"
                        isClickable={false}
                        aria-label={assignedPeople[0].full_name || assignedPeople[0].email}
                        className="border-2 border-border"
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipPrimitive.Portal>
                    <TooltipContent
                      side="right"
                      className="p-3 z-[100] !overflow-visible"
                      style={{ maxWidth: 'none', width: 'auto' }}
                      collisionPadding={{ right: 20, left: 20, top: 20, bottom: 20 }}
                    >
                      <InsightsHoverCard
                        email={assignedPeople[0].email || ''}
                        fullName={assignedPeople[0].full_name || assignedPeople[0].email || ''}
                        imageUrl={role.insights_scores ? null : (assignedPeople[0].image_url || role.image_url)}
                        savedScores={role.insights_scores}
                      />
                    </TooltipContent>
                  </TooltipPrimitive.Portal>
                </Tooltip>
              </TooltipProvider>
              <div className="flex-1 min-w-0 text-left">
                <div className="text-xs text-foreground font-medium leading-tight break-words">
                  {assignedPeople[0].full_name || assignedPeople[0].email}
                </div>
              </div>
            </div>
          ) : (
            // Multiple people - show avatars only with hover details
            <div className="flex items-center justify-start gap-1 flex-wrap w-full">
              {assignedPeople.slice(0, 3).map((person, index) => (
                <TooltipProvider key={person.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="cursor-pointer">
                        <UserAvatar
                          userId={person.id}
                          fullName={person.full_name || ''}
                          email={person.email || ''}
                          avatarUrl={person.avatar_url || ''}
                          size="sm"
                          isClickable={false}
                          aria-label={person.full_name || person.email}
                          className="border-2 border-border"
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipPrimitive.Portal>
                      <TooltipContent
                        side="right"
                        className="p-3 z-[100] !overflow-visible"
                        style={{ maxWidth: 'none', width: 'auto' }}
                        collisionPadding={{ right: 20, left: 20, top: 20, bottom: 20 }}
                      >
                        <InsightsHoverCard
                          email={person.email || ''}
                          fullName={person.full_name || person.email || ''}
                          imageUrl={role.insights_scores ? null : (person.image_url || role.image_url)}
                          savedScores={role.insights_scores}
                        />
                      </TooltipContent>
                    </TooltipPrimitive.Portal>
                  </Tooltip>
                </TooltipProvider>
              ))}
              {assignedPeople.length > 3 && (
                <Popover>
                  <PopoverTrigger asChild>
                    <div 
                      className="h-8 w-8 rounded-full bg-muted flex items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors border-2 border-border"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-xs font-medium text-muted-foreground">
                        +{assignedPeople.length - 3}
                      </span>
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0 z-[99999]" side="bottom" align="start">
                    <div className="p-4">
                      <h4 className="font-semibold text-sm mb-3 text-foreground">
                        {role.title} - All Team Members
                      </h4>
                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {assignedPeople.map((person) => (
                          <div key={person.id} className="flex items-start space-x-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                            <UserAvatar
                              userId={person.id}
                              fullName={person.full_name || ''}
                              email={person.email || ''}
                              avatarUrl={person.avatar_url || ''}
                              size="sm"
                              isClickable={false}
                            />
                            <div className="flex-1 min-w-0">
                              <h5 className="font-medium text-sm text-foreground">
                                {person.full_name || 'No name provided'}
                              </h5>
                              <p className="text-xs text-muted-foreground">
                                {person.email}
                              </p>
                              {person.bio && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {person.bio}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          )}
        </div>

        {/* Responsibilities Section - always reserve space */}
        {showResponsibilities && (
          <div className={`px-3 pb-2 border-t border-border flex-shrink-0 h-32 overflow-y-auto scrollbar-hide
            ${personalityStyle ? 'bg-card/60 backdrop-blur-sm' : 'bg-card'}
          `}>
            {responsibilities.length > 0 ? (
              <ul className="text-xs text-foreground space-y-1 mt-2">
                {responsibilities.map((responsibility: string, index: number) => (
                  <li key={index} className="leading-relaxed">• {responsibility}</li>
                ))}
              </ul>
            ) : (
              <div className="mt-2 text-xs text-muted-foreground italic text-center">No specific responsibilities listed</div>
            )}
          </div>
        )}

        {/* Collapse/Expand children control at bottom */}
        {hasChildren && (
          <div className="border-t border-border flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleCollapse();
              }}
              className="w-full px-3 py-2 flex items-center justify-center text-xs text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              title={isCollapsed ? 'Expand sub-roles' : 'Collapse sub-roles'}
            >
              {isCollapsed ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </button>
          </div>
        )}
      </div>
      
      {/* Disabled overlay if drop is not allowed */}
      {isOverDropTarget && isDropDisabled && (
        <div className="absolute inset-0 bg-destructive/10 z-10 flex items-center justify-center pointer-events-none rounded-lg">
          <span className="text-destructive font-semibold text-xs bg-background px-2 py-1 rounded shadow">
            Invalid: Can't set as direct report
          </span>
        </div>
      )}
    </div>
  );

  return cardContent;
};