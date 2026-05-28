import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Building2, ArrowRightLeft } from 'lucide-react';
import { useStripeAccount } from '@/hooks/useStripeAccount';
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

export const StripeAccountToggle = () => {
  const { stripeAccount, isLoading, setStripeAccount, isUpdating } = useStripeAccount();
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingAccount, setPendingAccount] = useState<'old' | 'new' | null>(null);

  const handleToggle = (checked: boolean) => {
    const newAccount = checked ? 'new' : 'old';
    setPendingAccount(newAccount);
    setShowConfirm(true);
  };

  const confirmChange = () => {
    if (pendingAccount) {
      setStripeAccount(pendingAccount);
    }
    setShowConfirm(false);
    setPendingAccount(null);
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

  const isNewAccount = stripeAccount === 'new';

  return (
    <>
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Label htmlFor="stripe-account" className="text-lg font-semibold">
                  Stripe Account
                </Label>
                <Badge
                  variant={isNewAccount ? 'default' : 'secondary'}
                  className={isNewAccount ? 'bg-blue-600' : 'bg-gray-600'}
                >
                  {isNewAccount ? 'NEW' : 'OLD'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Switch between the old and new Stripe accounts for billing operations
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground">Old</span>
              <Switch
                id="stripe-account"
                checked={isNewAccount}
                onCheckedChange={handleToggle}
                disabled={isUpdating}
              />
              <span className="text-sm font-medium">New</span>
            </div>
          </div>

          <div className={`p-4 rounded-lg border ${isNewAccount ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800' : 'bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800'}`}>
            <div className="flex items-start gap-3">
              {isNewAccount ? (
                <ArrowRightLeft className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              ) : (
                <Building2 className="h-5 w-5 text-gray-600 dark:text-gray-400 mt-0.5" />
              )}
              <div className="space-y-2 flex-1">
                <h4 className="font-semibold text-sm">
                  {isNewAccount ? 'New Stripe Account Active' : 'Old Stripe Account Active'}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {isNewAccount ? (
                    <>
                      Using the <strong>new Stripe account</strong> keys. Make sure the new account has the webhook endpoint and products configured before processing real payments.
                    </>
                  ) : (
                    <>
                      Using the <strong>original Stripe account</strong> keys. This is the current production setup.
                    </>
                  )}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
                  <span>Keys:</span>
                  <code className="px-2 py-1 bg-muted rounded font-mono">
                    {isNewAccount ? 'STRIPE_SECRET_KEY[_TEST]_NEW' : 'STRIPE_SECRET_KEY[_TEST]'}
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
              Switch to {pendingAccount === 'new' ? 'New' : 'Old'} Stripe Account?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              {pendingAccount === 'new' ? (
                <>
                  <p>You are switching to the <strong>new Stripe account</strong>.</p>
                  <p>This will:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Use the new Stripe API keys for all billing operations</li>
                    <li>Use the new product/price IDs</li>
                    <li>Route webhooks through the new account's signing secret</li>
                  </ul>
                  <p className="pt-2 font-semibold">Make sure the new Stripe account has been fully configured (webhook endpoint, products, secrets in Supabase).</p>
                </>
              ) : (
                <>
                  <p>You are switching back to the <strong>original Stripe account</strong>.</p>
                  <p>This will:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Restore the original Stripe API keys</li>
                    <li>Use the original product/price IDs</li>
                    <li>Route webhooks through the original signing secret</li>
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
              className={pendingAccount === 'new' ? 'bg-blue-600 hover:bg-blue-700' : ''}
            >
              {pendingAccount === 'new' ? 'Switch to New Account' : 'Switch to Old Account'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
