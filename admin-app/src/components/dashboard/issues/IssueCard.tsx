
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Trash2, CheckCircle2, MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { IssueEditButton } from './IssueEditButton';
import { useAuth } from '@/contexts/AuthContext';
import { useIsTeamAdmin } from '@/hooks/useIsTeamAdmin';

interface IssueCardProps {
  issue: any;
  onDelete: (issueId: string) => void;
  onResolve?: (issueId: string, title?: string, description?: string) => void;
  onIssueUpdated: () => void;
  showOwner?: boolean;
  showTeamName?: boolean;
  getOwnerInitials: (fullName: string) => string;
  getOwnerName: (ownerId: string) => string;
  getOwnerAvatar?: (ownerId: string) => string | undefined;
  isMeetingContext?: boolean;
}

export const IssueCard: React.FC<IssueCardProps> = ({
  issue,
  onDelete,
  onResolve,
  onIssueUpdated,
  showOwner = true,
  showTeamName = false,
  getOwnerInitials,
  getOwnerName,
  getOwnerAvatar,
  isMeetingContext = false,
}) => {
  const { user } = useAuth();
  const { isTeamAdmin } = useIsTeamAdmin(issue.team_id);
  const [isDeleting, setIsDeleting] = useState(false);

  const canEdit = user?.id === issue.created_by || user?.id === issue.owner_id || isTeamAdmin;
  const canDelete = user?.id === issue.created_by || isTeamAdmin;

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await onDelete(issue.id);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleResolve = () => {
    if (onResolve) {
      onResolve(issue.id, issue.title, issue.description);
    }
  };

  return (
    <Card className="bg-card border border-border rounded-[6px] hover:bg-muted/50 transition-colors duration-150">
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-[13px] truncate">
                {issue.title}
              </h3>
              <Badge 
                variant={issue.issue_type === 'short_term' ? 'secondary' : 'outline'}
                className="shrink-0 text-[11px]"
              >
                {issue.issue_type === 'short_term' ? 'Short' : 'Long'}
              </Badge>
            </div>
            
            {issue.description && (
              <p className="text-[11px] text-muted-foreground mb-0.5 line-clamp-2">
                {issue.description}
              </p>
            )}
            
            <div className="flex items-center justify-between">
              {showOwner && (
                <div className="flex items-center gap-1.5">
                  <Avatar className="h-6 w-6 md:h-7 md:w-7">
                    <AvatarImage src={getOwnerAvatar?.(issue.owner_id)} />
                    <AvatarFallback className="text-[10px] md:text-xs">
                      {getOwnerInitials(getOwnerName(issue.owner_id))}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-[11px] text-muted-foreground">
                    {getOwnerName(issue.owner_id)}
                  </span>
                </div>
              )}
              
              {showTeamName && issue.team_name && (
                <Badge variant="outline" className="text-[11px]">
                  {issue.team_name}
                </Badge>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-1 shrink-0">
            {canEdit && (
              <IssueEditButton
                issue={issue}
                onIssueUpdated={onIssueUpdated}
              />
            )}
            
            {isMeetingContext && onResolve && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResolve}
                aria-label="Resolve issue"
                className="h-8 w-8 p-0 text-success hover:text-success/80 hover:bg-success/10"
              >
                <CheckCircle2 className="h-4 w-4" />
              </Button>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="More actions">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canDelete && (
                  <DropdownMenuItem 
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
