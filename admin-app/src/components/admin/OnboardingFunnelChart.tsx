import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Filter, TrendingDown, AlertCircle, Video, UserPlus, MinusCircle } from 'lucide-react';
import { useOnboardingFunnel } from '@/hooks/useOnboardingFunnel';

const WINDOW_OPTIONS = [
  { days: 7,  label: '7d' },
  { days: 30, label: '30d' },
  { days: 90, label: '90d' },
];

const SOURCE_OPTIONS = ['ad2', 'ad'];

export const OnboardingFunnelChart: React.FC = () => {
  const [source, setSource] = useState('ad2');
  const [windowDays, setWindowDays] = useState(30);
  const { funnel, activation, loading, error } = useOnboardingFunnel({ source, windowDays });

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Onboarding Funnel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
            Loading funnel data…
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Onboarding Funnel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-24 flex items-center justify-center text-destructive text-sm">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  const top = funnel[0]?.count ?? 0;
  const wsStage = funnel.find(s => s.key === 'workspace_created');
  const wsCount = wsStage?.count ?? 0;
  const overallConversion = top > 0 ? (wsCount / top) * 100 : 0;

  // Find the steepest drop to flag the biggest leak
  let steepestDropIdx = -1;
  let steepestDropPct = 0;
  funnel.forEach((stage, i) => {
    if (i === 0) return;
    const drop = 100 - stage.conversionFromPrev;
    if (drop > steepestDropPct) {
      steepestDropPct = drop;
      steepestDropIdx = i;
    }
  });

  const { tourDone, startedMeeting, sentInvitations, noAction } = activation;
  const activationOutcomes = [
    {
      key: 'meeting',
      label: 'Started a meeting',
      count: startedMeeting,
      icon: <Video className="h-3 w-3" />,
      bar: 'bg-blue-500',
      text: 'text-blue-700 dark:text-blue-400',
    },
    {
      key: 'invites',
      label: 'Sent invitations',
      count: sentInvitations,
      icon: <UserPlus className="h-3 w-3" />,
      bar: 'bg-emerald-500',
      text: 'text-emerald-700 dark:text-emerald-400',
    },
    {
      key: 'none',
      label: 'No action',
      count: noAction,
      icon: <MinusCircle className="h-3 w-3" />,
      bar: 'bg-muted-foreground/40',
      text: 'text-muted-foreground',
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-primary" />
              Onboarding Funnel
            </CardTitle>
            <CardDescription>
              Step-by-step drop-off from /{source} page view to activation · last {windowDays} days
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Source filter */}
            <div className="flex items-center gap-1 bg-muted/50 rounded-md p-0.5">
              {SOURCE_OPTIONS.map(s => (
                <Button
                  key={s}
                  variant={s === source ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSource(s)}
                  className="h-7 px-3 text-xs"
                >
                  /{s}
                </Button>
              ))}
            </div>
            {/* Window filter */}
            <div className="flex items-center gap-1 bg-muted/50 rounded-md p-0.5">
              {WINDOW_OPTIONS.map(w => (
                <Button
                  key={w.days}
                  variant={w.days === windowDays ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setWindowDays(w.days)}
                  className="h-7 px-3 text-xs"
                >
                  {w.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Top stat row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Top of funnel</p>
            <p className="text-2xl font-bold">{top}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {funnel[0]?.label || '—'}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Workspaces created</p>
            <p className="text-2xl font-bold">{wsCount}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {overallConversion.toFixed(1)}% overall conversion
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Biggest drop-off
            </p>
            {steepestDropIdx > 0 ? (
              <>
                <p className="text-2xl font-bold text-destructive">
                  -{steepestDropPct.toFixed(1)}%
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                  at {funnel[steepestDropIdx].label}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">No drop-off yet</p>
            )}
          </div>
        </div>

        {/* Funnel bars */}
        <div className="space-y-2">
          {funnel.map((stage, i) => {
            const widthPct = top > 0 ? (stage.count / top) * 100 : 0;
            const dropFromPrev = i === 0 ? 0 : 100 - stage.conversionFromPrev;
            const isSteepest = i === steepestDropIdx;
            return (
              <div key={stage.key} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground truncate pr-2">
                    {i + 1}. {stage.label}
                  </span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-semibold tabular-nums">{stage.count}</span>
                    <span className="text-muted-foreground tabular-nums w-14 text-right">
                      {stage.conversionFromTop.toFixed(1)}%
                    </span>
                    {i > 0 && (
                      <Badge
                        variant={isSteepest ? 'destructive' : 'secondary'}
                        className="text-[10px] px-1.5 py-0 h-4 tabular-nums"
                      >
                        {dropFromPrev > 0 ? <TrendingDown className="h-2.5 w-2.5 mr-0.5" /> : null}
                        {dropFromPrev > 0 ? `-${dropFromPrev.toFixed(1)}%` : '—'}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="h-6 w-full bg-muted/30 rounded-md overflow-hidden">
                  <div
                    className={`h-full rounded-md transition-all ${
                      isSteepest ? 'bg-destructive/70' : 'bg-primary'
                    }`}
                    style={{ width: `${widthPct}%`, minWidth: stage.count > 0 ? 4 : 0 }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Activation outcome split — shown once we have tour data */}
        {tourDone > 0 && (
          <div className="rounded-lg border p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-foreground">Activation after tour</p>
              <p className="text-[11px] text-muted-foreground">{tourDone} completed tour</p>
            </div>
            {activationOutcomes.map(outcome => {
              const pct = tourDone > 0 ? (outcome.count / tourDone) * 100 : 0;
              return (
                <div key={outcome.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className={`flex items-center gap-1.5 font-medium ${outcome.text}`}>
                      {outcome.icon}
                      {outcome.label}
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="font-semibold tabular-nums">{outcome.count}</span>
                      <span className="text-muted-foreground tabular-nums w-10 text-right">
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="h-4 w-full bg-muted/30 rounded-sm overflow-hidden">
                    <div
                      className={`h-full rounded-sm transition-all ${outcome.bar}`}
                      style={{ width: `${pct}%`, minWidth: outcome.count > 0 ? 4 : 0 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {top === 0 && (
          <div className="rounded-md border border-dashed p-4 text-center">
            <p className="text-sm text-muted-foreground">
              No onboarding events recorded for /{source} in the last {windowDays} days yet.
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Once visitors hit the page, the funnel will populate automatically.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OnboardingFunnelChart;
