import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Eye, EyeOff, Copy, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { STRIPE_CONFIG } from '@/lib/stripe-config';

interface PriceVerification {
  priceId: string;
  environment: 'test' | 'live';
  status: 'checking' | 'valid' | 'invalid' | 'error';
  details?: any;
  error?: string;
}

export const StripeConfigVerification = () => {
  const [verifications, setVerifications] = useState<PriceVerification[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const PRICE_IDS = STRIPE_CONFIG.priceIds;

  const verifyPriceIds = async () => {
    setLoading(true);
    const verificationPromises = Object.entries(PRICE_IDS).map(async ([env, priceId]) => {
      const verification: PriceVerification = {
        priceId,
        environment: env as 'test' | 'live',
        status: 'checking'
      };

      try {
        const { data, error } = await supabase.functions.invoke('verify-stripe-price', {
          body: { 
            priceId, 
            environment: env 
          }
        });

        if (error) {
          verification.status = 'error';
          verification.error = error.message;
        } else if (data?.valid) {
          verification.status = 'valid';
          verification.details = data.price;
        } else {
          verification.status = 'invalid';
          verification.error = data?.error || 'Price ID not found';
        }
      } catch (error) {
        verification.status = 'error';
        verification.error = (error as Error).message;
      }

      return verification;
    });

    const results = await Promise.all(verificationPromises);
    setVerifications(results);
    setLoading(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const getStatusIcon = (status: PriceVerification['status']) => {
    switch (status) {
      case 'valid':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'invalid':
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'checking':
        return <div className="h-4 w-4 animate-spin border-2 border-primary border-t-transparent rounded-full" />;
    }
  };

  const getStatusBadge = (status: PriceVerification['status']) => {
    const variants = {
      valid: 'default',
      invalid: 'destructive',
      error: 'destructive',
      checking: 'secondary'
    } as const;

    return (
      <Badge variant={variants[status]} className="text-xs">
        {status === 'checking' ? 'Verifying...' : status.toUpperCase()}
      </Badge>
    );
  };

  useEffect(() => {
    verifyPriceIds();
  }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Stripe Configuration Verification
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              {showDetails ? 'Hide' : 'Show'} Details
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={verifyPriceIds}
              disabled={loading}
            >
              Re-verify
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This tool verifies that the Stripe price IDs configured in your system actually exist in your Stripe account.
            This ensures your billing system will work correctly.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <div className="text-sm font-medium text-muted-foreground">
            Current Environment: <Badge variant="outline">{STRIPE_CONFIG.environment.toUpperCase()}</Badge>
          </div>

          {verifications.map((verification) => (
            <div key={verification.priceId} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(verification.status)}
                  <div>
                    <div className="font-mono text-sm font-medium">
                      {verification.priceId}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {verification.environment.toUpperCase()} Environment
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(verification.status)}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(verification.priceId)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {verification.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    {verification.error}
                  </AlertDescription>
                </Alert>
              )}

              {showDetails && verification.details && (
                <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">PRICE DETAILS:</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="font-medium">Product:</span> {verification.details.product || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Type:</span> {verification.details.type || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Billing Scheme:</span> {verification.details.billing_scheme || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Currency:</span> {verification.details.currency?.toUpperCase() || 'N/A'}
                    </div>
                    {verification.details.unit_amount && (
                      <div>
                        <span className="font-medium">Unit Amount:</span> ${(verification.details.unit_amount / 100).toFixed(2)}
                      </div>
                    )}
                    <div>
                      <span className="font-medium">Active:</span> {verification.details.active ? '✅' : '❌'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="pt-4 border-t">
          <div className="text-sm text-muted-foreground space-y-2">
            <div className="font-medium">What this verifies:</div>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              <li>Price IDs exist in your Stripe account</li>
              <li>Prices are active and properly configured</li>
              <li>Billing scheme matches expected metered usage setup</li>
              <li>Currency and amounts are correct</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};