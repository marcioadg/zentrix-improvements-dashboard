
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronUp, ChevronDown, AlertTriangle, Clock } from 'lucide-react';
import { UserAvatar } from '@/components/UserAvatar';

interface Issue {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved';
  vote_count: number;
  created_at: string;
  created_by: string;
  user_vote?: number;
}

interface IssueItemProps {
  issue: Issue;
  onVote: (issueId: string, voteType: 'up' | 'down') => void;
  onStatusChange: (issueId: string, status: Issue['status']) => void;
  getProfileName: (userId: string) => string;
  getProfileAvatar?: (userId: string) => string | undefined;
}

const priorityColors = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-warning/10 text-warning dark:text-warning',
  high: 'bg-warning/10 text-warning dark:text-warning',
  critical: 'bg-destructive/10 text-destructive'
};

const statusColors = {
  open: 'bg-destructive/10 text-destructive',
  in_progress: 'bg-warning/10 text-warning dark:text-warning',
  resolved: 'bg-success/10 text-success dark:text-success'
};

export const IssueItem: React.FC<IssueItemProps> = ({
  issue,
  onVote,
  onStatusChange,
  getProfileName,
  getProfileAvatar,
}) => {
  const nextStatus = issue.status === 'open' ? 'in_progress' : 
                    issue.status === 'in_progress' ? 'resolved' : 'open';

  return (
    <Card className="border-b border-border hover:bg-muted/50 transition-colors duration-150">
      <CardContent className="py-2 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {/* Title row with avatar and time inline */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0" />
              <h4 className="text-[13px] font-semibold text-foreground flex-1 min-w-0">{issue.title}</h4>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <UserAvatar
                  userId={issue.created_by}
                  fullName={getProfileName(issue.created_by)}
                  avatarUrl={getProfileAvatar ? getProfileAvatar(issue.created_by) : undefined}
                  size="sm"
                  className="bg-primary/10 text-primary"
                />
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(issue.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
            
            <Badge className={`${priorityColors[issue.priority]} text-[11px] flex-shrink-0`}>
              {issue.priority}
            </Badge>
            
            <Badge className={`${statusColors[issue.status]} text-[11px] flex-shrink-0`}>
              {issue.status.replace('_', ' ')}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onStatusChange(issue.id, nextStatus)}
              className="text-sm h-8"
            >
              {nextStatus.replace('_', ' ')}
            </Button>
            
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onVote(issue.id, 'up')}
                aria-label="Upvote issue"
                className="p-1 h-8 w-8"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[20px] text-center">{issue.vote_count}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onVote(issue.id, 'down')}
                aria-label="Downvote issue"
                className="p-1 h-8 w-8"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {issue.description && (
          <p className="text-[13px] text-muted-foreground mt-1 ml-7">
            {issue.description}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
