import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ThumbsUp, ThumbsDown, WifiOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useIssuesAlerts } from '@/hooks/useIssuesAlerts';
import { formatDistanceToNow } from 'date-fns';

export const IssuesAlertCenter: React.FC = () => {
  const { highPriorityIssues, assignedIssues, loading, error, voteOnIssue } = useIssuesAlerts();

  const getPriorityColor = (priority: string | null | undefined) => {
    if (!priority || priority.trim() === '') return 'outline';
    
    switch (priority.toLowerCase()) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (error) {
    return (
      <Card className="h-[400px]">
        <CardHeader>
          <CardTitle>Issues Alert Center</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-[320px] gap-3 text-center">
          <WifiOff className="h-8 w-8 text-muted-foreground" />
          <p className="text-[14px] font-medium text-foreground">Could not load issues</p>
          <p className="text-[13px] text-muted-foreground">Check your connection and try refreshing</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="h-[400px]">
        <CardHeader>
          <CardTitle>Issues Alert Center</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
                <div className="h-3 bg-muted rounded w-1/4" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const seen = new Set<string>();
  const allIssues = [...highPriorityIssues, ...assignedIssues]
    .filter(issue => {
      if (seen.has(issue.id)) return false;
      seen.add(issue.id);
      return true;
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return (
    <Card className="h-[400px]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>Issues Alert Center</CardTitle>
        <Button variant="outline" size="sm" asChild>
          <Link to="/issues">
            <AlertTriangle className="w-4 h-4 mr-2" />
            View All
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 overflow-y-auto max-h-[320px]">
        {allIssues.map((issue) => (
          <div key={issue.id} className="p-3 bg-muted/50 rounded-lg space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h4 className="text-sm font-medium line-clamp-2 flex-1">
                {issue.title}
              </h4>
              <Badge variant={getPriorityColor(issue.priority)} className="text-xs">
                {issue.priority || 'No Priority'}
              </Badge>
            </div>
            
            {issue.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {issue.description}
              </p>
            )}
            
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(issue.created_at), { addSuffix: true })}
              </span>
              
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded transition-colors duration-150"
                  aria-label="Upvote issue"
                  onClick={() => voteOnIssue(issue.id, 'up')}
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span className="ml-1 text-xs">{issue.upvotes || 0}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded transition-colors duration-150"
                  aria-label="Downvote issue"
                  onClick={() => voteOnIssue(issue.id, 'down')}
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                  <span className="ml-1 text-xs">{issue.downvotes || 0}</span>
                </Button>
              </div>
            </div>
          </div>
        ))}
        
        {allIssues.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
            <AlertTriangle className="h-8 w-8 text-muted-foreground" />
            <p className="text-[14px] font-medium text-foreground">No active issues</p>
            <p className="text-[13px] text-muted-foreground">Issues flagged by your team will appear here</p>
            <Button variant="outline" size="sm" asChild>
              <Link to="/issues">Create Issue</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};