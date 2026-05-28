import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Shield, AlertTriangle } from 'lucide-react';
import { useStripeMode } from '@/hooks/useStripeMode';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from 'react';

export const StripeModeToggle = () => {
  const { stripeMode, isLoading, setStripeMode, isUpdating } = useStripeMode();
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingMode, setPendingMode] = useState<'test' | 'live' | null>(null);

  const handleToggle = (checked: boolean) => {
    const newMode = checked ? 'live' : 'test';
    setPendingMode(newMode);
    setShowConfirm(true);
  };

  const confirmChange = () => {
    if (pendingMode) {
      setStripeMode(pendingMode);
    }
    setShowConfirm(false);
    setPendingMode(null);
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-muted rounded w-1/4 mb-4"></div>
          <div className="h-10 bg-muted rounded"></div>
        </div>
      </Card>
    );
  }

  const isLiveMode = stripeMode === 'live';

  return (
    <>
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Label htmlFor="stripe-mode" className="text-lg font-semibold">
                  Stripe Mode
                </Label>
                <Badge 
                  variant={isLiveMode ? 'default' : 'secondary'}
                  className={isLiveMode ? 'bg-green-600' : 'bg-yellow-600'}
                >
                  {isLiveMode ? 'LIVE' : 'TEST'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Control which Stripe environment is active for all billing operations
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground">Test</span>
              <Switch
                id="stripe-mode"
                checked={isLiveMode}
                onCheckedChange={handleToggle}
                disabled={isUpdating}
              />
              <span className="text-sm font-medium">Live</span>
            </div>
          </div>

          <div className={`p-4 rounded-lg border ${isLiveMode ? 'bg-success/5 dark:bg-green-950 border-green-200 dark:border-green-800' : 'bg-warning/5 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800'}`}>
            <div className="flex items-start gap-3">
              {isLiveMode ? (
                <Shield className="h-5 w-5 text-success dark:text-green-400 mt-0.5" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-warning dark:text-yellow-400 mt-0.5" />
              )}
              <div className="space-y-2 flex-1">
                <h4 className="font-semibold text-sm">
                  {isLiveMode ? 'Live Mode Active' : 'Test Mode Active'}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {isLiveMode ? (
                    <>
                      Real transactions are being processed. All charges and subscriptions will use your <strong>live Stripe keys</strong> and affect actual customer accounts.
                    </>
                  ) : (
                    <>
                      Test transactions only. All charges and subscriptions will use your <strong>test Stripe keys</strong>. No real money is processed.
                    </>
                  )}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
                  <span>Using Key:</span>
                  <code className="px-2 py-1 bg-muted rounded font-mono">
                    {isLiveMode ? 'STRIPE_SECRET_KEY' : 'STRIPE_SECRET_KEY_TEST'}
                  </code>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Switch to {pendingMode === 'live' ? 'Live' : 'Test'} Mode?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              {pendingMode === 'live' ? (
                <>
                  <p className="font-semibold text-destructive">⚠️ You are about to enable LIVE mode</p>
                  <p>This will:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Process real credit card charges</li>
                    <li>Create actual Stripe customers and subscriptions</li>
                    <li>Affect your production revenue</li>
                  </ul>
                  <p className="pt-2">Make sure your live Stripe webhook is properly configured before proceeding.</p>
                </>
              ) : (
                <>
                  <p>You are switching to TEST mode.</p>
                  <p>This will:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Stop processing real payments</li>
                    <li>Use test Stripe keys for all operations</li>
                    <li>Allow safe testing without affecting production</li>
                  </ul>
                </>
              )}
              <p className="pt-2 text-sm">The page will reload after the change.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmChange}
              className={pendingMode === 'live' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {pendingMode === 'live' ? 'Enable Live Mode' : 'Enable Test Mode'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
