
import React, { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useIssues } from "@/hooks/useIssues";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

interface QuarterlyIssuesListProps {
  teamId: string;
  issueFilter: 'all' | 'long_term';
}

const QuarterlyIssuesList: React.FC<QuarterlyIssuesListProps> = ({ teamId, issueFilter }) => {
  // Get issues based on the filter - pass null for all issues, 'long_term' for long-term only
  const { issues, loading, refetch } = useIssues(
    teamId, 
    issueFilter === 'all' ? null : 'long_term'
  );

  // Only show unarchived, open issues
  const filteredIssues = useMemo(
    () => issues.filter((i) => i.status === "open" && !i.archived),
    [issues]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="animate-spin mr-2" /> Loading issues...
      </div>
    );
  }

  if (!teamId) {
    return <div className="p-4 text-muted-foreground">No team selected.</div>;
  }

  if (!filteredIssues.length) {
    return (
      <div className="p-4 text-muted-foreground">
        No {issueFilter === 'all' ? '' : 'long-term '}issues for this team.
        <Button size="sm" className="ml-4" onClick={() => refetch(true)}>Reload</Button>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border rounded-md border bg-card">
      {filteredIssues.map((issue) => (
        <li key={issue.id} className="p-4 hover:bg-muted flex flex-col sm:flex-row sm:items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="font-semibold">{issue.title}</div>
              <span className={`text-xs px-2 py-1 rounded-full ${
                issue.issue_type === 'short_term' 
                  ? 'bg-warning/10 text-orange-700' 
                  : 'bg-primary/10 text-primary'
              }`}>
                {issue.issue_type === 'short_term' ? 'Short-term' : 'Long-term'}
              </span>
            </div>
            {issue.description && (
              <div className="text-sm text-muted-foreground mt-1">{issue.description}</div>
            )}
          </div>
          <span className="text-xs text-muted-foreground mt-2 sm:mt-0">
            Created {new Date(issue.created_at).toLocaleDateString()}
          </span>
        </li>
      ))}
    </ul>
  );
};

export default QuarterlyIssuesList;
