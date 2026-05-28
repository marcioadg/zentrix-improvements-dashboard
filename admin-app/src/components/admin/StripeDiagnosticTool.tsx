import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DiagnosticResult {
  stripe_mode: string;
  customer_id: string;
  timestamp: string;
  stripe_customer: {
    id: string;
    email: string;
    name: string;
    created: string;
    deleted: boolean;
  } | null;
  all_subscriptions: Array<{
    id: string;
    status: string;
    current_period_start: string;
    current_period_end: string;
    cancel_at_period_end: boolean;
    canceled_at: string | null;
    ended_at: string | null;
    items: Array<{
      price_id: string;
      product_id: string;
      quantity: number;
      unit_amount: number;
    }>;
  }>;
  active_subscriptions_count: number;
  recent_invoices: Array<{
    id: string;
    status: string;
    amount_due: number;
    amount_paid: number;
    created: string;
    paid: boolean;
    subscription: string;
  }>;
  recent_payments: Array<{
    id: string;
    status: string;
    amount: number;
    created: string;
  }>;
  database_record: {
    company_id: string;
    company_name: string;
    subscribed: boolean;
    subscription_tier: string;
    stripe_subscription_id: string;
    stripe_current_period_start: string;
    stripe_current_period_end: string;
    trial_end: string;
    updated_at: string;
  } | null;
  analysis: {
    has_stripe_customer: boolean;
    has_active_subscription: boolean;
    database_says_subscribed: boolean;
    mismatch: boolean;
    recommendation: string | null;
  };
}

export function StripeDiagnosticTool() {
  const [stripeCustomerId, setStripeCustomerId] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runDiagnostic = async () => {
    if (!stripeCustomerId && !companyId) {
      toast.error('Enter a Stripe Customer ID or Company ID');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('stripe-diagnostic', {
        body: {
          stripe_customer_id: stripeCustomerId || undefined,
          company_id: companyId || undefined,
        },
      });

      if (fnError) {
        throw fnError;
      }

      if (data.error) {
        setError(data.error);
        return;
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Failed to run diagnostic');
      toast.error('Diagnostic failed');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Stripe Diagnostic Tool
        </CardTitle>
        <CardDescription>
          Query Stripe directly to diagnose subscription sync issues
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="stripe-customer-id">Stripe Customer ID</Label>
            <Input
              id="stripe-customer-id"
              placeholder="cus_xxxxxxxxxxxxx"
              value={stripeCustomerId}
              onChange={(e) => setStripeCustomerId(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company-id">Or Company ID (UUID)</Label>
            <Input
              id="company-id"
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
            />
          </div>
        </div>

        <Button onClick={runDiagnostic} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running Diagnostic...
            </>
          ) : (
            <>
              <Search className="mr-2 h-4 w-4" />
              Run Diagnostic
            </>
          )}
        </Button>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-destructive font-medium">{error}</p>
          </div>
        )}

        {/* Results Display */}
        {result && (
          <div className="space-y-6">
            {/* Analysis Summary */}
            <div className={`p-4 rounded-lg border ${
              result.analysis.mismatch 
                ? 'bg-warning/10 border-warning/20' 
                : 'bg-success/10 border-success/20'
            }`}>
              <div className="flex items-start gap-3">
                {result.analysis.mismatch ? (
                  <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-success mt-0.5" />
                )}
                <div>
                  <h3 className="font-semibold">
                    {result.analysis.mismatch ? 'Sync Issue Detected' : 'In Sync'}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {result.analysis.recommendation}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Stripe Mode</p>
                <Badge variant={result.stripe_mode === 'live' ? 'default' : 'secondary'}>
                  {result.stripe_mode.toUpperCase()}
                </Badge>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Stripe Customer</p>
                {result.analysis.has_stripe_customer ? (
                  <CheckCircle className="h-5 w-5 text-success" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive" />
                )}
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Active Subscriptions</p>
                <p className="font-semibold">{result.active_subscriptions_count}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">DB: Subscribed</p>
                {result.analysis.database_says_subscribed ? (
                  <Badge variant="default">Yes</Badge>
                ) : (
                  <Badge variant="destructive">No</Badge>
                )}
              </div>
            </div>

            {/* Stripe Customer */}
            {result.stripe_customer && (
              <div>
                <h4 className="font-semibold mb-2">Stripe Customer</h4>
                <div className="bg-muted p-3 rounded-lg text-sm space-y-1">
                  <p><span className="text-muted-foreground">ID:</span> {result.stripe_customer.id}</p>
                  <p><span className="text-muted-foreground">Email:</span> {result.stripe_customer.email}</p>
                  <p><span className="text-muted-foreground">Name:</span> {result.stripe_customer.name}</p>
                  <p><span className="text-muted-foreground">Created:</span> {formatDate(result.stripe_customer.created)}</p>
                </div>
              </div>
            )}

            {/* All Subscriptions */}
            <div>
              <h4 className="font-semibold mb-2">All Subscriptions ({result.all_subscriptions.length})</h4>
              {result.all_subscriptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No subscriptions found</p>
              ) : (
                <div className="space-y-2">
                  {result.all_subscriptions.map((sub) => (
                    <div key={sub.id} className="bg-muted p-3 rounded-lg text-sm">
                      <div className="flex items-center justify-between mb-2">
                        <code className="text-xs">{sub.id}</code>
                        <Badge variant={sub.status === 'active' ? 'default' : 'secondary'}>
                          {sub.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <p><span className="text-muted-foreground">Period Start:</span> {formatDate(sub.current_period_start)}</p>
                        <p><span className="text-muted-foreground">Period End:</span> {formatDate(sub.current_period_end)}</p>
                        <p><span className="text-muted-foreground">Cancel at End:</span> {sub.cancel_at_period_end ? 'Yes' : 'No'}</p>
                        {sub.canceled_at && <p><span className="text-muted-foreground">Canceled:</span> {formatDate(sub.canceled_at)}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Invoices */}
            <div>
              <h4 className="font-semibold mb-2">Recent Invoices</h4>
              {result.recent_invoices.length === 0 ? (
                <p className="text-sm text-muted-foreground">No invoices found</p>
              ) : (
                <div className="space-y-2">
                  {result.recent_invoices.map((inv) => (
                    <div key={inv.id} className="bg-muted p-3 rounded-lg text-sm flex items-center justify-between">
                      <div>
                        <code className="text-xs">{inv.id}</code>
                        <p className="text-xs text-muted-foreground">{formatDate(inv.created)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(inv.amount_paid)}</p>
                        <Badge variant={inv.paid ? 'default' : 'secondary'} className="text-xs">
                          {inv.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Database Record */}
            {result.database_record && (
              <div>
                <h4 className="font-semibold mb-2">Database Record</h4>
                <div className="bg-muted p-3 rounded-lg text-sm space-y-1">
                  <p><span className="text-muted-foreground">Company:</span> {result.database_record.company_name}</p>
                  <p><span className="text-muted-foreground">Tier:</span> {result.database_record.subscription_tier}</p>
                  <p><span className="text-muted-foreground">Subscribed:</span> {result.database_record.subscribed ? 'Yes' : 'No'}</p>
                  <p><span className="text-muted-foreground">Period End:</span> {result.database_record.stripe_current_period_end || 'N/A'}</p>
                  <p><span className="text-muted-foreground">Updated:</span> {formatDate(result.database_record.updated_at)}</p>
                </div>
              </div>
            )}

            {/* Raw JSON */}
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                View Raw JSON
              </summary>
              <pre className="mt-2 p-3 bg-muted rounded-lg overflow-auto text-xs">
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
