import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2, Target, Lightbulb, Shield, Users, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentUserPermissionLevel } from '@/hooks/useUserPermissionLevel';

import {
  generateReport,
  getLatestReport,
  type CompanyStateReport as ReportType,
  type ReportData,
} from '@/services/companyStateReportService';

interface CompanyStateReportProps {
  companyId: string;
}

function getWeekRange(): string {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - day + (day === 0 ? -6 : 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(monday)}–${fmt(sunday)}`;
}

const statusColor: Record<string, string> = {
  on_track: 'bg-success/15 text-success',
  at_risk: 'bg-warning/15 text-warning',
  off_track: 'bg-destructive/15 text-destructive',
  healthy: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
  critical: 'bg-destructive/15 text-destructive',
};

const priorityColor: Record<string, string> = {
  high: 'bg-destructive/15 text-destructive',
  medium: 'bg-warning/15 text-warning',
  low: 'bg-info/15 text-info',
};

const severityColor: Record<string, string> = {
  high: 'bg-destructive/15 text-destructive',
  medium: 'bg-warning/15 text-warning',
  low: 'bg-info/15 text-info',
};

const TrendIcon = ({ trend }: { trend: string }) => {
  if (trend === 'up') return <TrendingUp className="h-3.5 w-3.5 text-success" />;
  if (trend === 'down') return <TrendingDown className="h-3.5 w-3.5 text-destructive" />;
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
};

function ReportSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <div className="grid grid-cols-2 gap-3 pt-2">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}

function ReportContent({ data }: { data: ReportData }) {
  return (
    <div className="space-y-5">
      {/* Executive Summary */}
      <div>
        <p className="text-[13px] font-medium text-foreground leading-relaxed">
          {data.executive_summary}
        </p>
      </div>

      {/* Goals Progress */}
      {data.goal_progress?.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5 text-muted-foreground" />
            <h4 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">Goals</h4>
          </div>
          <div className="space-y-2">
            {data.goal_progress.map((goal) => (
              <div key={goal.name} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-foreground font-medium truncate mr-2">{goal.name}</span>
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 ${statusColor[goal.status] || ''}`}>
                    {goal.status.replace('_', ' ')}
                  </Badge>
                </div>
                <Progress value={goal.completion} className="h-1.5" />
                {goal.note && (
                  <p className="text-[11px] text-muted-foreground">{goal.note}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Metrics */}
      {data.metrics_health?.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
            <h4 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">Key Metrics</h4>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {data.metrics_health.map((metric) => (
              <div
                key={metric.name}
                className="rounded-[4px] border border-border p-2.5 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground truncate mr-1">{metric.name}</span>
                  <TrendIcon trend={metric.trend} />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-[14px] font-semibold text-foreground">{metric.value}</span>
                  <span className="text-[10px] text-muted-foreground">/ {metric.target}</span>
                </div>
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 ${statusColor[metric.status] || ''}`}>
                  {metric.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Wins */}
      {data.wins?.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            <h4 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">Wins This Week</h4>
          </div>
          <div className="space-y-1.5">
            {data.wins.map((win) => (
              <div key={win.title} className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-success mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-[12px] font-medium text-foreground">{win.title}</span>
                  {win.description && (
                    <p className="text-[11px] text-muted-foreground">{win.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risks & Blockers */}
      {data.risks?.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-warning" />
            <h4 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">Risks & Blockers</h4>
          </div>
          <div className="space-y-1.5">
            {data.risks.map((risk) => (
              <div key={risk.title} className="flex items-start gap-2">
                <AlertTriangle className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${risk.severity === 'high' ? 'text-destructive' : risk.severity === 'medium' ? 'text-warning' : 'text-info'}`} />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[12px] font-medium text-foreground">{risk.title}</span>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 ${severityColor[risk.severity] || ''}`}>
                      {risk.severity}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{risk.description}</p>
                  {risk.mitigation && (
                    <p className="text-[11px] text-muted-foreground italic">Mitigation: {risk.mitigation}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {data.recommendations?.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Lightbulb className="h-3.5 w-3.5 text-muted-foreground" />
            <h4 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">Recommendations</h4>
          </div>
          <div className="space-y-1.5">
            {data.recommendations.map((rec, i) => (
              <div key={rec.title} className="flex items-start gap-2">
                <span className="text-[11px] font-semibold text-muted-foreground mt-0.5 min-w-[16px]">{i + 1}.</span>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[12px] font-medium text-foreground">{rec.title}</span>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 ${priorityColor[rec.priority] || ''}`}>
                      {rec.priority}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{rec.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team Performance */}
      {data.team_performance?.summary && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <h4 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">Team</h4>
          </div>
          <p className="text-[12px] text-foreground">{data.team_performance.summary}</p>
          {data.team_performance.highlights?.length > 0 && (
            <ul className="space-y-0.5">
              {data.team_performance.highlights.map((h) => (
                <li key={h} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                  <span className="mt-1.5 h-1 w-1 rounded-full bg-muted-foreground flex-shrink-0" />
                  {h}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export function CompanyStateReport({ companyId }: CompanyStateReportProps) {
  const { user } = useAuth();
  const { permissionLevel } = useCurrentUserPermissionLevel();
  const [report, setReport] = useState<ReportType | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Super Admin only for now — must be after all hooks
  const hasAccess = ['super_admin'].includes(permissionLevel || '');

  const fetchLatest = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const latest = await getLatestReport(companyId);
      setReport(latest);
    } catch (err: any) {
      setError(err.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const autoGenerateTriggered = React.useRef(false);

  useEffect(() => {
    fetchLatest();
  }, [fetchLatest]);

  const handleGenerate = useCallback(
    async (forceRefresh = false) => {
      if (!user?.id) return;
      try {
        setGenerating(true);
        setError(null);
        const result = await generateReport(companyId, user.id, forceRefresh);
        setReport(result);
        toast.success('Report generated successfully');
      } catch (err: any) {
        setError(err.message || 'Failed to generate report');
        toast.error('Failed to generate report');
      } finally {
        setGenerating(false);
      }
    },
    [companyId, user?.id]
  );

  // Auto-generate report on first load if none exists
  useEffect(() => {
    if (!loading && !report && !error && !generating && !autoGenerateTriggered.current && user?.id) {
      autoGenerateTriggered.current = true;
      handleGenerate(false);
    }
  }, [loading, report, error, generating, user?.id, handleGenerate]);

  const reportData = report?.report_data as ReportData | undefined;

  if (!hasAccess) return null;

  return (
    <Card className="col-span-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <CardTitle className="text-[15px]">State of the Company</CardTitle>
            <span className="text-[11px] text-muted-foreground">
              Week of {getWeekRange()}
            </span>
          </div>
          {report && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => handleGenerate(true)}
              disabled={generating}
              aria-label="Refresh report"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${generating ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <ReportSkeleton />
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-3">
            <AlertTriangle className="h-6 w-6 text-warning" />
            <p className="text-[12px] text-muted-foreground text-center">{error}</p>
            <Button variant="outline" size="sm" onClick={() => handleGenerate(false)} disabled={generating}>
              {generating ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Generating...
                </>
              ) : (
                'Try Again'
              )}
            </Button>
          </div>
        ) : !report ? (
          <ReportSkeleton />
        ) : reportData ? (
          <ReportContent data={reportData} />
        ) : (
          <p className="text-[12px] text-muted-foreground">Report data is unavailable.</p>
        )}
      </CardContent>
    </Card>
  );
}
