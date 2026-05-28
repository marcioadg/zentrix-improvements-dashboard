// Agent usage overview for super-admins.
//
// Three small panels:
//   1. Per-company rate-limit usage today (X / 100)
//   2. Recent tool calls (last 50) with success rate
//   3. Failed tool calls (last 20) — quick triage view
//
// Read-only. RLS on agent_tool_calls / agent_rate_limits already keeps
// non-members out of company data; super-admins use the service role
// indirectly via the existing AdminPanel guard (super-admin only).

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { logger } from '@/utils/logger';

interface RateLimitRow {
  company_id: string;
  company_name: string | null;
  day: string;
  messages_today: number;
  updated_at: string;
}

interface ToolCallRow {
  id: string;
  company_id: string;
  company_name: string | null;
  tool_name: string;
  ok: boolean;
  error: string | null;
  duration_ms: number | null;
  created_at: string;
}

const DAILY_LIMIT = 100;

export const AgentUsage: React.FC = () => {
  const [rateRows, setRateRows] = useState<RateLimitRow[]>([]);
  const [recentCalls, setRecentCalls] = useState<ToolCallRow[]>([]);
  const [failures, setFailures] = useState<ToolCallRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [rateRes, recentRes, failRes] = await Promise.all([
        supabase
          .from('agent_rate_limits')
          .select('company_id, day, messages_today, updated_at, companies(name)')
          .order('messages_today', { ascending: false })
          .limit(50),
        supabase
          .from('agent_tool_calls')
          .select('id, company_id, tool_name, error, duration_ms, created_at, companies(name)')
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('agent_tool_calls')
          .select('id, company_id, tool_name, error, duration_ms, created_at, companies(name)')
          .not('error', 'is', null)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      // deno-lint-ignore no-explicit-any
      const mapRate = (r: any): RateLimitRow => ({
        company_id: r.company_id,
        company_name: r.companies?.name ?? null,
        day: r.day,
        messages_today: r.messages_today,
        updated_at: r.updated_at,
      });
      // deno-lint-ignore no-explicit-any
      const mapCall = (r: any): ToolCallRow => ({
        id: r.id,
        company_id: r.company_id,
        company_name: r.companies?.name ?? null,
        tool_name: r.tool_name,
        ok: r.error == null,
        error: r.error,
        duration_ms: r.duration_ms,
        created_at: r.created_at,
      });

      setRateRows((rateRes.data ?? []).map(mapRate));
      setRecentCalls((recentRes.data ?? []).map(mapCall));
      setFailures((failRes.data ?? []).map(mapCall));
    } catch (e) {
      logger.error('AgentUsage fetch failed', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const successRate = useMemo(() => {
    if (recentCalls.length === 0) return null;
    const successes = recentCalls.filter((c) => c.ok).length;
    return Math.round((successes / recentCalls.length) * 100);
  }, [recentCalls]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Agent usage</h2>
          <p className="text-sm text-muted-foreground">
            Today's per-company message counter + recent tool-call activity.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Refresh
        </Button>
      </div>

      {/* Today's per-company usage */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Today's per-company usage (limit: {DAILY_LIMIT}/day)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rateRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No agent activity today.</p>
          ) : (
            <div className="space-y-2">
              {rateRows.map((row) => {
                const pct = Math.min(100, Math.round((row.messages_today / DAILY_LIMIT) * 100));
                const isOver = row.messages_today >= DAILY_LIMIT;
                return (
                  <div key={row.company_id} className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">
                          {row.company_name ?? row.company_id.slice(0, 8)}
                        </p>
                        {isOver && (
                          <Badge variant="destructive" className="text-xs">
                            over limit
                          </Badge>
                        )}
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden mt-1">
                        <div
                          className={`h-full ${
                            isOver ? 'bg-destructive' : pct > 75 ? 'bg-amber-500' : 'bg-primary'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap font-mono">
                      {row.messages_today} / {DAILY_LIMIT}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Success rate + recent calls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Recent tool calls (last 50)</span>
            {successRate !== null && (
              <Badge
                variant={successRate === 100 ? 'default' : successRate >= 90 ? 'secondary' : 'destructive'}
                className="text-xs"
              >
                {successRate}% success
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentCalls.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tool calls yet.</p>
          ) : (
            <div className="space-y-1 max-h-80 overflow-auto">
              {recentCalls.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 text-sm py-1.5 border-b last:border-b-0 border-border/40"
                >
                  {c.ok ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />
                  )}
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{c.tool_name}</code>
                  <span className="text-xs text-muted-foreground truncate flex-1">
                    {c.company_name ?? c.company_id.slice(0, 8)}
                  </span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {c.duration_ms}ms
                  </span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Failures triage */}
      {failures.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-destructive" />
              Recent failures
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {failures.map((c) => (
                <div key={c.id} className="text-sm border border-destructive/20 bg-destructive/5 rounded-md p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <code className="text-xs bg-background px-1.5 py-0.5 rounded">{c.tool_name}</code>
                    <span className="text-xs text-muted-foreground">
                      {c.company_name ?? c.company_id.slice(0, 8)}
                    </span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-xs text-destructive break-words">{c.error}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
