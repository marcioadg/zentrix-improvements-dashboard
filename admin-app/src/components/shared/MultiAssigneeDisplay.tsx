import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus } from 'lucide-react';

interface AssigneeProfile {
  id: string;
  full_name: string;
  avatar_url?: string;
}

interface MultiAssigneeDisplayProps {
  assignees: AssigneeProfile[];
  owner?: AssigneeProfile; // Task owner's profile
  size?: 'sm' | 'md' | 'lg';
  maxVisible?: number;
  showOwnerFirst?: boolean; // Whether to show owner avatar first
}

export const MultiAssigneeDisplay: React.FC<MultiAssigneeDisplayProps> = ({
  assignees,
  owner,
  size = 'md',
  maxVisible = 1,
  showOwnerFirst = true,
}) => {
  // If we have an owner and should show owner first, prioritize the owner
  const displayOwner = owner && showOwnerFirst;
  const totalAssignees = assignees?.length || 0;
  
  if (!displayOwner && (!assignees || assignees.length === 0)) {
    return null;
  }

  const sizeClasses = {
    sm: 'h-6 w-6 text-xs',
    md: 'h-8 w-8 text-sm',
    lg: 'h-10 w-10 text-base',
  };

  // Calculate what to show
  let visibleProfiles: AssigneeProfile[] = [];
  let additionalCount = 0;

  if (displayOwner) {
    // Show owner first
    visibleProfiles = [owner];
    
    // Calculate additional assignees (excluding owner if they're also in assignees)
    const nonOwnerAssignees = assignees?.filter(a => a.id !== owner.id) || [];
    additionalCount = nonOwnerAssignees.length;
  } else {
    // Original behavior: show assignees
    visibleProfiles = assignees?.slice(0, maxVisible) || [];
    additionalCount = Math.max(0, totalAssignees - maxVisible);
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAllAssigneeNames = () => {
    const allNames = [];
    if (displayOwner) {
      allNames.push(`${owner.full_name} (Owner)`);
    }
    if (assignees && assignees.length > 0) {
      const nonOwnerAssignees = displayOwner 
        ? assignees.filter(a => a.id !== owner.id)
        : assignees;
      allNames.push(...nonOwnerAssignees.map(a => a.full_name));
    }
    return allNames.join(', ');
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        {visibleProfiles.map((profile) => (
          <Tooltip key={profile.id}>
            <TooltipTrigger asChild>
              <Avatar className={`${sizeClasses[size]} ${displayOwner && profile.id === owner.id ? 'ring-2 ring-primary/20' : ''}`}>
                <AvatarImage 
                  src={profile.avatar_url} 
                  alt={profile.full_name} 
                />
                <AvatarFallback>
                  {getInitials(profile.full_name)}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {profile.full_name}
                {displayOwner && profile.id === owner.id && ' (Owner)'}
              </p>
            </TooltipContent>
          </Tooltip>
        ))}
        
        {additionalCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={`${sizeClasses[size]} rounded-full bg-muted flex items-center justify-center text-muted-foreground font-medium border-2 border-background`}>
                <Plus className="h-3 w-3" />
                <span className="ml-0.5">{additionalCount}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="max-w-48">
                <p className="font-medium">
                  {displayOwner ? 'Owner & Assignees:' : 'All assignees:'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {getAllAssigneeNames()}
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
};