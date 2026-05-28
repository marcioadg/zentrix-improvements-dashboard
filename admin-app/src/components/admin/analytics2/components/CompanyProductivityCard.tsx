import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CompanyProductivityData } from '@/services/analytics2Service';
import { Building2, Users, ListTodo, Target, AlertCircle, Calendar } from 'lucide-react';

interface CompanyProductivityCardProps {
  company: CompanyProductivityData;
  rank: number;
}

export function CompanyProductivityCard({ company, rank }: CompanyProductivityCardProps) {
  const getScoreBadgeVariant = (score: number) => {
    if (score >= 70) return 'default';
    if (score >= 40) return 'secondary';
    return 'destructive';
  };

  const getEngagementColor = (level: string) => {
    switch (level) {
      case 'high': return '[color:var(--success)]';
      case 'medium': return '[color:var(--warning)]';
      case 'low': return '[color:var(--error)]';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
              #{rank}
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                {company.company_name}
              </CardTitle>
              <p className={`text-sm font-medium capitalize ${getEngagementColor(company.engagement_level)}`}>
                {company.engagement_level} Engagement
              </p>
            </div>
          </div>
          <div className="text-right">
            <Badge variant={getScoreBadgeVariant(company.productivity_score)} className="text-lg px-3 py-1">
              {company.productivity_score}
              {company.productivity_score >= 85 && ' ★'}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">Productivity Score</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>Members</span>
            </div>
            <p className="text-2xl font-bold">{company.member_count}</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ListTodo className="h-4 w-4" />
              <span>Tasks</span>
            </div>
            <p className="text-2xl font-bold">{company.tasks_total}</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Target className="h-4 w-4" />
              <span>Goals</span>
            </div>
            <p className="text-2xl font-bold">{company.goals_total}</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              <span>Issues</span>
            </div>
            <p className="text-2xl font-bold">{company.issues_total}</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Meetings (30d)</span>
            </div>
            <p className="text-2xl font-bold">{company.meetings_count}</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span>Teams</span>
            </div>
            <p className="text-2xl font-bold">{company.team_count}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Task Completion</span>
              <span className="font-medium">{company.task_completion_rate}%</span>
            </div>
            <Progress value={company.task_completion_rate} />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Issue Resolution</span>
              <span className="font-medium">{company.issue_resolution_rate}%</span>
            </div>
            <Progress value={company.issue_resolution_rate} />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Goal Progress</span>
              <span className="font-medium">{company.avg_goal_progress}%</span>
            </div>
            <Progress value={company.avg_goal_progress} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
