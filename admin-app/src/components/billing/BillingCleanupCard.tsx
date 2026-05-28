import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import { useMultiCompany } from "@/contexts/MultiCompanyContext";
import { logger } from '@/utils/logger';

export const BillingCleanupCard = () => {
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<any>(null);
  const { toast } = useToast();
  const { subscription, checkSubscription } = useSubscription();
  const { currentCompany } = useMultiCompany();

  // Only show for usage-based billing (test data)
  if (!subscription || subscription.billing_type !== 'usage_based') {
    return null;
  }

  const handleCleanup = async () => {
    if (!currentCompany?.id) return;

    setIsCleaningUp(true);
    try {
      const { data, error } = await supabase.functions.invoke('cleanup-test-billing', {
        body: {}
      });

      if (error) throw error;

      setCleanupResult(data);
      await checkSubscription();
      
      toast({
        title: "Billing Reset Complete!",
        description: "Test billing data has been cleaned up. All companies now have fresh 14-day trials.",
      });
    } catch (error) {
      logger.error('Cleanup failed:', error);
      toast({
        title: "Cleanup Failed",
        description: error.message || "Failed to cleanup billing data",
        variant: "destructive",
      });
    } finally {
      setIsCleaningUp(false);
    }
  };

  const handlePerSeatCheckout = async () => {
    if (!currentCompany?.id) return;

    try {
      const { data, error } = await supabase.functions.invoke('os-per-seat-checkout', {
        body: { company_id: currentCompany?.id }
      });

      if (error) throw error;

      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      }
    } catch (error) {
      logger.error('Checkout failed:', error);
      toast({
        title: "Checkout Failed",
        description: error.message || "Failed to create checkout session",
        variant: "destructive",
      });
    }
  };

  if (cleanupResult?.success) {
    return (
      <Card className="border-green-200 bg-success/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-success" />
            <CardTitle className="text-green-800">Reset Complete!</CardTitle>
          </div>
          <CardDescription className="text-success">
            Test billing data has been cleaned up successfully.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="bg-white rounded-lg p-3">
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Companies Reset:</span>
                  <span className="font-medium">{cleanupResult.results?.companies_reset_to_trial || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Stripe Subscriptions Canceled:</span>
                  <span className="font-medium">{cleanupResult.results?.stripe_subscriptions_canceled || 0}</span>
                </div>
              </div>
            </div>
            
            <div className="pt-2">
              <p className="text-sm text-success mb-3">
                Ready to try per-seat billing? All companies now have fresh 14-day trials.
              </p>
              <Button 
                onClick={handlePerSeatCheckout}
                className="w-full"
                variant="default"
              >
                Start Per-Seat Subscription
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-warning" />
          <CardTitle className="text-orange-800">Development: Reset Test Billing</CardTitle>
        </div>
        <CardDescription className="text-orange-700">
          Clean up test billing data and reset all companies to fresh trials for development.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Current: Usage-Based (Test)</p>
              <p className="text-xs text-muted-foreground">Complex test data</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="font-medium text-sm">After Reset: Fresh Trials</p>
              <p className="text-xs text-muted-foreground">14-day trials for all</p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-3 space-y-2">
            <h4 className="font-medium text-sm">What this does:</h4>
            <ul className="text-xs space-y-1 text-muted-foreground">
              <li>• Cancels all test Stripe subscriptions</li>
              <li>• Resets companies to 14-day trials</li>
              <li>• Preserves customer IDs for future use</li>
              <li>• No real money affected (test mode only)</li>
            </ul>
          </div>

          <div className="bg-warning/5 border border-yellow-200 rounded-lg p-3">
            <p className="text-xs text-yellow-700">
              <strong>Development Only:</strong> This resets test billing data. 
              All companies will get fresh 14-day trials with full access.
            </p>
          </div>
        </div>

        <Button 
          onClick={handleCleanup} 
          disabled={isCleaningUp}
          className="w-full"
          variant="outline"
        >
          {isCleaningUp ? "Cleaning Up..." : "Reset Test Billing Data"}
        </Button>
      </CardContent>
    </Card>
  );
};